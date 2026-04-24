# Common Chrome Extension Patterns & Recipes

Practical implementations for frequently needed features. Each pattern includes the manifest
configuration, code, and gotchas.

## Table of Contents

- [OAuth Authentication](#oauth-authentication)
- [DeclarativeNetRequest (Ad Blocker / Request Modifier)](#declarativenetrequest)
- [Offscreen Documents](#offscreen-documents)
- [Context Menus with Submenus](#context-menus-with-submenus)
- [Tab Manager](#tab-manager)
- [Content Script Injection on Navigation](#content-script-injection-on-navigation)
- [Badge Counter with Storage Sync](#badge-counter-with-storage-sync)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Side Panel with Tab-Specific Content](#side-panel-with-tab-specific-content)
- [Screenshot Capture](#screenshot-capture)
- [Native Messaging](#native-messaging)
- [Content Script ↔ Page Script Communication](#content-script--page-script-communication)
- [Extension Update Handling](#extension-update-handling)
- [Dark Mode Detection and Theming](#dark-mode-detection-and-theming)
- [Debounced Storage Writes](#debounced-storage-writes)
- [Rate-Limited API Polling](#rate-limited-api-polling)
- [DevTools Panel](#devtools-panel)

---

## OAuth Authentication

### Google OAuth (via chrome.identity)

**Manifest:**
```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "YOUR_ID.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/userinfo.email"]
  }
}
```

**Background:**
```javascript
async function getGoogleToken() {
  try {
    const token = await chrome.identity.getAuthToken({ interactive: true });
    return token.token;
  } catch (err) {
    console.error('Auth failed:', err);
    return null;
  }
}

async function signOut() {
  const token = await chrome.identity.getAuthToken({ interactive: false });
  if (token) {
    await chrome.identity.removeCachedAuthToken({ token: token.token });
    // Also revoke on Google's end
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token.token}`);
  }
}
```

### Third-Party OAuth (GitHub, Microsoft, etc.)

**Background:**
```javascript
const CLIENT_ID = 'your-github-client-id';

async function authenticateWithGitHub() {
  const redirectUrl = chrome.identity.getRedirectURL();
  // redirectUrl = https://<extension-id>.chromiumapp.org/

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUrl);
  authUrl.searchParams.set('scope', 'repo user');

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true
  });

  const code = new URL(responseUrl).searchParams.get('code');

  // Exchange code for token via YOUR backend (don't expose client_secret in extension)
  const { access_token } = await fetch('https://your-backend.com/auth/github/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  }).then(r => r.json());

  await chrome.storage.local.set({ githubToken: access_token });
  return access_token;
}
```

**Gotchas:**
- Never put client secrets in extension code — they're visible to anyone who unzips the extension
- Use a backend proxy for token exchange
- `launchWebAuthFlow` opens a separate window; the redirect URL must match exactly
- Register `https://<extension-id>.chromiumapp.org/` as a redirect URI in your OAuth app

---

## DeclarativeNetRequest

### Static Rules (Ad Blocker Style)

**Manifest:**
```json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "block_rules",
      "enabled": true,
      "path": "rules/block.json"
    }]
  }
}
```

**rules/block.json:**
```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "||ads.example.com",
      "resourceTypes": ["script", "image", "sub_frame", "xmlhttprequest"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "||tracker.example.com",
      "resourceTypes": ["script", "xmlhttprequest", "ping"]
    }
  }
]
```

### Dynamic Rules (User-Configurable)

```javascript
// Add a rule at runtime
await chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1000,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: userProvidedDomain,
      resourceTypes: ['main_frame', 'sub_frame']
    }
  }]
});

// Remove a rule
await chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1000]
});
```

### Header Modification

**Permission:** `"declarativeNetRequestWithHostAccess"` + host permissions

```json
{
  "id": 3,
  "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "responseHeaders": [
      { "header": "X-Frame-Options", "operation": "remove" },
      { "header": "Content-Security-Policy", "operation": "remove" }
    ],
    "requestHeaders": [
      { "header": "User-Agent", "operation": "set", "value": "Custom Agent" }
    ]
  },
  "condition": {
    "urlFilter": "||example.com",
    "resourceTypes": ["main_frame", "sub_frame"]
  }
}
```

---

## Offscreen Documents

### DOM Parsing in Background

```javascript
// background.js
async function parseHTML(htmlString) {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Parse HTML string'
    });
  }

  return new Promise(resolve => {
    chrome.runtime.onMessage.addListener(function handler(msg) {
      if (msg.action === 'parseResult') {
        chrome.runtime.onMessage.removeListener(handler);
        resolve(msg.data);
      }
    });
    chrome.runtime.sendMessage({ action: 'parseHTML', html: htmlString });
  });
}
```

```html
<!-- offscreen.html -->
<script src="offscreen.js"></script>
```

```javascript
// offscreen.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'parseHTML') {
    const doc = new DOMParser().parseFromString(msg.html, 'text/html');
    const titles = [...doc.querySelectorAll('h1')].map(h => h.textContent);
    chrome.runtime.sendMessage({ action: 'parseResult', data: titles });
  }
});
```

### Audio Playback from Background
```javascript
await chrome.offscreen.createDocument({
  url: 'audio-player.html',
  reasons: ['AUDIO_PLAYBACK'],
  justification: 'Play notification sound'
});
chrome.runtime.sendMessage({ action: 'playSound', src: 'sounds/alert.mp3' });
```

---

## Context Menus with Submenus

```javascript
chrome.runtime.onInstalled.addListener(() => {
  // Parent menu
  chrome.contextMenus.create({
    id: 'parent',
    title: 'My Extension',
    contexts: ['all']
  });

  // Submenu items
  chrome.contextMenus.create({
    id: 'action-1',
    parentId: 'parent',
    title: 'Save to Reading List',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'action-2',
    parentId: 'parent',
    title: 'Translate "%s"',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'separator',
    parentId: 'parent',
    type: 'separator',
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: 'settings',
    parentId: 'parent',
    title: 'Settings',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'action-1':
      saveToReadingList(info.linkUrl);
      break;
    case 'action-2':
      translateText(info.selectionText);
      break;
    case 'settings':
      chrome.runtime.openOptionsPage();
      break;
  }
});
```

---

## Tab Manager

```javascript
// Get all tabs grouped by window
async function getTabsByWindow() {
  const windows = await chrome.windows.getAll({ populate: true });
  return windows.map(w => ({
    windowId: w.id,
    focused: w.focused,
    tabs: w.tabs.map(t => ({
      id: t.id,
      title: t.title,
      url: t.url,
      active: t.active,
      pinned: t.pinned,
      groupId: t.groupId
    }))
  }));
}

// Find and activate a tab by URL
async function focusTab(url) {
  const [tab] = await chrome.tabs.query({ url });
  if (tab) {
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
}

// Group tabs by domain
async function groupTabsByDomain() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const byDomain = {};

  for (const tab of tabs) {
    try {
      const domain = new URL(tab.url).hostname;
      (byDomain[domain] ??= []).push(tab.id);
    } catch {}
  }

  for (const [domain, tabIds] of Object.entries(byDomain)) {
    if (tabIds.length > 1) {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, {
        title: domain.replace('www.', ''),
        collapsed: true
      });
    }
  }
}

// Deduplicate tabs
async function closeDuplicateTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const seen = new Set();
  const dupes = [];

  for (const tab of tabs) {
    if (seen.has(tab.url)) {
      dupes.push(tab.id);
    } else {
      seen.add(tab.url);
    }
  }

  if (dupes.length) await chrome.tabs.remove(dupes);
  return dupes.length;
}
```

---

## Content Script Injection on Navigation

Inject a content script on every navigation to matching pages (including SPA navigations):

```javascript
// background.js
chrome.webNavigation.onCompleted.addListener(async ({ tabId, url, frameId }) => {
  if (frameId !== 0) return; // Top frame only

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });
}, {
  url: [{ hostContains: 'example.com' }]
});

// Also catch SPA navigations
chrome.webNavigation.onHistoryStateUpdated.addListener(async ({ tabId, url, frameId }) => {
  if (frameId !== 0) return;

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });
}, {
  url: [{ hostContains: 'example.com' }]
});
```

**Manifest permissions needed:**
```json
"permissions": ["scripting", "webNavigation"],
"host_permissions": ["https://*.example.com/*"]
```

---

## Badge Counter with Storage Sync

```javascript
// background.js
async function updateBadge() {
  const { count = 0 } = await chrome.storage.local.get('count');
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: count > 99 ? '#FF0000' : '#4688F1' });
}

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.count) updateBadge();
});

// Initialize on startup and install
chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
```

---

## Keyboard Shortcuts

**Manifest:**
```json
"commands": {
  "toggle-overlay": {
    "suggested_key": { "default": "Alt+Shift+S", "mac": "Alt+Shift+S" },
    "description": "Toggle the overlay"
  },
  "quick-save": {
    "suggested_key": { "default": "Ctrl+Shift+S", "mac": "Command+Shift+S" },
    "description": "Quick save current page"
  },
  "_execute_action": {
    "suggested_key": { "default": "Alt+E" }
  }
}
```

**Background:**
```javascript
chrome.commands.onCommand.addListener(async (command, tab) => {
  switch (command) {
    case 'toggle-overlay':
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' });
      break;
    case 'quick-save':
      await savePage(tab);
      break;
    // _execute_action is handled automatically (opens popup or fires onClicked)
  }
});
```

---

## Side Panel with Tab-Specific Content

```javascript
// background.js
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Show different content based on the active tab
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  const url = new URL(tab.url || 'about:blank');

  if (url.hostname.includes('github.com')) {
    chrome.sidePanel.setOptions({ tabId, path: 'panels/github.html', enabled: true });
  } else if (url.hostname.includes('jira')) {
    chrome.sidePanel.setOptions({ tabId, path: 'panels/jira.html', enabled: true });
  } else {
    chrome.sidePanel.setOptions({ tabId, path: 'panels/default.html', enabled: true });
  }
});
```

---

## Screenshot Capture

```javascript
// background.js — capture visible tab
async function captureTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: 'png',
    quality: 100
  });
  return dataUrl; // data:image/png;base64,...
}

// Full page screenshot (stitch multiple captures)
async function captureFullPage(tabId) {
  // Inject script to get page dimensions
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth
    })
  });

  const captures = [];
  const { scrollHeight, clientHeight } = result;

  for (let y = 0; y < scrollHeight; y += clientHeight) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (scrollY) => window.scrollTo(0, scrollY),
      args: [y]
    });
    // Small delay for rendering
    await new Promise(r => setTimeout(r, 150));
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
    captures.push({ dataUrl, y });
  }

  // Stitch in offscreen document or return individual captures
  return captures;
}
```

**Permissions needed:** `activeTab` (for on-click capture) or host permissions

---

## Native Messaging

Communicate with a native application installed on the user's machine.

**Manifest:**
```json
"permissions": ["nativeMessaging"]
```

**Native host manifest** (e.g., `com.myextension.host.json`):
```json
{
  "name": "com.myextension.host",
  "description": "Native messaging host",
  "path": "/path/to/native-host",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://YOUR_EXTENSION_ID/"]
}
```

**Extension code:**
```javascript
// One-shot message
const response = await chrome.runtime.sendNativeMessage('com.myextension.host', { action: 'getData' });

// Long-lived connection
const port = chrome.runtime.connectNative('com.myextension.host');
port.onMessage.addListener(msg => console.log('From native:', msg));
port.onDisconnect.addListener(() => {
  if (chrome.runtime.lastError) console.error(chrome.runtime.lastError.message);
});
port.postMessage({ action: 'subscribe' });
```

---

## Content Script <> Page Script Communication

When you need to communicate between an ISOLATED content script and the page's JavaScript:

```javascript
// content.js (ISOLATED world)
// Listen for messages from page
window.addEventListener('message', event => {
  if (event.source !== window || event.data?.type !== 'FROM_PAGE') return;
  // Forward to background
  chrome.runtime.sendMessage({ action: 'pageData', data: event.data.payload });
});

// Send data to page
window.postMessage({ type: 'FROM_EXTENSION', payload: { setting: 'value' } }, '*');
```

```javascript
// Injected into MAIN world (via executeScript or web_accessible_resources)
window.addEventListener('message', event => {
  if (event.source !== window || event.data?.type !== 'FROM_EXTENSION') return;
  // Can access page variables here
  window.myApp.updateSetting(event.data.payload.setting);
});

// Send data to content script
window.postMessage({ type: 'FROM_PAGE', payload: window.myApp.getState() }, '*');
```

**Alternative: CustomEvent**
```javascript
// content.js — dispatch custom event
document.dispatchEvent(new CustomEvent('ext-data', { detail: { key: 'value' } }));

// page script — listen
document.addEventListener('ext-data', e => console.log(e.detail));
```

---

## Extension Update Handling

```javascript
chrome.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  if (reason === 'install') {
    // First install — set defaults, show onboarding
    await chrome.storage.local.set({
      settings: { theme: 'auto', notifications: true },
      installedAt: Date.now()
    });
    chrome.tabs.create({ url: 'onboarding.html' });
  }

  if (reason === 'update') {
    // Extension updated — migrate data if needed
    const { settings } = await chrome.storage.local.get('settings');

    // Example: migrate from v1.x to v2.x schema
    if (previousVersion?.startsWith('1.')) {
      await chrome.storage.local.set({
        settings: { ...settings, newFeature: true }
      });
    }

    // Optional: show changelog
    // chrome.tabs.create({ url: 'changelog.html' });
  }
});
```

---

## Dark Mode Detection and Theming

```javascript
// popup.js or options.js
function applyTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
applyTheme();
```

```css
/* popup.css */
:root[data-theme="light"] {
  --bg: #ffffff;
  --text: #1a1a1a;
  --border: #e0e0e0;
}

:root[data-theme="dark"] {
  --bg: #1e1e1e;
  --text: #e0e0e0;
  --border: #3a3a3a;
}

body {
  background: var(--bg);
  color: var(--text);
}
```

---

## Debounced Storage Writes

Avoid excessive writes when the user is actively changing settings:

```javascript
// lib/storage-utils.js
function createDebouncedSave(storageKey, delayMs = 500) {
  let timer = null;
  let pending = null;

  return function save(data) {
    pending = data;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      timer = null;
      await chrome.storage.local.set({ [storageKey]: pending });
    }, delayMs);
  };
}

// Usage in options.js
const saveSettings = createDebouncedSave('settings', 300);

document.getElementById('font-size').addEventListener('input', e => {
  saveSettings({ ...currentSettings, fontSize: e.target.value });
});
```

---

## Rate-Limited API Polling

```javascript
// background.js
const POLL_INTERVAL_MINUTES = 5;
const API_URL = 'https://api.example.com/notifications';

chrome.alarms.create('poll', { periodInMinutes: POLL_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== 'poll') return;

  try {
    const { lastCheck = 0 } = await chrome.storage.local.get('lastCheck');
    const response = await fetch(`${API_URL}?since=${lastCheck}`);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    await chrome.storage.local.set({ lastCheck: Date.now() });

    if (data.notifications?.length) {
      chrome.action.setBadgeText({ text: String(data.notifications.length) });

      // Show notification for the most recent
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: data.notifications[0].title,
        message: data.notifications[0].body
      });
    }
  } catch (err) {
    console.error('Poll failed:', err);
    // Don't clear the alarm — it'll retry next cycle
  }
});
```

---

## DevTools Panel

**Manifest:**
```json
"devtools_page": "devtools/devtools.html"
```

**devtools/devtools.html:**
```html
<script src="devtools.js"></script>
```

**devtools/devtools.js:**
```javascript
chrome.devtools.panels.create('My Tool', 'icons/icon16.png', 'devtools/panel.html', panel => {
  panel.onShown.addListener(win => {
    // Panel is visible — start updating UI
  });
  panel.onHidden.addListener(() => {
    // Panel hidden — pause updates
  });
});

// Optional: add sidebar to Elements panel
chrome.devtools.panels.elements.createSidebarPane('My Sidebar', sidebar => {
  sidebar.setPage('devtools/sidebar.html');
});
```

**devtools/panel.js:**
```javascript
// Execute code in the inspected page
async function inspectPage() {
  const [result, isException] = await chrome.devtools.inspectedWindow.eval(
    'document.querySelectorAll("img").length'
  );
  document.getElementById('image-count').textContent = isException ? 'Error' : result;
}

// Listen for network requests
chrome.devtools.network.onRequestFinished.addListener(request => {
  if (request.response.content.mimeType.includes('json')) {
    request.getContent((body) => {
      // Process JSON response
    });
  }
});
```
