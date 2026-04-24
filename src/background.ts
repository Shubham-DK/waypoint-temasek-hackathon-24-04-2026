import type { BackgroundMessage, RecordedAction } from './types/messages';

// --- Recording State ---
interface RecordingState {
  active: boolean;
  actions: RecordedAction[];
}
let recording: RecordingState = { active: false, actions: [] };

// --- Helper: Ensure content script is injected ---
async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
  } catch {
    // Silently ignore chrome:// and restricted pages
  }
}

// --- Helper: Get active tab ---
async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// --- Helper: Find tab by URL pattern ---
async function findTabByPattern(urlPattern: string): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({});
  return tabs.find(t => t.url?.includes(urlPattern));
}

// --- Helper: Delay ---
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Message Router ---
chrome.runtime.onMessage.addListener(
  (msg: BackgroundMessage, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
    handleMessage(msg, sender, sendResponse);
    return true; // keep channel open for all async handlers
  }
);

async function handleMessage(
  msg: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  switch (msg.type) {
    case 'BG_START': {
      recording = {
        active: true,
        actions: [{
          type: 'navigate',
          url: msg.url,
          timestamp: Date.now(),
        }],
      };
      sendResponse({ ok: true });
      break;
    }

    case 'BG_PAGE_LOADED': {
      if (recording.active) {
        recording.actions.push({
          type: 'navigate',
          url: msg.url,
          timestamp: Date.now(),
        });
        // Resume recording on the new page
        if (sender.tab?.id) {
          try {
            await chrome.tabs.sendMessage(sender.tab.id, { action: 'resumeRecording' });
          } catch {
            // Tab may not have content script yet
          }
        }
      }
      sendResponse({ ok: true });
      break;
    }

    case 'BG_ACTION': {
      if (recording.active) {
        recording.actions.push(msg.action);
      }
      sendResponse({ ok: true });
      break;
    }

    case 'BG_GET': {
      sendResponse({ actions: recording.actions });
      break;
    }

    case 'BG_STOP': {
      recording.active = false;
      sendResponse({ actions: recording.actions });
      break;
    }

    case 'BG_RESET': {
      recording = { active: false, actions: [] };
      sendResponse({ ok: true });
      break;
    }

    case 'EXECUTE_ACTION': {
      try {
        const tab = await getActiveTab();
        if (!tab?.id) {
          sendResponse({ success: false, error: 'No active tab' });
          break;
        }

        // Special case: navigate uses chrome.tabs.update directly
        if (msg.action === 'navigate' && msg.url) {
          await chrome.tabs.update(tab.id, { url: msg.url });
          sendResponse({ success: true });
          break;
        }

        // For other actions: inject content script, wait, then send message
        await ensureContentScript(tab.id);
        await delay(150);

        const response = await chrome.tabs.sendMessage(tab.id, {
          action: msg.action,
          selector: msg.selector,
          value: msg.value,
          url: msg.url,
        });
        sendResponse(response);
      } catch (err) {
        sendResponse({ success: false, error: String(err) });
      }
      break;
    }

    case 'GET_ACTIVE_TAB_URL': {
      const tab = await getActiveTab();
      sendResponse({ url: tab?.url || '' });
      break;
    }

    case 'CAPTURE_SCREENSHOT': {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(undefined as unknown as number, {
          format: 'jpeg',
          quality: 40,
        });
        sendResponse({ dataUrl });
      } catch (err) {
        sendResponse({ error: String(err) });
      }
      break;
    }

    case 'GET_ALL_TABS': {
      const allTabs = await chrome.tabs.query({});
      const tabs = allTabs.map(t => ({
        id: t.id ?? 0,
        title: t.title ?? '',
        url: t.url ?? '',
      }));
      sendResponse({ tabs });
      break;
    }

    case 'SWITCH_TO_TAB': {
      const target = await findTabByPattern(msg.urlPattern);
      if (target?.id) {
        await chrome.tabs.update(target.id, { active: true });
        if (target.windowId) {
          await chrome.windows.update(target.windowId, { focused: true });
        }
        sendResponse({ success: true, tabId: target.id });
      } else {
        sendResponse({ success: false, error: `No tab matching "${msg.urlPattern}"` });
      }
      break;
    }

    case 'OPEN_OR_SWITCH_TAB': {
      const existing = await findTabByPattern(msg.urlPattern);
      if (existing?.id) {
        await chrome.tabs.update(existing.id, { active: true });
        if (existing.windowId) {
          await chrome.windows.update(existing.windowId, { focused: true });
        }
        sendResponse({ success: true, tabId: existing.id, opened: false });
      } else {
        const newTab = await chrome.tabs.create({ url: msg.url });
        sendResponse({ success: true, tabId: newTab.id, opened: true });
      }
      break;
    }

    case 'READ_TAB_FIELDS': {
      try {
        const target = await findTabByPattern(msg.urlPattern);
        if (!target?.id) {
          sendResponse({ fields: {}, error: `No tab matching "${msg.urlPattern}"` });
          break;
        }
        await ensureContentScript(target.id);
        await delay(150);
        const result = await chrome.tabs.sendMessage(target.id, { action: 'extractDataFields' });
        sendResponse(result);
      } catch (err) {
        sendResponse({ fields: {}, error: String(err) });
      }
      break;
    }

    case 'READ_TAB_CONTENT': {
      try {
        let tabId: number | undefined;

        if (msg.tabId) {
          tabId = msg.tabId;
        } else if (msg.urlPattern) {
          const target = await findTabByPattern(msg.urlPattern);
          tabId = target?.id;
        } else {
          const tab = await getActiveTab();
          tabId = tab?.id;
        }

        if (!tabId) {
          sendResponse({ error: 'No tab found' });
          break;
        }

        await ensureContentScript(tabId);
        await delay(150);
        const result = await chrome.tabs.sendMessage(tabId, { action: 'getPageContent' });
        sendResponse(result);
      } catch (err) {
        sendResponse({ error: String(err) });
      }
      break;
    }
  }
}

// --- Open side panel on icon click ---
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) chrome.sidePanel.open({ tabId: tab.id });
});

// Export for testing
export { handleMessage, recording };
