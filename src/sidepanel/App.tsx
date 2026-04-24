import { useEffect, useRef } from 'react';
import { useApp } from './context/AppContext';
import { syncAccentFromActiveTab } from './theme';
import { config } from '../config';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { Spinner } from './components/Spinner';
import { ApprovalCard } from './components/ApprovalCard';
import { InputArea } from './components/InputArea';
import { RecordingBar } from './components/RecordingBar';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { KBPanel } from './components/panels/KBPanel';
import { AgentsPanel } from './components/panels/AgentsPanel';
import { WorkflowsPanel } from './components/panels/WorkflowsPanel';
import { DataSourcePanel } from './components/panels/DataSourcePanel';
import { MCPStorePanel } from './components/panels/MCPStorePanel';
import { PerformancePanel } from './components/panels/PerformancePanel';
import { QuickActionsBar } from './components/QuickActionsBar';

const DEFAULT_AGENTS = [
  { id: 1, name: 'Orchestrator', role: 'orchestrator', systemPrompt: 'You are a Workflow Orchestrator. Examine the scenario and the available agents, then decide which agents are required and in what execution order.\nBuilt-in pipeline roles: "site_selector", "dom_reader", "plan_generator".\nCustom agents can be inserted between dom_reader and plan_generator.\nAlways include site_selector if systems need to be identified from KB. Include dom_reader when live page structure is needed. Always end with plan_generator when an executable plan is the goal.\nReturn ONLY JSON: {"pipeline":["role1","role2"],"reasoning":"one sentence"}', maxTokens: 800 },
  { id: 2, name: 'Site Selector', role: 'site_selector', systemPrompt: 'You are a Site Selector Agent. Given a scenario and a knowledge base of systems, identify the minimum set needed. Extract the URL directly from the KB text — do not invent URLs. Return only valid JSON: {"sites":[{"url":"...","name":"...","purpose":"..."}]}', maxTokens: 1000 },
  { id: 3, name: 'DOM Reader', role: 'dom_reader', systemPrompt: 'You are a DOM Reader Agent. Open each identified system tab and extract its live page structure — form inputs with selectors, clickable buttons, headings, and any structured data-waypoint-field values. This data feeds the Plan Generator so it can build a real, executable action plan using actual selectors from the live page.', maxTokens: 800 },
  { id: 4, name: 'DOM Interpreter', role: 'dom_interpreter', systemPrompt: 'You are a DOM Interpreter Agent. Given raw DOM elements from a live page and a scenario description, summarise what the page does and identify the exact CSS selectors for the form inputs and buttons most relevant to completing the scenario. Return only JSON: {"summary":"...","relevantInputs":["#sel"],"relevantButtons":["#btn"]}', maxTokens: 1200 },
  { id: 5, name: 'Plan Generator', role: 'plan_generator', systemPrompt: 'You are a Plan Generator Agent. Output ONLY a single JSON object — no markdown, no explanation, no code fences.\n\nRequired schema:\n{"type":"action_plan","summary":"one sentence summary","steps":[{"action":"...","description":"..."}]}\n\nValid action values: navigate, click, fill, switch_tab, open_tab, read_tab, ask_user, confirm, wait.\nField rules:\n- navigate/open_tab: include "url"\n- switch_tab/read_tab: include "url_pattern" (partial URL match)\n- click/fill: include "selector" (exact CSS selector from page data)\n- fill: include "value" (literal text OR {{variableName}})\n- ask_user: include "question" (one specific question) and "value" (variable name to store answer). ONE ask_user per field — never bundle multiple fields in one question.\n- confirm: include "description" of what will be submitted\n- wait: include "ms" (milliseconds)\n\nRules: Use switch_tab before any fill/click. Never invent selectors. Use ONLY selectors from the provided page data. End with a confirm step before any form submission.\n\nFor ask_user + fill pairs, the fill "value" must use {{exactSameVariableName}} as the ask_user "value" field.', maxTokens: 4096 },
];

export default function App() {
  const { state, dispatch } = useApp();

  // Dynamic accent colour — sync from active tab on mount and on every tab switch
  useEffect(() => {
    syncAccentFromActiveTab();

    const onActivated = () => syncAccentFromActiveTab();
    const onUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab,
    ) => {
      if (changeInfo.status === 'complete' && tab.active) syncAccentFromActiveTab();
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  // Reactively rebuild mcpTools from mcpConnections so that chat-handler always
  // gets the up-to-date tool list. This avoids the stale-closure problem in
  // MCPStorePanel where rebuildMcpTools() read pre-dispatch state.
  const prevConnections = useRef(state.mcpConnections);
  useEffect(() => {
    if (prevConnections.current === state.mcpConnections) return;
    prevConnections.current = state.mcpConnections;
    const allTools = state.mcpConnections
      .filter(c => c.status === 'connected')
      .flatMap(c => c.tools);
    dispatch({ type: 'SET_MCP_TOOLS', tools: allTools });
  }, [state.mcpConnections, dispatch]);

  useEffect(() => {
    async function init() {
      // Load settings
      const { wp_settings } = await chrome.storage.local.get('wp_settings');
      if (wp_settings) {
        if (wp_settings.claudeKey) config.CLAUDE_API_KEY = wp_settings.claudeKey;
        if (wp_settings.claudeModel) config.CLAUDE_MODEL = wp_settings.claudeModel;
        if (typeof wp_settings.piiMask === 'boolean') {
          dispatch({ type: 'SET_SETTINGS', piiMaskEnabled: wp_settings.piiMask });
        }
      }

      // Load KB
      const { wp_kb } = await chrome.storage.local.get('wp_kb');
      if (wp_kb && Array.isArray(wp_kb)) {
        dispatch({ type: 'SET_KB_DOCUMENTS', docs: wp_kb });
      }

      // Load agents — merge stored with defaults, always upgrade built-in token limits
      const { wp_agents } = await chrome.storage.local.get('wp_agents');
      let agents: typeof DEFAULT_AGENTS;
      if (wp_agents && Array.isArray(wp_agents) && wp_agents.length > 0) {
        agents = wp_agents.map((a: typeof DEFAULT_AGENTS[0]) => {
          const def = DEFAULT_AGENTS.find(d => d.role === a.role);
          // For built-in roles, always apply the latest system prompt and bump maxTokens
          // to at least the new default (preserves manual increases)
          if (def) return { ...a, systemPrompt: def.systemPrompt, maxTokens: Math.max(a.maxTokens, def.maxTokens) };
          return a;
        });
        // Add any missing default agents
        for (const def of DEFAULT_AGENTS) {
          if (!agents.find(a => a.role === def.role)) agents.push(def);
        }
      } else {
        agents = [...DEFAULT_AGENTS];
      }
      dispatch({ type: 'SET_AGENT_DEFS', agents });
      await chrome.storage.local.set({ wp_agents: agents });

      // Load workflows
      const { wp_workflows } = await chrome.storage.local.get('wp_workflows');
      if (wp_workflows && Array.isArray(wp_workflows)) {
        dispatch({ type: 'SET_WORKFLOWS', workflows: wp_workflows });
      }
    }
    init();
  }, [dispatch]);

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      <Header />
      <RecordingBar />
      <ChatArea />
      <Spinner />
      <ApprovalCard />
      <QuickActionsBar />
      <InputArea />
      <SettingsPanel />
      <KBPanel />
      <AgentsPanel />
      <WorkflowsPanel />
      <DataSourcePanel />
      <MCPStorePanel />
      <PerformancePanel />
    </div>
  );
}
