---
name: chrome-extension-creator
description: >
  Build Chrome extensions from scratch — scaffolding, manifest v3, service workers, content scripts,
  popup/side-panel UI, Chrome APIs, messaging, storage, permissions, and packaging. Use this skill
  whenever the user asks to create, build, scaffold, or develop a Chrome extension, browser extension,
  or Chrome plugin. Also trigger when the user mentions manifest.json for a browser extension, content
  scripts, chrome.* APIs, browser action popups, MV3 migration, or publishing to the Chrome Web Store —
  even if they don't say "extension" explicitly.
---

# Chrome Extension Creator

You are an expert Chrome extension developer. When a user asks you to build a Chrome extension, follow
this guide to deliver a complete, production-quality Manifest V3 extension.

## Workflow Overview

1. **Clarify requirements** — understand what the extension should do, which Chrome APIs it needs, and
   what UI surfaces are involved (popup, side panel, content script overlay, options page, etc.).
2. **Choose architecture** — pick the right combination of service worker, content scripts, and UI
   pages. Decide on a build tool if the project needs one (plain JS for simple extensions, WXT/Vite
   for anything with a framework).
3. **Scaffold the project** — create the directory structure, manifest.json, and entry files.
4. **Implement** — write the code, wiring up messaging, storage, and APIs correctly.
5. **Test** — load the unpacked extension in Chrome and verify it works.
6. **Package** — zip for distribution or prepare for Chrome Web Store submission.

---

## Architecture Decision Guide

Pick the simplest architecture that meets the requirements:

| Need | Architecture |
|------|-------------|
| Modify page appearance/behavior | Content script (static or dynamic) |
| Background processing, event handling, alarms | Service worker |
| User-facing controls | Popup, side panel, or options page |
| Network request modification | declarativeNetRequest rules |
| DevTools integration | devtools_page + panels |
| Cross-origin API calls | Service worker (extensions bypass CORS from background) |

Most extensions need a **service worker + at least one UI surface + possibly content scripts**. The
service worker is the orchestrator — it handles events, manages state via `chrome.storage`, and
coordinates between content scripts and UI pages through messaging.

---

## Manifest V3 — Getting It Right

Every extension starts with `manifest.json`. Here is the canonical structure with the fields you will
most commonly use:

```json
{
  "manifest_version": 3,
  "name": "Extension Name",
  "version": "1.0.0",
  "description": "What this extension does (max 132 chars)",
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png"
    },
    "default_title": "Click to open"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_end"
    }
  ],
  "permissions": [],
  "host_permissions": [],
  "optional_permissions": [],
  "optional_host_permissions": [],
  "web_accessible_resources": [
    {
      "resources": ["images/*"],
      "matches": ["https://*.example.com/*"]
    }
  ]
}
```

### Permissions Strategy

Request the **minimum** set of permissions. The fewer permissions, the faster the review and the more
trust from users.

- **`activeTab`** — prefer this over broad host permissions when you only need access to the current
  tab on user gesture (toolbar click, context menu, keyboard shortcut). It grants temporary scripting
  access without showing a scary install prompt.
- **`host_permissions`** — only request specific domains you actually need. Avoid `<all_urls>` unless
  the extension genuinely works on every site.
- **`optional_permissions` / `optional_host_permissions`** — for features the user might not need
  immediately. Request at runtime with `chrome.permissions.request()` (must be called from a user
  gesture).

Common permissions and when to use them:

| Permission | When needed |
|-----------|------------|
| `storage` | Almost always — persisting settings, state, cached data |
| `activeTab` | Scripting the current tab on user click |
| `scripting` | Dynamic script/CSS injection via `chrome.scripting` |
| `alarms` | Scheduled tasks, polling, keep-alive |
| `notifications` | Desktop notifications |
| `contextMenus` | Right-click menu items |
| `tabs` | Only if you need tab URL/title — basic tab operations work without it |
| `cookies` | Reading/writing cookies (also needs host permissions for the domain) |
| `declarativeNetRequest` | Blocking or modifying network requests |
| `identity` | OAuth flows |
| `sidePanel` | Side panel UI |
| `offscreen` | Offscreen documents for DOM/audio/clipboard in background |

See `references/chrome-apis.md` for the full API reference.

---

## Service Worker (Background Script)

The service worker is the brain of the extension. It has no DOM access and Chrome will terminate it
after ~30 seconds of inactivity, so it must be **event-driven** and **stateless between events**.

### Key Patterns

```javascript
// background.js

// One-time setup on install/update
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // Set defaults in storage
    chrome.storage.local.set({ settings: { theme: 'light' } });
    // Create context menus
    chrome.contextMenus.create({
      id: 'main-action',
      title: 'Do something',
      contexts: ['selection']
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchData') {
    // Extensions bypass CORS from background — use this for API calls
    fetch(message.url)
      .then(res => res.json())
      .then(data => sendResponse({ data }))
      .catch(err => sendResponse({ error: err.message }));
    return true; // CRITICAL: return true for async sendResponse
  }
});
```

