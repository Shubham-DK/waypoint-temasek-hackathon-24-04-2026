import type { Dispatch } from 'react';
import type { KBDocument, TabContext, IdentifiedSite } from '../types/actions';
import type { AppState, AppAction } from './context/AppContext';
import { msgId } from './context/AppContext';
import { claudeCall } from './claude';
import { tryParseActionPlan } from './plan-parser';
import { getOpenTabs } from './cross-tab';

export const DEFAULT_SCENARIO = `Flight SQ321 (SIN→LHR) is delayed by 5 hours due to an aircraft-on-ground (AOG) situation. Passenger James Lim Wei Ming (Business Class, Seat 1A) has a missed connection to Seoul (SQ637, departing 17:30). As the service recovery agent, you need to:
1. Check the passenger manifest for James Lim's details
2. Book a complimentary hotel room at the nearest available hotel
3. Send an apology email to the passenger with booking confirmation details`;

const DEMO_KB_SYSTEMS: KBDocument[] = [
  { id: 1, name: 'SilverOS — Flight Schedule', content: 'URL: http://localhost:3001/flight-schedule.html\nPurpose: Real-time flight operations board.' },
  { id: 2, name: 'SilverOS — Passenger Manifest', content: 'URL: http://localhost:3001/passenger-manifest.html\nPurpose: Passenger list with data-waypoint-field attributes.' },
  { id: 3, name: 'StaySG Hotels Portal', content: 'URL: http://localhost:3000/hotel-portal.html\nPurpose: External hotel booking portal.' },
  { id: 4, name: 'SilverOS CRM — Passenger Email', content: 'URL: http://localhost:3001/crm-email.html\nPurpose: Internal passenger communications tool.' },
];

function getAgentDef(role: string, agentDefs: { role: string; systemPrompt: string; maxTokens: number; model?: string }[]) {
  return agentDefs.find(a => a.role === role);
}

