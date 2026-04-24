import type { TabInfo } from '../types/messages';

export async function getOpenTabs(): Promise<TabInfo[]> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_ALL_TABS' }, (response: { tabs: TabInfo[] }) => {
      resolve(response?.tabs || []);
    });
  });
}

export function subVars(str: string | undefined | null, variables: Record<string, string>): string {
  if (!str || typeof str !== 'string') return str as string;
  return str.replace(/\{\{(.+?)\}\}/g, (_match, key: string) => {
    return variables[key] ?? `{{${key}}}`;
  });
}

export function sendToBackground(payload: Record<string, unknown>): Promise<unknown> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'EXECUTE_ACTION', ...payload }, resolve);
  });
}