### What NOT to do in a service worker
- Don't store state in variables — they vanish when the worker terminates. Use `chrome.storage`.
- Don't use `setTimeout`/`setInterval` for anything beyond a few seconds — use `chrome.alarms`.
- Don't access `document` or `window` — they don't exist.
- Don't use synchronous XHR.

### Keep-Alive (when you genuinely need it)
Use `chrome.alarms` with a minimum 30-second period:
```javascript
chrome.alarms.create('keepalive', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'keepalive') { /* do periodic work */ }
});
```

### Module Service Workers
Set `"type": "module"` in the manifest to use ES module imports:
```javascript
// background.js (module)
import { processData } from './lib/utils.js';
```

---

## Content Scripts

Content scripts run in the context of web pages. They can read and modify the page DOM but live in an
**isolated world** — they cannot access the page's JavaScript variables directly.

### Static Injection (manifest)
Best for scripts that should always run on specific sites:
```json
"content_scripts": [{
  "matches": ["https://*.example.com/*"],
  "js": ["content.js"],
  "css": ["content.css"],
  "run_at": "document_idle",
  "all_frames": false
}]
```

### Dynamic Injection (programmatic)
Best for on-demand injection (requires `scripting` permission + host access or `activeTab`):
```javascript
// From service worker or popup
chrome.scripting.executeScript({
  target: { tabId },
  files: ['content.js']
});
```

### Communicating with Background
```javascript
// content.js — send message to service worker
const response = await chrome.runtime.sendMessage({
  action: 'fetchData',
  url: 'https://api.example.com/data'
});

// content.js — listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlight') {
    document.querySelectorAll(message.selector).forEach(el => {
      el.style.backgroundColor = 'yellow';
    });
    sendResponse({ success: true });
  }
});
```

### Accessing Page JavaScript (MAIN world)
When you need to read page-level JS variables or intercept page events:
```javascript
chrome.scripting.executeScript({
  target: { tabId },
  world: 'MAIN',
  func: () => {
    // This runs in the page's JS context — can access window.myApp, etc.
    // But has NO access to chrome.* extension APIs
    window.postMessage({ type: 'FROM_EXTENSION', data: window.myApp.state }, '*');
  }
});
```

---

## Messaging

Messaging is how the different parts of an extension talk to each other.

### One-Time Messages
```javascript
// Send from anywhere → background
const response = await chrome.runtime.sendMessage({ action: 'getData' });

// Send from background → specific tab's content script
const response = await chrome.tabs.sendMessage(tabId, { action: 'highlight' });

// Receiver (return true for async response)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleAsync(msg).then(sendResponse);
  return true;
});
```

### Long-Lived Connections (Ports)
Use when you need ongoing back-and-forth communication:
```javascript
// Initiator (content script or popup)
const port = chrome.runtime.connect({ name: 'data-stream' });
port.postMessage({ subscribe: 'updates' });
port.onMessage.addListener(msg => console.log('Update:', msg));
port.onDisconnect.addListener(() => {
  // Reconnect logic if needed
});

// Background receiver
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'data-stream') {
    port.onMessage.addListener(msg => {
      // Stream data back
      port.postMessage({ update: 'new data' });
    });
  }
});
```

### Common Pitfall: "Receiving end does not exist"
This error means the listener wasn't registered before the message was sent. Common causes:
- Content script not yet injected when `chrome.tabs.sendMessage` is called
- Service worker terminated and hasn't re-registered its listener yet
- Popup closed (its JS context is destroyed on close)

---

## Storage

`chrome.storage` is the primary state persistence mechanism. Unlike `localStorage`, it works in
service workers and supports cross-context access.

```javascript
// Write
await chrome.storage.local.set({ key: 'value', settings: { theme: 'dark' } });

// Read
const { key, settings } = await chrome.storage.local.get(['key', 'settings']);

// Remove
await chrome.storage.local.remove('key');

// Listen for changes (works in any context)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.settings) {
    console.log('Settings changed:', changes.settings.oldValue, '→', changes.settings.newValue);
  }
});
```

| Storage type | Use case | Quota |
|-------------|---------|-------|
| `local` | General persistence | ~10 MB |
| `sync` | Synced across devices via Google account | ~100 KB total, 8 KB per item |
| `session` | Temporary state that survives SW restarts but not browser restart | ~10 MB |

---

## UI Surfaces

### Popup
The popup is the most common UI surface. It's an HTML page shown when the user clicks the toolbar
icon.

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 320px; min-height: 200px; font-family: system-ui; padding: 16px; }
  </style>
</head>
<body>
  <h2>My Extension</h2>
  <div id="content"></div>
  <script src="popup.js"></script>
