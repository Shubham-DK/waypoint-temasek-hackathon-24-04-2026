# Background Message Types

All messages are sent via `chrome.runtime.sendMessage` and handled in `background.ts`.

## Chrome Storage Keys

| Key | Type | Contents |
|-----|------|----------|
| `wp_settings` | object | `{ claudeKey, claudeModel, piiMask }` |
| `wp_kb` | array | `[{ id, name, content }]` |
| `wp_agents` | array | `[{ id, name, role, systemPrompt, maxTokens }]` |
| `wp_workflows` | array | `[{ id, name, actions, savedAt, source }]` |

## Message Reference

| Message | Sender | What it does |
|---------|--------|-------------|
| `BG_START` | content | Init recording |
| `BG_PAGE_LOADED` | content | Append navigate + resume recorder |
| `BG_ACTION` | content | Append action to recording |
| `BG_GET` | sidepanel | Return current actions |
| `BG_STOP` | sidepanel | Stop recording, return actions |
| `BG_RESET` | sidepanel | Clear recording state |
| `EXECUTE_ACTION` | sidepanel | Route DOM command to content script |
| `SWITCH_TO_TAB` | sidepanel | Focus tab matching urlPattern |
| `OPEN_OR_SWITCH_TAB` | sidepanel | Open or focus tab |
| `READ_TAB_FIELDS` | sidepanel | Extract `data-waypoint-field` values |
| `READ_TAB_CONTENT` | sidepanel | Get full page structure |
| `GET_ALL_TABS` | sidepanel | Lightweight tab list |
| `GET_ACTIVE_TAB_URL` | sidepanel | Active tab URL |
| `CAPTURE_SCREENSHOT` | sidepanel | JPEG screenshot |
