import type { Dispatch, MutableRefObject } from 'react';
import type { ActionPlan, ActionStep } from '../types/actions';
import type { AppAction } from './context/AppContext';
import { msgId } from './context/AppContext';
import { sendToBackground } from './cross-tab';

// Module-level variables ref for subVars
let _variables: Record<string, string> = {};

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function waitForTabLoad(): Promise<void> {
  return new Promise(resolve => {
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 300;
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB_URL' }, () => {
        if (elapsed >= 800) { clearInterval(interval); resolve(); }
      });
      if (elapsed >= 8000) { clearInterval(interval); resolve(); }
    }, 300);
  });
}

function waitForUserInput(
  _dispatch: Dispatch<AppAction>,
  pendingResumeRef: MutableRefObject<((value: string) => void) | null>
): Promise<string> {
  return new Promise(resolve => {
    pendingResumeRef.current = (value: string) => {
      pendingResumeRef.current = null;
      resolve(value);
    };
  });
}

async function executeStep(step: ActionStep): Promise<void> {
  const payload: Record<string, unknown> = {
    action: step.action,
    selector: step.selector,
    value: step.value ? subVarsLocal(step.value) : undefined,
    url: step.url,
  };

  const result = await sendToBackground(payload) as { success?: boolean };

  if (!result?.success && step.selector) {
    const waitAction = step.action === 'click' ? 'waitAndClick' : 'waitAndFill';
    await sendToBackground({ ...payload, action: waitAction });
  }
}

function subVarsLocal(str: string): string {
  return str.replace(/\{\{(.+?)\}\}/g, (_match, key: string) => {
    return _variables[key] ?? `{{${key}}}`;
  });
}

export async function executePlan(
  plan: ActionPlan,
  dispatch: Dispatch<AppAction>,
  pendingResumeRef: MutableRefObject<((value: string) => void) | null>
): Promise<void> {
  dispatch({ type: 'SET_STATUS', status: 'busy' });
  _variables = {};

  try {
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: `Step ${i + 1}/${plan.steps.length}: ${step.description}` } });

      switch (step.action) {
        case 'ask_user': {
          dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: step.question || step.description } });
          const answer = await waitForUserInput(dispatch, pendingResumeRef);
          if (step.value) _variables[step.value] = answer;
          break;
        }

        case 'confirm': {
          dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: step.description + '\n\nType **confirm** to proceed or **cancel** to abort.' } });
          const response = await waitForUserInput(dispatch, pendingResumeRef);
          if (response.toLowerCase().includes('cancel')) {
            dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: 'Plan execution cancelled.' } });
            return;
          }
          break;
        }

        case 'wait': {
          await sleep(step.ms || 1000);
          break;
        }

        case 'switch_tab': {
          await new Promise<void>(resolve => {
            chrome.runtime.sendMessage({ type: 'SWITCH_TO_TAB', urlPattern: step.url_pattern }, () => resolve());
          });
          await sleep(600);
          break;
        }

        case 'open_tab': {
          await new Promise<void>(resolve => {
            chrome.runtime.sendMessage({ type: 'OPEN_OR_SWITCH_TAB', url: step.url, urlPattern: step.url_pattern }, () => resolve());
          });
          await waitForTabLoad();
          await sleep(400);
          break;
        }

        case 'read_tab': {
          const result = await new Promise<{ fields?: Record<string, string> }>(resolve => {
            chrome.runtime.sendMessage({ type: 'READ_TAB_FIELDS', urlPattern: step.url_pattern }, (r) => resolve(r as { fields?: Record<string, string> }));
          });
          if (result?.fields) {
            Object.assign(_variables, result.fields);
            dispatch({ type: 'MERGE_VARIABLES', variables: result.fields });
            const summary = Object.entries(result.fields).map(([k, v]) => `**${k}**: ${v}`).join('\n');
            dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: `Extracted data:\n${summary}` } });
          }
          break;
        }

        case 'navigate': {
          await executeStep(step);
          await waitForTabLoad();
          await sleep(350);
          break;
        }

        default: {
          await executeStep(step);
          await sleep(350);
          break;
        }
      }
    }

    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: 'Plan execution complete.' } });
    dispatch({ type: 'SET_STATUS', status: 'done' });
  } catch (err) {
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: `Error: ${err}` } });
    dispatch({ type: 'SET_STATUS', status: 'idle' });
  } finally {
    dispatch({ type: 'HIDE_SPINNER' });
  }
}