</body>
</html>
```

Important: the popup's JS context is destroyed when the popup closes. Don't store state in popup
variables — use `chrome.storage` or send data to the service worker.

### Side Panel (Chrome 114+)
A persistent panel that survives tab navigation — great for tools, dashboards, or assistants.

```json
// manifest.json
"side_panel": { "default_path": "sidepanel.html" },
"permissions": ["sidePanel"]
```

```javascript
// Open programmatically
chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });

// Or: open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

### Options Page
```json
"options_ui": {
  "page": "options.html",
  "open_in_tab": true
}
```

---

## Cross-Origin Requests

Extensions have a superpower: the service worker (and other extension pages like popup/options) can
make `fetch()` calls to any URL listed in `host_permissions` **without CORS restrictions**.

Content scripts, however, are subject to CORS. The standard pattern is to relay requests through the
service worker:

```javascript
// content.js
const data = await chrome.runtime.sendMessage({
  action: 'fetchData',
  url: 'https://api.example.com/data'
});

// background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'fetchData') {
    fetch(msg.url).then(r => r.json()).then(sendResponse);
    return true;
  }
});
```

---

## Content Security Policy

MV3 enforces a strict CSP on extension pages:
- No inline scripts (`<script>` in HTML) — all JS must be in separate files
- No `eval()` or `new Function()`
- No remote script sources
- No `unsafe-inline` or `unsafe-eval` (except in sandboxed pages)

If you need `eval` (e.g., for a template engine), use a sandboxed iframe and communicate via
`postMessage`.

---

## Build Tools

### No build tool (simple extensions)
For extensions with plain JS/CSS and no framework, just create files directly. This is the right
choice for small utilities, bookmarklets-turned-extensions, or prototypes.

### WXT (recommended for framework-based extensions)
WXT is the leading extension framework — think "Vite for browser extensions":
```bash
npx wxt@latest init my-extension
cd my-extension && npm install && npm run dev
```
- File-based entrypoints (`entrypoints/popup.html`, `entrypoints/background.ts`)
- Automatic manifest generation
- HMR during development
- TypeScript out of the box
- Cross-browser support (Chrome + Firefox)

### Vite + CRXJS
```bash
npm create vite@latest my-ext -- --template react-ts
npm i -D @crxjs/vite-plugin
```
Good if you already have a Vite project and want to add extension capabilities.

### TypeScript Setup (manual)
```bash
npm i -D typescript @types/chrome
```
The `@types/chrome` package provides types for all `chrome.*` APIs.

---

## Project Structure

### Simple extension (no build tool)
```
my-extension/
├── manifest.json
├── background.js
├── content.js
├── content.css
├── popup.html
├── popup.js
├── popup.css
├── options.html
├── options.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── lib/
    └── utils.js
```

### Framework-based extension (WXT)
```
my-extension/
├── entrypoints/
│   ├── background.ts
│   ├── content.ts
│   ├── popup/
│   │   ├── index.html
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── options/
│       ├── index.html
│       └── main.tsx
├── public/
│   └── icons/
├── wxt.config.ts
├── package.json
└── tsconfig.json
```

---

## Testing & Debugging

### Loading an unpacked extension
1. Open `chrome://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" → select the extension directory
4. The extension appears in the list with an ID

### Debugging service workers
- Click the "Service worker" link on the extension card at `chrome://extensions`
- This opens DevTools scoped to the SW context
- Note: having DevTools open keeps the SW alive artificially — close it to test idle termination

### Debugging content scripts
- Open DevTools on the page → Sources → Content scripts → find your extension
- Console context: use the dropdown above the console to switch to your extension's context

### Debugging popup
- Right-click the extension icon → "Inspect popup"
- Or: go to `chrome://extensions` → click the popup HTML link

### Common errors
- **"Service worker registration failed"** — syntax error in your SW file; check the Errors section
  at `chrome://extensions`
- **"Receiving end does not exist"** — see the Messaging section above
- **Permissions error** — you're calling an API without declaring its permission in the manifest

---

## Packaging & Publishing

### Create a zip for distribution
```bash
cd my-extension
zip -r ../my-extension.zip . -x ".*" -x "node_modules/*" -x "*.map"
```

### Chrome Web Store checklist
- All four icon sizes (16, 32, 48, 128)
- `description` field filled in (max 132 chars)
- At least one screenshot (1280x800 or 640x400)
- Privacy policy URL if the extension handles user data
- Minimal permissions — reviewers check that each permission is justified
- No remote code execution (eval, remote scripts)

---

## Reference Files

For detailed API reference, common patterns, and advanced topics, consult:

- **`references/chrome-apis.md`** — comprehensive reference for every major Chrome API with method
  signatures, events, and usage examples. Read this when you need specifics on an API.
- **`references/patterns.md`** — common extension patterns and recipes (OAuth flows, declarativeNetRequest
  rules, offscreen documents, devtools panels, context menus with submenus, tab management, etc.).
  Read this when implementing a specific feature pattern.
