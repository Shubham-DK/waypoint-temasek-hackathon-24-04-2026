import type { Dispatch } from 'react';
import type { ActionPlan } from '../types/actions';
import type { AppAction } from './context/AppContext';
import { msgId } from './context/AppContext';
import { claudeCall } from './claude';
import { tryParseActionPlan } from './plan-parser';

const DEMO_RECOVERY_PLAN: ActionPlan = {
  type: 'action_plan',
  summary: 'Service recovery for James Lim — rebook hotel + send apology email',
  steps: [
    { action: 'switch_tab', url_pattern: 'passenger-manifest', description: 'Switch to Passenger Manifest' },
    { action: 'read_tab', url_pattern: 'passenger-manifest', description: 'Extract passenger data from manifest' },
    { action: 'switch_tab', url_pattern: 'hotel-portal', description: 'Switch to StaySG Hotels Portal' },
    { action: 'fill', selector: '#hotel-location', value: 'Singapore', description: 'Search for Singapore hotels' },
    { action: 'click', selector: '#btn-hotel-search', description: 'Click search' },
    { action: 'wait', ms: 800, description: 'Wait for search results' },
    { action: 'click', selector: '#btn-book-crowne', description: 'Book Crowne Plaza' },
    { action: 'wait', ms: 500, description: 'Wait for booking form' },
    { action: 'fill', selector: '#booking-guest-name', value: '{{passenger-name}}', description: 'Fill guest name' },
    { action: 'fill', selector: '#booking-guest-email', value: '{{passenger-email}}', description: 'Fill guest email' },
    { action: 'fill', selector: '#booking-guest-phone', value: '{{passenger-phone}}', description: 'Fill guest phone' },
    { action: 'switch_tab', url_pattern: 'crm-email', description: 'Switch to CRM Email' },
    { action: 'fill', selector: '#crm-email-to', value: '{{passenger-email}}', description: 'Set email recipient' },
    { action: 'fill', selector: '#crm-email-subject', value: 'SQ321 Delay — Complimentary Hotel Accommodation', description: 'Set email subject' },
    { action: 'fill', selector: '#crm-email-body', value: 'Dear {{passenger-name}},\n\nWe sincerely apologise for the delay on flight SQ321. As a valued passenger, we have arranged complimentary accommodation at the Crowne Plaza Changi Airport.\n\nPlease present this email at the hotel front desk for check-in.\n\nWarm regards,\nSingapore Airlines Service Recovery Team', description: 'Draft apology email' },
    { action: 'confirm', description: 'Review all changes before submitting' },
  ],
};

async function openDemoTabs(): Promise<void> {
  const tabs = [
    { url: 'http://localhost:3001/flight-schedule.html', pattern: 'flight-schedule' },
    { url: 'http://localhost:3001/passenger-manifest.html', pattern: 'passenger-manifest' },
    { url: 'http://localhost:3000/hotel-portal.html', pattern: 'hotel-portal' },
    { url: 'http://localhost:3001/crm-email.html', pattern: 'crm-email' },
  ];
  for (const tab of tabs) {
    await new Promise<void>(resolve => {
      chrome.runtime.sendMessage({ type: 'OPEN_OR_SWITCH_TAB', url: tab.url, urlPattern: tab.pattern }, () => resolve());
    });
    await new Promise(r => setTimeout(r, 300));
  }
  await new Promise(r => setTimeout(r, 1500));
}

export function launchDemo(dispatch: Dispatch<AppAction>): void {
  dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: 'Launching service recovery demo...' } });
  dispatch({ type: 'SET_STATUS', status: 'busy' });

  openDemoTabs().then(() => {
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: '4 demo tabs opened. Review the action plan below and approve to execute.' } });
    dispatch({ type: 'SET_STATUS', status: 'idle' });
    dispatch({ type: 'SET_PENDING_PLAN', plan: DEMO_RECOVERY_PLAN });
  });
}

export async function launchDemoAI(dispatch: Dispatch<AppAction>): Promise<void> {
  dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: 'Launching AI-powered service recovery demo...' } });
  dispatch({ type: 'SET_STATUS', status: 'busy' });
  dispatch({ type: 'SHOW_SPINNER', label: 'Opening demo tabs...' });

  await openDemoTabs();

  dispatch({ type: 'SHOW_SPINNER', label: 'Reading passenger data...' });
  const fieldsResult = await new Promise<{ fields?: Record<string, string> }>(resolve => {
    chrome.runtime.sendMessage({ type: 'READ_TAB_FIELDS', urlPattern: 'passenger-manifest' }, (r) => resolve(r as { fields?: Record<string, string> }));
  });

  if (fieldsResult?.fields) {
    dispatch({ type: 'MERGE_VARIABLES', variables: fieldsResult.fields });
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: 'Passenger data extracted: ' + Object.entries(fieldsResult.fields).map(([k, v]) => `${k}=${v}`).join(', ') } });
  }

  dispatch({ type: 'SHOW_SPINNER', label: 'Generating action plan with Claude...' });

  try {
    const result = await claudeCall({
      messages: [{
        role: 'user',
        content: `Flight SQ321 is delayed 5 hours. Passenger James Lim needs: 1. Hotel booking at Crowne Plaza via hotel portal 2. Apology email via CRM.\n\nSystems: passenger-manifest (data-waypoint-field attrs), hotel-portal (#hotel-location, #btn-hotel-search, #btn-book-crowne, #booking-guest-name/email/phone), crm-email (#crm-email-to/subject/body).\n\nData: ${JSON.stringify(fieldsResult?.fields || {})}\n\nBuild an action_plan JSON using {{variable}} syntax. End with confirm step.`,
      }],
      system: 'You are Waypoint. Return ONLY a valid action_plan JSON object.',
      maxTokens: 1500,
    });

    const plan = tryParseActionPlan(result);
    if (plan) {
      dispatch({ type: 'SET_PENDING_PLAN', plan });
    } else {
      dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: result } });
    }
  } catch (err) {
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: `Error: ${err}` } });
  } finally {
    dispatch({ type: 'HIDE_SPINNER' });
    dispatch({ type: 'SET_STATUS', status: 'idle' });
  }
}
