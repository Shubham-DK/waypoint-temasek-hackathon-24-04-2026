# Chrome APIs Reference

Comprehensive reference for every major `chrome.*` API. Organized alphabetically. Each section lists
the permission required, key methods, key events, and a short usage example.

## Table of Contents

- [chrome.action](#chromeaction)
- [chrome.alarms](#chromealarms)
- [chrome.bookmarks](#chromebookmarks)
- [chrome.commands](#chromecommands)
- [chrome.contextMenus](#chromecontextmenus)
- [chrome.cookies](#chromecookies)
- [chrome.declarativeNetRequest](#chromedeclarativenetrequest)
- [chrome.devtools](#chromedevtools)
- [chrome.downloads](#chromedownloads)
- [chrome.history](#chromehistory)
- [chrome.identity](#chromeidentity)
- [chrome.management](#chromemanagement)
- [chrome.notifications](#chromenotifications)
- [chrome.offscreen](#chromeoffscreen)
- [chrome.omnibox](#chromeomnibox)
- [chrome.permissions](#chromepermissions)
- [chrome.runtime](#chromeruntime)
- [chrome.scripting](#chromescripting)
- [chrome.sidePanel](#chromesidepanel)
- [chrome.storage](#chromestorage)
- [chrome.tabs](#chrometabs)
- [chrome.tts](#chrometts)
- [chrome.webNavigation](#chromewebnavigation)
- [chrome.webRequest](#chromewebrequest)
- [chrome.windows](#chromewindows)

---

## chrome.action

**Permission:** None (declared via `"action"` in manifest)

Controls the extension's toolbar button — its icon, badge, popup, and click behavior.

### Methods
| Method | Description |
|--------|-------------|
| `setPopup({ popup, tabId? })` | Set popup HTML (empty string = no popup, fires onClicked instead) |
| `getPopup({ tabId? })` | Get current popup path |
| `setBadgeText({ text, tabId? })` | Set badge text overlay on icon |
| `setBadgeBackgroundColor({ color, tabId? })` | Badge background color (`[r,g,b,a]` or `#hex`) |
| `setBadgeTextColor({ color, tabId? })` | Badge text color |
| `setIcon({ path | imageData, tabId? })` | Change icon dynamically |
| `setTitle({ title, tabId? })` | Set tooltip text |
| `enable(tabId?)` / `disable(tabId?)` | Enable/disable the action |
| `openPopup()` | Programmatically open popup (Chrome 127+, needs user gesture context) |

### Events
| Event | Description |
|-------|-------------|
| `onClicked(tab)` | Fires when icon clicked AND no popup is set |

### Example
```javascript
// Show unread count as badge
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

// Toggle between popup and click-handler modes
chrome.action.onClicked.addListener(tab => {
  // Only fires when no popup is set
  chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['inject.js'] });
});
```

---

## chrome.alarms

**Permission:** `"alarms"`

Schedule periodic or delayed tasks that survive service worker termination.

### Methods
| Method | Description |
|--------|-------------|
| `create(name, { when?, delayInMinutes?, periodInMinutes? })` | Create alarm |
| `get(name)` | Get alarm by name |
| `getAll()` | Get all alarms |
| `clear(name)` | Remove alarm |
| `clearAll()` | Remove all alarms |

### Events
| Event | Description |
|-------|-------------|
| `onAlarm(alarm)` | Fires when alarm triggers; wakes service worker |

### Notes
- Minimum period: 30 seconds (Chrome 120+)
- Replaces `setTimeout`/`setInterval` for anything beyond a few seconds
- Alarms persist across service worker restarts within the same browser session

### Example
```javascript
// Poll an API every 5 minutes
chrome.alarms.create('poll-api', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === 'poll-api') {
    const data = await fetch('https://api.example.com/status').then(r => r.json());
    if (data.hasUpdate) {
      chrome.notifications.create({ type: 'basic', title: 'Update', message: data.message, iconUrl: 'icons/icon128.png' });
    }
  }
});
```

---

## chrome.bookmarks

**Permission:** `"bookmarks"`

Full CRUD for the user's bookmark tree.

### Methods
| Method | Description |
|--------|-------------|
| `getTree()` | Full bookmark tree |
| `get(idOrIdList)` | Get bookmarks by ID |
| `getChildren(id)` | Children of a folder |
| `search(query | { title?, url? })` | Search bookmarks |
| `create({ parentId, title, url? })` | Create bookmark or folder (no url = folder) |
| `update(id, { title?, url? })` | Modify bookmark |
| `move(id, { parentId?, index? })` | Move bookmark |
| `remove(id)` / `removeTree(id)` | Delete bookmark / folder tree |

### Events
`onCreated`, `onRemoved`, `onChanged`, `onMoved`, `onChildrenReordered`

---

## chrome.commands

**Permission:** None (declared via `"commands"` in manifest)

Keyboard shortcuts for the extension.

### Manifest Declaration
```json
"commands": {
  "toggle-feature": {
    "suggested_key": { "default": "Ctrl+Shift+Y", "mac": "Command+Shift+Y" },
    "description": "Toggle the feature"
  },
  "_execute_action": {
    "suggested_key": { "default": "Ctrl+Shift+E" }
  }
}
```

Special command names: `_execute_action` (opens popup/triggers onClicked), `_execute_side_panel`.

### Events
| Event | Description |
|-------|-------------|
| `onCommand(command, tab)` | Fires when shortcut pressed |

### Notes
- Max 4 suggested shortcuts
- Users can rebind at `chrome://extensions/shortcuts`
- Shortcuts are global across the browser unless scoped to the extension

---

## chrome.contextMenus

**Permission:** `"contextMenus"`

Add items to Chrome's right-click context menu.

### Methods
| Method | Description |
|--------|-------------|
| `create(properties)` | Create menu item |
| `update(id, properties)` | Update menu item |
| `remove(id)` | Remove one item |
| `removeAll()` | Remove all items |

### Key Properties
```javascript
chrome.contextMenus.create({
  id: 'my-item',
  title: 'Search "%s"',           // %s = selected text
  contexts: ['selection'],          // page, selection, link, image, video, audio, frame, editable, action, all
  parentId: 'parent-menu-id',      // for nested menus
  documentUrlPatterns: ['https://*.example.com/*'],
  targetUrlPatterns: ['https://*.cdn.com/*'],  // for link/image contexts
  type: 'normal',                  // normal, checkbox, radio, separator
  checked: false                   // for checkbox/radio types
});
```

### Events
| Event | Description |
|-------|-------------|
| `onClicked(info, tab)` | Fires when menu item clicked; `info.menuItemId`, `info.selectionText`, etc. |

### Example
```javascript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'search-selection',
    title: 'Search for "%s"',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'search-selection') {
    chrome.tabs.create({ url: `https://google.com/search?q=${encodeURIComponent(info.selectionText)}` });
  }
});
```

---

## chrome.cookies

**Permission:** `"cookies"` + host permissions for the cookie's domain

### Methods
| Method | Description |
|--------|-------------|
| `get({ url, name, storeId? })` | Get a specific cookie |
| `getAll({ domain?, name?, url?, storeId? })` | Get matching cookies |
| `set({ url, name, value, domain?, path?, secure?, httpOnly?, expirationDate?, sameSite? })` | Set cookie |
| `remove({ url, name, storeId? })` | Delete cookie |
| `getAllCookieStores()` | List cookie stores (incognito, etc.) |

### Events
| Event | Description |
|-------|-------------|
| `onChanged({ removed, cookie, cause })` | Cookie added, updated, or removed; cause: `explicit`, `expired`, `evicted`, etc. |

---

## chrome.declarativeNetRequest

**Permission:** `"declarativeNetRequest"` (+ `"declarativeNetRequestWithHostAccess"` for header modification)

Block, redirect, or modify network requests using declarative rules. Replaces blocking webRequest in MV3.

### Rule Structure
```json
{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "block"
  },
  "condition": {
    "urlFilter": "||ads.example.com",
    "resourceTypes": ["script", "image", "sub_frame"]
  }
}
```

### Action Types
| Type | Description |
|------|-------------|
| `block` | Block the request |
| `redirect` | Redirect to another URL |
| `modifyHeaders` | Add/remove/set request or response headers (needs host access) |
| `allow` | Explicitly allow (overrides other rules at same priority) |
| `allowAllRequests` | Allow main frame + all sub-requests |
| `upgradeScheme` | HTTP → HTTPS |

### Methods
| Method | Description |
|--------|-------------|
| `updateDynamicRules({ addRules?, removeRuleIds? })` | Manage dynamic rules (limit: 5000) |
| `updateSessionRules({ addRules?, removeRuleIds? })` | Session-only rules (limit: 5000) |
| `getDynamicRules()` / `getSessionRules()` | Read current rules |
| `getMatchedRules({ tabId?, minTimeStamp? })` | Debug: see which rules fired |
| `setExtensionActionOptions({ tabUpdate? })` | Display matched count on badge |

### Static Rules (manifest)
```json
"declarative_net_request": {
  "rule_resources": [{
    "id": "my_rules",
    "enabled": true,
    "path": "rules.json"
  }]
}
```

---

## chrome.devtools

**Permission:** None (declared via `"devtools_page"` in manifest)

Add panels and sidebars to Chrome DevTools.

### Setup
```json
// manifest.json
"devtools_page": "devtools.html"
```

```html
<!-- devtools.html -->
<script src="devtools.js"></script>
```

```javascript
// devtools.js — runs when DevTools opens
chrome.devtools.panels.create('My Panel', 'icons/icon16.png', 'panel.html');
```

### Sub-APIs
| API | Description |
|-----|-------------|
| `devtools.panels.create(title, icon, page)` | Add a new panel tab |
| `devtools.panels.elements.createSidebarPane(title)` | Add sidebar to Elements panel |
| `devtools.inspectedWindow.eval(expr)` | Execute JS in the inspected page |
| `devtools.inspectedWindow.reload({ ignoreCache? })` | Reload inspected page |
| `devtools.network.onRequestFinished(request)` | Inspect HAR entries |

### Communication
The DevTools page runs in its own context. Communicate with the background via `chrome.runtime.connect()`.

---

## chrome.downloads

**Permission:** `"downloads"`

### Methods
| Method | Description |
|--------|-------------|
| `download({ url, filename?, saveAs?, conflictAction? })` | Start download |
| `search(query)` | Search download history |
| `pause(id)` / `resume(id)` / `cancel(id)` | Control download |
| `open(id)` | Open downloaded file |
| `show(id)` | Show in file manager |
| `erase(query)` | Remove from history (not disk) |
| `removeFile(id)` | Delete from disk |

### Events
`onCreated`, `onChanged`, `onDeterminingFilename`

---

## chrome.history

**Permission:** `"history"`

### Methods
| Method | Description |
|--------|-------------|
| `search({ text, startTime?, endTime?, maxResults? })` | Search history |
| `getVisits({ url })` | Get visit details for a URL |
| `addUrl({ url })` | Add entry to history |
| `deleteUrl({ url })` | Delete specific URL |
| `deleteRange({ startTime, endTime })` | Delete range |
| `deleteAll()` | Clear all history |

### Events
`onVisited(historyItem)`, `onVisitRemoved({ allHistory, urls })`

---

## chrome.identity

**Permission:** `"identity"`

OAuth authentication flows.

### Methods
| Method | Description |
|--------|-------------|
| `getAuthToken({ interactive? })` | Get OAuth token via Chrome's built-in Google auth (uses manifest `oauth2` config) |
| `launchWebAuthFlow({ url, interactive? })` | Generic OAuth for any provider (GitHub, Microsoft, etc.) |
| `removeCachedAuthToken({ token })` | Invalidate cached token |
| `getProfileUserInfo()` | Get signed-in user's email/ID |

### Google OAuth Setup
```json
// manifest.json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/userinfo.email"]
}
```

### Non-Google OAuth
```javascript
const redirectUrl = chrome.identity.getRedirectURL();
// redirectUrl = https://<extension-id>.chromiumapp.org/

const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUrl}`;
const responseUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
const code = new URL(responseUrl).searchParams.get('code');
// Exchange code for token via your backend
```

---

## chrome.management

**Permission:** `"management"` (powerful — use sparingly)

Manage other installed extensions.

### Methods
`getAll()`, `get(id)`, `getSelf()`, `setEnabled(id, enabled)`, `uninstall(id, { showConfirmDialog? })`

### Events
`onInstalled`, `onUninstalled`, `onEnabled`, `onDisabled`

---

## chrome.notifications

**Permission:** `"notifications"`

Desktop notifications.

### Methods
| Method | Description |
|--------|-------------|
| `create(id?, options)` | Show notification |
| `update(id, options)` | Update existing notification |
| `clear(id)` | Dismiss notification |
| `getAll()` | Get all active notifications |

### Options
```javascript
chrome.notifications.create('my-notif', {
  type: 'basic',       // basic, image, list, progress
  iconUrl: 'icons/icon128.png',
  title: 'Notification Title',
  message: 'Notification body text',
  buttons: [{ title: 'Action 1' }, { title: 'Action 2' }],
  priority: 2          // -2 to 2
});
```

### Events
`onClicked(id)`, `onButtonClicked(id, buttonIndex)`, `onClosed(id, byUser)`

---

## chrome.offscreen

**Permission:** `"offscreen"`

Create a hidden HTML page for tasks that need DOM access from the background (audio, clipboard, DOM
parsing, OAuth flows).

### Methods
| Method | Description |
|--------|-------------|
| `createDocument({ url, reasons, justification })` | Create offscreen document |
| `closeDocument()` | Close it |
| `hasDocument()` | Check if one exists |

### Reasons Enum
`AUDIO_PLAYBACK`, `BLOBS`, `CLIPBOARD`, `DOM_PARSER`, `DOM_SCRAPING`, `GEOLOCATION`,
`IFRAME_SCRIPTING`, `LOCAL_STORAGE`, `MATCH_MEDIA`, `OAUTH`, `TESTING`, `USER_MEDIA`, `WORKERS`

### Constraint
Only ONE offscreen document per extension at a time.

### Example — Clipboard Access
```javascript
// background.js
async function copyToClipboard(text) {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Write to clipboard'
    });
  }
  chrome.runtime.sendMessage({ action: 'copy', text });
}

// offscreen.js
chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === 'copy') {
    navigator.clipboard.writeText(msg.text);
  }
});
```

---

## chrome.omnibox

**Permission:** None (declared via `"omnibox"` in manifest)

Provide suggestions in the address bar when the user types your keyword.

### Manifest
```json
"omnibox": { "keyword": "my" }
```

### Events
| Event | Description |
|-------|-------------|
| `onInputStarted` | User typed keyword + space |
| `onInputChanged(text, suggest)` | User typing; call `suggest([...])` with suggestions |
| `onInputEntered(text, disposition)` | User selected a suggestion |
| `onInputCancelled` | User cancelled |

### Suggestion Format
```javascript
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  suggest([
    { content: 'search-' + text, description: `Search for <match>${text}</match>` },
    { content: 'open-settings', description: 'Open extension settings' }
  ]);
});
```

---

## chrome.permissions

**Permission:** None

Request optional permissions at runtime.

### Methods
| Method | Description |
|--------|-------------|
| `request({ permissions?, origins? })` | Request permissions (must be from user gesture) |
| `contains({ permissions?, origins? })` | Check if granted |
| `remove({ permissions?, origins? })` | Revoke permissions |
| `getAll()` | List all granted permissions |

### Events
`onAdded({ permissions, origins })`, `onRemoved({ permissions, origins })`

### Example
```javascript
// In popup.js (user clicked a button)
document.getElementById('enable-feature').addEventListener('click', async () => {
  const granted = await chrome.permissions.request({
    permissions: ['notifications'],
    origins: ['https://api.example.com/*']
  });
  if (granted) {
    // Enable the feature
  }
});
```

---

## chrome.runtime

**Permission:** None

Core extension runtime API — messaging, lifecycle, and metadata.

### Methods
| Method | Description |
|--------|-------------|
| `sendMessage(extensionId?, message, options?)` | One-time message to extension |
| `connect(extensionId?, { name? })` | Open long-lived Port |
| `getURL(path)` | Get `chrome-extension://ID/path` URL |
| `getManifest()` | Get parsed manifest object |
| `reload()` | Reload the extension |
| `setUninstallURL(url)` | Set URL to open on uninstall |
| `openOptionsPage()` | Open the options page |
| `sendNativeMessage(app, message)` | Native messaging |
| `connectNative(app)` | Native messaging Port |

### Properties
| Property | Description |
|----------|-------------|
| `id` | Extension's own ID |
| `lastError` | Error from last callback-style API call (check this!) |

### Events
| Event | Description |
|-------|-------------|
| `onInstalled({ reason, previousVersion? })` | `install`, `update`, `chrome_update` |
| `onStartup` | Browser starts (not fired on install) |
| `onMessage(message, sender, sendResponse)` | Incoming one-time message |
| `onConnect(port)` | Incoming Port connection |
| `onMessageExternal` / `onConnectExternal` | From other extensions or web pages |
| `onSuspend` | Service worker about to be terminated |
| `onUpdateAvailable({ version })` | New version available |

---

## chrome.scripting

**Permission:** `"scripting"` + host permissions or `activeTab`

Inject scripts and CSS into web pages programmatically.

### Methods
| Method | Description |
|--------|-------------|
| `executeScript({ target, files? | func?, args?, world? })` | Inject JS |
| `insertCSS({ target, files? | css? })` | Inject CSS |
| `removeCSS({ target, files? | css? })` | Remove injected CSS |
| `registerContentScripts([...])` | Register persistent content scripts dynamically |
| `getRegisteredContentScripts({ ids? })` | Get registered scripts |
| `unregisterContentScripts({ ids? })` | Remove registered scripts |
| `updateContentScripts([...])` | Update registered scripts |

### Target Object
```javascript
{ tabId: 123, frameIds?: [0], allFrames?: false }
```

### World Option
- `'ISOLATED'` (default) — separate JS context, can access DOM but not page variables
- `'MAIN'` — page's JS context, can access `window` variables but no `chrome.*` APIs

### Example — Inject Function with Arguments
```javascript
chrome.scripting.executeScript({
  target: { tabId },
  func: (color) => { document.body.style.backgroundColor = color; },
  args: ['#ff0000']
});
```

---

## chrome.sidePanel

**Permission:** `"sidePanel"`

Side panel UI (Chrome 114+).

### Manifest
```json
"side_panel": { "default_path": "sidepanel.html" }
```

### Methods
| Method | Description |
|--------|-------------|
| `open({ tabId?, windowId? })` | Open the side panel |
| `setOptions({ tabId?, path?, enabled? })` | Set panel content per-tab |
| `getOptions({ tabId? })` | Get current options |
| `setPanelBehavior({ openPanelOnActionClick? })` | Open panel on toolbar icon click |
| `getPanelBehavior()` | Get current behavior |

### Example
```javascript
// Open side panel on icon click instead of popup
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Different panel per tab
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.sidePanel.setOptions({ tabId, path: 'panel-for-tab.html' });
});
```

---

## chrome.storage

**Permission:** `"storage"`

See the Storage section in SKILL.md for detailed usage. Key addition here:

### Managed Storage
Admin-configured read-only values (enterprise). Requires `"storage": { "managed_schema": "schema.json" }` in manifest.

```javascript
const { policy } = await chrome.storage.managed.get('policy');
```

---

## chrome.tabs

**Permission:** `"tabs"` only needed for URL/title/favIconUrl access. Tab operations work without it.

### Methods
| Method | Description |
|--------|-------------|
| `query(queryInfo)` | Find tabs — `{ active: true, currentWindow: true }` for current tab |
| `create({ url?, active?, pinned?, index?, windowId? })` | Open tab |
| `update(tabId, { url?, active?, pinned?, muted? })` | Modify tab |
| `remove(tabId | tabIds)` | Close tab(s) |
| `duplicate(tabId)` | Duplicate tab |
| `move(tabId, { windowId?, index })` | Move tab |
| `reload(tabId?, { bypassCache? })` | Reload tab |
| `sendMessage(tabId, message)` | Message content script in tab |
| `captureVisibleTab(windowId?, { format?, quality? })` | Screenshot (needs `activeTab` or host permission) |
| `group({ tabIds, groupId? })` / `ungroup(tabIds)` | Tab groups |
| `goBack(tabId)` / `goForward(tabId)` | Navigation |
| `getZoom(tabId)` / `setZoom(tabId, factor)` | Zoom |

### Events
| Event | Description |
|-------|-------------|
| `onCreated(tab)` | Tab created |
| `onUpdated(tabId, changeInfo, tab)` | Tab changed (loading, URL, title, etc.) |
| `onActivated({ tabId, windowId })` | Tab focused |
| `onRemoved(tabId, { windowId, isWindowClosing })` | Tab closed |
| `onMoved`, `onAttached`, `onDetached`, `onReplaced`, `onZoomChange` | Various |

### Common Pattern — Get Active Tab
```javascript
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
```

---

## chrome.tts

**Permission:** `"tts"`

Text-to-speech.

### Methods
| Method | Description |
|--------|-------------|
| `speak(utterance, options?)` | Speak text |
| `stop()` | Stop speaking |
| `pause()` / `resume()` | Pause/resume |
| `isSpeaking()` | Check if speaking |
| `getVoices()` | List available voices |

### Options
```javascript
chrome.tts.speak('Hello world', {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  voiceName: 'Google US English',
  lang: 'en-US',
  onEvent: (event) => { /* 'start', 'end', 'word', 'error' */ }
});
```

---

## chrome.webNavigation

**Permission:** `"webNavigation"`

Observe navigation events in detail.

### Events (in order)
1. `onBeforeNavigate({ tabId, url, frameId, timeStamp })`
2. `onCommitted({ tabId, url, frameId, transitionType })`
3. `onDOMContentLoaded({ tabId, url, frameId })`
4. `onCompleted({ tabId, url, frameId })`

### Additional Events
| Event | Description |
|-------|-------------|
| `onHistoryStateUpdated` | `pushState`/`replaceState` — useful for SPA navigation detection |
| `onReferenceFragmentUpdated` | Hash change |
| `onErrorOccurred` | Navigation error |
| `onCreatedNavigationTarget` | New tab/window from navigation |

### SPA Detection Example
```javascript
chrome.webNavigation.onHistoryStateUpdated.addListener(({ tabId, url }) => {
  console.log(`SPA navigation in tab ${tabId}: ${url}`);
}, { url: [{ hostContains: 'example.com' }] });
```

---

## chrome.webRequest

**Permission:** `"webRequest"` + host permissions

Observable (non-blocking) network request monitoring. Blocking mode is removed in MV3 for consumer
extensions — use `declarativeNetRequest` instead.

### Events (lifecycle order)
1. `onBeforeRequest` — URL, method, type, body (POST)
2. `onBeforeSendHeaders` — request headers
3. `onSendHeaders` — final request headers
4. `onHeadersReceived` — response headers
5. `onAuthRequired` — 401/407 response
6. `onResponseStarted` — response body started
7. `onCompleted` / `onErrorOccurred` — finished

### Example — Log Requests
```javascript
chrome.webRequest.onCompleted.addListener(
  details => console.log(details.url, details.statusCode),
  { urls: ['https://*.example.com/*'] }
);
```

---

## chrome.windows

**Permission:** None for basic operations; `"tabs"` for populated tab info

### Methods
| Method | Description |
|--------|-------------|
| `get(windowId, { populate? })` | Get window info |
| `getCurrent({ populate? })` | Current window |
| `getAll({ populate? })` | All windows |
| `create({ url?, type?, state?, width?, height?, left?, top? })` | Create window |
| `update(windowId, { state?, focused?, width?, height? })` | Modify window |
| `remove(windowId)` | Close window |

### Window Types
`normal`, `popup` (chromeless), `panel`, `devtools`

### Events
`onCreated`, `onRemoved`, `onFocusChanged`, `onBoundsChanged`