export async function buildScenarioPlan(
  scenarioText: string,
  state: AppState,
  dispatch: Dispatch<AppAction>
): Promise<void> {
  dispatch({ type: 'SET_STATUS', status: 'busy' });
  dispatch({ type: 'SHOW_SPINNER', label: 'Running scenario planner...' });

  try {
    // Seed KB if empty
    let kbDocs = state.kbDocuments;
    if (!kbDocs.length) {
      kbDocs = [...DEMO_KB_SYSTEMS];
      dispatch({ type: 'SET_KB_DOCUMENTS', docs: kbDocs });
      await chrome.storage.local.set({ wp_kb: kbDocs });
      dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: 'KB seeded with 4 demo systems.' } });
    }

    // Orchestrator
    dispatch({ type: 'SHOW_SPINNER', label: 'Orchestrator deciding pipeline...' });
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: 'Stage 1: Orchestrator' } });
    const orchDef = getAgentDef('orchestrator', state.agentDefs);
    const orchResult = await claudeCall({
      messages: [{ role: 'user', content: `Scenario: ${scenarioText}\n\nAgents: ${state.agentDefs.map(a => `- ${a.role}: ${a.name}`).join('\n')}` }],
      system: orchDef?.systemPrompt || '',
      maxTokens: orchDef?.maxTokens || 400,
      model: orchDef?.model,
    });
    let pipeline: string[];
    try {
      const parsed = JSON.parse(orchResult.match(/\{[\s\S]*\}/)?.[0] || '{}');
      pipeline = parsed.pipeline || ['site_selector', 'dom_reader', 'plan_generator'];
      dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: `Pipeline: ${pipeline.join(' → ')}\n${parsed.reasoning || ''}` } });
    } catch {
      pipeline = ['site_selector', 'dom_reader', 'plan_generator'];
    }

    let sites: IdentifiedSite[] = [];
    let tabContexts: TabContext[] = [];

    for (const role of pipeline) {
      dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: `Stage: ${role}` } });

      if (role === 'site_selector') {
        dispatch({ type: 'SHOW_SPINNER', label: 'Site Selector identifying systems...' });
        const def = getAgentDef('site_selector', state.agentDefs);
        const result = await claudeCall({
          messages: [{ role: 'user', content: `Scenario: ${scenarioText}\n\nKB:\n${kbDocs.map(d => `--- ${d.name} ---\n${d.content}`).join('\n\n')}` }],
          system: def?.systemPrompt || '', maxTokens: def?.maxTokens || 600, model: def?.model,
        });
        try { sites = JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || '{}').sites || []; } catch { sites = []; }
        dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: `Sites: ${sites.map(s => s.name).join(', ')}` } });

      } else if (role === 'dom_reader') {
        dispatch({ type: 'SHOW_SPINNER', label: 'DOM Reader extracting pages...' });
        for (const site of sites) {
          await new Promise<void>(resolve => {
            chrome.runtime.sendMessage({ type: 'OPEN_OR_SWITCH_TAB', url: site.url, urlPattern: site.url.split('/').pop() || '' }, () => resolve());
          });
          await new Promise(r => setTimeout(r, 1500));
          const fields = await new Promise<{ fields?: Record<string, string> }>(resolve => {
            chrome.runtime.sendMessage({ type: 'READ_TAB_FIELDS', urlPattern: site.url.split('/').pop() || '' }, (r) => resolve(r as { fields?: Record<string, string> }));
          });
          const content = await new Promise<unknown>(resolve => {
            chrome.runtime.sendMessage({ type: 'READ_TAB_CONTENT', urlPattern: site.url.split('/').pop() || '' }, (r) => resolve(r));
          });

          tabContexts.push({ url: site.url, pageContent: (content as TabContext['pageContent']) || null, dataFields: fields?.fields || {}, pageInsight: '' });
        }

        // DOM Interpreter per tab
        const interpDef = getAgentDef('dom_interpreter', state.agentDefs);
        for (const ctx of tabContexts) {
          try {
            ctx.pageInsight = await claudeCall({
              messages: [{ role: 'user', content: `Page: ${ctx.url}\nScenario: ${scenarioText}\nDOM: ${JSON.stringify(ctx.pageContent)}\nFields: ${JSON.stringify(ctx.dataFields)}` }],
              system: interpDef?.systemPrompt || '', maxTokens: interpDef?.maxTokens || 350, model: interpDef?.model,
            });
          } catch { ctx.pageInsight = 'DOM interpretation failed'; }
        }
        dispatch({ type: 'MERGE_VARIABLES', variables: Object.assign({}, ...tabContexts.map(t => t.dataFields)) });

      } else if (role === 'plan_generator') {
        dispatch({ type: 'SHOW_SPINNER', label: 'Plan Generator building plan...' });
        const def = getAgentDef('plan_generator', state.agentDefs);
        const openTabs = await getOpenTabs();
        const contextStr = tabContexts.map(ctx => `--- ${ctx.url} ---\n${ctx.pageInsight}\n${Object.keys(ctx.dataFields).length ? `Fields: ${JSON.stringify(ctx.dataFields)}` : ''}`).join('\n\n');
        const result = await claudeCall({
          messages: [{ role: 'user', content: `Scenario: ${scenarioText}\n\nPages:\n${contextStr}\n\nTabs:\n${openTabs.map(t => `- ${t.title} — ${t.url}`).join('\n')}` }],
          system: def?.systemPrompt || '', maxTokens: def?.maxTokens || 2048, model: def?.model,
        });
        const plan = tryParseActionPlan(result);
        if (plan) {
          dispatch({ type: 'HIDE_SPINNER' });
          dispatch({ type: 'SET_STATUS', status: 'idle' });
          dispatch({ type: 'SET_PENDING_PLAN', plan });
          return;
        }
        dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: result } });

      } else {
        // Generic agent
        const def = getAgentDef(role, state.agentDefs);
        if (def) {
          dispatch({ type: 'SHOW_SPINNER', label: `Running ${role}...` });
          await claudeCall({
            messages: [{ role: 'user', content: `Scenario: ${scenarioText}\nSites: ${JSON.stringify(sites)}` }],
            system: def.systemPrompt, maxTokens: def.maxTokens, model: def.model,
          });
          dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: `${role} completed.` } });
        }
      }
    }
  } catch (err) {
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: `Scenario planner error: ${err}` } });
  } finally {
    dispatch({ type: 'HIDE_SPINNER' });
    dispatch({ type: 'SET_STATUS', status: 'idle' });
  }
}
