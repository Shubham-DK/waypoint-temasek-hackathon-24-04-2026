# Waypoint Chrome Extension — Technical Implementation Plan

> **Purpose:** Step-by-step guide to build the complete Waypoint Chrome Extension from scratch using AI-assisted development. Each phase is self-contained, testable, and ordered by dependency.
>
> **Stack:** TypeScript + Vite + Vitest + Node/Express demo servers
>
> **Estimated phases:** 9 phases, each independently verifiable

---

## Pre-Requisites

- Google Chrome (Developer mode enabled at `chrome://extensions`)
- Node.js 18+ and npm
- A Claude API key (obtain from console.anthropic.com)
- Text editor / IDE (VS Code recommended for TypeScript support)

---

## Project Structure

```
waypoint/
├── package.json                 # Dependencies + scripts
├── tsconfig.json                # TypeScript config (strict mode)
├── tsconfig.node.json           # TS config for Vite + server scripts
├── vite.config.ts               # Vite build config for Chrome extension
├── src/
│   ├── manifest.json            # Chrome MV3 manifest (copied to dist/)
│   ├── types/
│   │   ├── messages.ts          # All message type definitions
│   │   ├── actions.ts           # Action plan + step types
│   │   ├── state.ts             # App state interface
│   │   └── config.ts            # WAYPOINT_CONFIG type
│   ├── config.ts                # Config defaults + runtime config object
│   ├── background.ts            # Service worker — message router
│   ├── content.ts               # Injected into pages — event capture + DOM execution
│   ├── demo-bridge.ts           # content.ts re-implementation for chrome-extension:// pages
│   └── sidepanel/
│       ├── index.html           # Side panel HTML (Vite entry point)
│       ├── sidepanel.css        # Styles
│       ├── main.ts              # Entry point — imports + initializes all modules
│       ├── state.ts             # App state singleton
│       ├── settings.ts          # Settings save/load
│       ├── panels.ts            # Panel toggle logic
│       ├── agents.ts            # Agent definitions + CRUD
│       ├── kb.ts                # Knowledge Base CRUD + search
│       ├── pii.ts               # PII masking
│       ├── claude.ts            # Claude API client
│       ├── chat-ui.ts           # Chat message rendering
│       ├── chat-handler.ts      # Send handler + agent core
│       ├── system-prompt.ts     # System prompt builder
│       ├── plan-parser.ts       # Action plan JSON parsing
│       ├── approval.ts          # Approval card UI
│       ├── executor.ts          # Plan execution engine
│       ├── cross-tab.ts         # Tab helpers + variable substitution
│       ├── demo.ts              # Hardcoded demo recovery plan
│       ├── scenario.ts          # Multi-agent pipeline
│       ├── recording.ts         # Workflow recording
│       ├── workflows.ts         # Workflow management
│       └── csv.ts               # CSV data source auto-fill
├── demo/
│   ├── server.ts                # Express server for both ports
│   ├── public/
│   │   ├── flight-schedule.html
│   │   ├── passenger-manifest.html
│   │   ├── hotel-portal.html
│   │   └── crm-email.html
├── test/
│   ├── setup.ts                 # Vitest global setup — Chrome API mocks
│   ├── chrome-mock.ts           # Typed chrome.* API stubs
│   ├── unit/
│   │   ├── pii.test.ts
│   │   ├── plan-parser.test.ts
│   │   ├── csv.test.ts
│   │   ├── cross-tab.test.ts
│   │   ├── kb.test.ts
│   │   └── system-prompt.test.ts
│   └── integration/
│       ├── settings.test.ts
│       ├── agents.test.ts
│       ├── claude.test.ts
│       ├── executor.test.ts
│       └── background.test.ts
├── vitest.config.ts             # Vitest configuration
├── dist/                        # Build output — load THIS in Chrome
└── scripts/
    └── dev.ts                   # Starts Vite watch + demo server
```

**Key difference from vanilla JS:** Instead of one monolithic `sidepanel.js` (~2280 lines), the logic is split into ~18 focused TypeScript modules under `src/sidepanel/`. Vite bundles them into a single output automatically.

---

## Phase 0 — Project Scaffold + Build Tooling

**Goal:** Set up the TypeScript + Vite build pipeline. After this phase, `npm run build` produces a `dist/` folder and `npm run dev` starts watch mode + demo servers.

### File 1: `package.json`

```json
{
  "name": "waypoint-extension",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently \"vite build --watch --mode development\" \"tsx demo/server.ts\"",
    "build": "tsc --noEmit && vite build",
    "demo": "tsx demo/server.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@types/chrome": "^0.0.287",
    "@types/express": "^5.0.0",
    "@vitest/coverage-v8": "^3.1.0",
    "concurrently": "^9.1.0",
    "express": "^5.1.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vite": "^6.3.0",
    "vitest": "^3.1.0"
  }
}
```

**Key dependencies:**
- `@types/chrome` — type definitions for all Chrome extension APIs
- `vite` — builds TS to JS, handles HTML entry points, copies static assets
- `tsx` — runs TypeScript files directly (for demo server + scripts)
- `express` — demo HTTP server (replaces Python)
- `concurrently` — runs Vite watch + demo server in parallel
- `@types/express` — Express type definitions

### File 2: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome"],
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "demo", "scripts"]
}
```

### File 3: `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts", "demo/**/*.ts", "scripts/**/*.ts"]
}
```

### File 4: `vite.config.ts`

The Vite config must handle Chrome extension specifics:
- **Background script** (`background.ts`) — must output as IIFE (service workers can't use ES modules)
- **Content script** (`content.ts`) — must output as IIFE (injected into arbitrary pages)
- **Demo bridge** (`demo-bridge.ts`) — must output as IIFE
- **Sidepanel** (`sidepanel/index.html`) — standard Vite HTML entry (can use ES modules since it's an extension page)
- **manifest.json** — copy to `dist/` unchanged
- **Config** (`config.ts`) — needs special handling (see note below)

```
Build strategy:
  Use Vite with rollupOptions to produce multiple outputs:
    - Input 1: src/sidepanel/index.html → dist/sidepanel/index.html + bundled JS/CSS
    - Input 2: src/background.ts → dist/background.js (IIFE format)
    - Input 3: src/content.ts → dist/content.js (IIFE format)
    - Input 4: src/demo-bridge.ts → dist/demo-bridge.js (IIFE format)

  Static copy: src/manifest.json → dist/manifest.json

  NOTE: background.ts, content.ts, and demo-bridge.ts cannot use ES module
  imports at runtime (no import statements in output). They must be self-contained
  IIFE bundles. Vite handles this via rollup output format: 'iife'.
```

**Implementation approach for multi-format output:**

Since Vite can only have one output format per build, use one of:
- **Option A:** `@anthropic-ai/vite-plugin-chrome-extension` or `@nicolo-ribaudo/vite-plugin-chrome-extension` (handles everything)
- **Option B:** Two Vite configs — one for the sidepanel (HTML entry, ESM), one for IIFE scripts (background, content, demo-bridge)
- **Option C:** Use `vite-plugin-web-extension` (specifically designed for MV3 extensions)

**Recommended: Option C (`vite-plugin-web-extension`)**

> **CRITICAL:** You must set `root: 'src'` so the plugin resolves manifest paths (like `sidepanel/index.html`) relative to the `src/` directory. Without this, the build fails with "Could not resolve entry module". The `outDir` must then be `../dist` (relative to the new root).

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
  root: 'src',   // <-- REQUIRED: manifest paths resolve relative to this
  plugins: [
    webExtension({
      manifest: 'manifest.json',  // relative to root (src/)
    }),
  ],
  build: {
    outDir: '../dist',   // output relative to root
    emptyOutDir: true,   // note: emptyOutDir, not emptyDirOnBuild
  },
});
```

If `vite-plugin-web-extension` is used, add it to devDependencies:
```
"vite-plugin-web-extension": "^4.0.0"
```

### Verification

```bash
npm install
npm run build        # should produce dist/ with all files
ls dist/             # manifest.json, background.js, content.js, sidepanel/index.html, etc.
npm run dev          # should start watch + demo servers
```

---

## Phase 1 — Type Definitions

**Goal:** Define all TypeScript interfaces and types used across the extension. This phase produces no runtime code — just type safety for everything that follows.

### File 5: `src/types/config.ts`

```typescript
export interface WaypointConfig {
  CLAUDE_API_KEY: string;
  CLAUDE_MODEL: string;
  GENSPARK_API_KEY: string;
  GITHUB_ENTERPRISE_URL: string;
  GITHUB_TOKEN: string;
  GITHUB_ORG: string;
  JIRA_BASE_URL: string;
  JIRA_TOKEN: string;
  CONFLUENCE_BASE_URL: string;
  CONFLUENCE_TOKEN: string;
}
```

### File 6: `src/types/messages.ts`

Define discriminated unions for all message types between the 3 contexts:

```typescript
// Background message types (sidepanel/content → background)
export type BackgroundMessage =
  | { type: 'BG_START'; url: string }
  | { type: 'BG_PAGE_LOADED'; url: string; tabId: number }
  | { type: 'BG_ACTION'; action: RecordedAction }
  | { type: 'BG_GET' }
  | { type: 'BG_STOP' }
  | { type: 'BG_RESET' }
  | { type: 'EXECUTE_ACTION'; action: string; selector?: string; value?: string; url?: string; [key: string]: unknown }
  | { type: 'GET_ACTIVE_TAB_URL' }
  | { type: 'CAPTURE_SCREENSHOT' }
  | { type: 'GET_ALL_TABS' }
  | { type: 'SWITCH_TO_TAB'; urlPattern: string }
  | { type: 'OPEN_OR_SWITCH_TAB'; url: string; urlPattern: string }
  | { type: 'READ_TAB_FIELDS'; urlPattern: string }
  | { type: 'READ_TAB_CONTENT'; tabId?: number; urlPattern?: string };

// Content script message types (background → content)
export type ContentMessage =
  | { action: 'startRecording' }
  | { action: 'resumeRecording' }
  | { action: 'stopRecording' }
  | { action: 'click'; selector: string }
  | { action: 'fill'; selector: string; value: string }
  | { action: 'waitAndClick'; selector: string }
  | { action: 'waitAndFill'; selector: string; value: string }
  | { action: 'navigate'; url: string }
  | { action: 'getPageContent' }
  | { action: 'extractDataFields' }
  | { action: 'getPageText' }
  | { action: 'getPageUrl' };

// Recorded action from content.js event capture
export interface RecordedAction {
  type: 'click' | 'fill' | 'navigate';
  selector?: string;
  text?: string;
  value?: string;
  placeholder?: string;
  url?: string;
  timestamp: number;
}

// Page content extracted by content.js
export interface PageContent {
  url: string;
  title: string;
  headings: string[];
  buttons: string[];
  inputs: string[];
  links: string[];
  bodyText: string;
}

// Lightweight tab info
export interface TabInfo {
  id: number;
  title: string;
  url: string;
}
```

### File 7: `src/types/actions.ts`

```typescript
// Individual step in an action plan
export interface ActionStep {
  action: 'navigate' | 'click' | 'fill' | 'switch_tab' | 'read_tab' |
          'open_tab' | 'ask_user' | 'confirm' | 'wait';
  selector?: string;
  url?: string;
  url_pattern?: string;
  value?: string;
  question?: string;
  variableName?: string;
  ms?: number;
  description: string;
}

// Complete action plan returned by Claude
export interface ActionPlan {
  type: 'action_plan';
  summary: string;
  steps: ActionStep[];
}

// Saved workflow
export interface Workflow {
  id: number;
  name: string;
  actions: RecordedAction[];
  savedAt: string;
  source: 'recording' | 'ai-plan' | 'manual';
}

// Knowledge Base document
export interface KBDocument {
  id: number;
  name: string;
  content: string;
}

// Agent definition
export interface AgentDef {
  id: number;
  name: string;
  role: string;
  systemPrompt: string;
  maxTokens: number;
}

// Site identified by Site Selector agent
export interface IdentifiedSite {
  url: string;
  name: string;
  purpose: string;
}

// Tab context from DOM Reader agent
export interface TabContext {
  url: string;
  pageContent: PageContent | null;
  dataFields: Record<string, string>;
  pageInsight: string;
}
```

Import `RecordedAction` and `PageContent` from `messages.ts` in the actual code.

### File 8: `src/types/state.ts`

```typescript
import type { KBDocument, AgentDef, ActionPlan, TabContext } from './actions';
import type { RecordedAction, TabInfo } from './messages';

export interface AppState {
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  kbDocuments: KBDocument[];
  agentDefs: AgentDef[];
  recordedActions: RecordedAction[];
  isRecording: boolean;
  isAgentRunning: boolean;
  piiMaskEnabled: boolean;
  pendingPlan: ActionPlan | null;
  pendingResume: ((value: string) => void) | null;
  pollInterval: ReturnType<typeof setInterval> | null;
  variables: Record<string, string>;
  openTabs: TabInfo[];
  pendingScenario: boolean;
}
```

### Verification

```bash
npm run typecheck    # should pass with 0 errors
```

---

## Phase 2 — Config + Background Service Worker

**Goal:** Build the runtime config and the background service worker. After this phase, the extension loads in Chrome with a working message router.

### File 9: `src/manifest.json`

Same as CLAUDE.md spec. Key change: if using `vite-plugin-web-extension`, the manifest points to `.ts` source files and the plugin rewrites them to `.js` in the build output.

```json
{
  "manifest_version": 3,
  "name": "Waypoint",
  "version": "2.0",
  "description": "AI-powered browser agent — navigate, understand, and get things done across any web app.",
  "permissions": ["activeTab", "scripting", "tabs", "sidePanel", "storage"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.ts" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.ts"],
    "run_at": "document_idle"
  }],
  "side_panel": { "default_path": "sidepanel/index.html" },
  "action": { "default_title": "Open Waypoint" },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.anthropic.com https://api.genspark.ai https:;"
  }
}
```

**NOTE:** If NOT using `vite-plugin-web-extension`, change `.ts` references to `.js` and ensure the build copies/transforms correctly.

### File 10: `src/config.ts`

```typescript
import type { WaypointConfig } from './types/config';

// Runtime config — mutated by settings save/load
export const config: WaypointConfig = {
  CLAUDE_API_KEY: '',
  CLAUDE_MODEL: 'claude-sonnet-4-6',
  GENSPARK_API_KEY: '',
  GITHUB_ENTERPRISE_URL: '',
  GITHUB_TOKEN: '',
  GITHUB_ORG: '',
  JIRA_BASE_URL: '',
  JIRA_TOKEN: '',
  CONFLUENCE_BASE_URL: '',
  CONFLUENCE_TOKEN: '',
};
```

No more `defaults.js`/`config.js` dual-file pattern — TypeScript modules handle this cleanly. The sidepanel imports `config` and mutates it on settings load.

### File 11: `src/background.ts`

Full service worker implementation. Handle all 14 message types from CLAUDE.md.

**Structure:**

```typescript
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
      files: ['content.js'],   // built output filename
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

// --- Message Router ---
chrome.runtime.onMessage.addListener(
  (msg: BackgroundMessage, sender, sendResponse) => {
    // Handle each message type...
    // MUST return true for async handlers
    handleMessage(msg, sender, sendResponse);
    return true;  // keep channel open for all handlers
  }
);

async function handleMessage(
  msg: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  switch (msg.type) {
    case 'BG_START': { /* ... */ break; }
    case 'BG_PAGE_LOADED': { /* ... */ break; }
    case 'BG_ACTION': { /* ... */ break; }
    case 'BG_GET': { /* ... */ break; }
    case 'BG_STOP': { /* ... */ break; }
    case 'BG_RESET': { /* ... */ break; }
    case 'EXECUTE_ACTION': { /* ... */ break; }
    case 'GET_ACTIVE_TAB_URL': { /* ... */ break; }
    case 'CAPTURE_SCREENSHOT': { /* ... */ break; }
    case 'GET_ALL_TABS': { /* ... */ break; }
    case 'SWITCH_TO_TAB': { /* ... */ break; }
    case 'OPEN_OR_SWITCH_TAB': { /* ... */ break; }
    case 'READ_TAB_FIELDS': { /* ... */ break; }
    case 'READ_TAB_CONTENT': { /* ... */ break; }
  }
}

// --- Open side panel on icon click ---
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) chrome.sidePanel.open({ tabId: tab.id });
});
```

Each `case` implements the exact logic from CLAUDE.md's message type table. The TypeScript discriminated union on `msg.type` gives autocomplete and type narrowing for each case.

**Key handler details (same logic as vanilla JS plan, now type-safe):**

- `EXECUTE_ACTION`: Special-case `navigate` (use `chrome.tabs.update`), others go through `ensureContentScript` -> 150ms delay -> `chrome.tabs.sendMessage`
- `SWITCH_TO_TAB`: `findTabByPattern` -> `chrome.tabs.update(tabId, {active:true})` + `chrome.windows.update(windowId, {focused:true})`
- `READ_TAB_FIELDS` / `READ_TAB_CONTENT`: `findTabByPattern` -> `ensureContentScript` -> `chrome.tabs.sendMessage` with extractDataFields/getPageContent

### Verification

```bash
npm run build
# Load dist/ in chrome://extensions
# Click "Service worker" link → console should show no errors
```

---

## Phase 3 — Content Script

**Goal:** Build `content.ts` — injected into every web page for event capture and DOM execution.

### File 12: `src/content.ts`

Same logic as CLAUDE.md spec, now with types. Since this runs as an IIFE in page context, it can't import from other modules at runtime — all types are used only for development-time checking.

**Structure:**

```typescript
// This file is bundled as IIFE — no runtime imports
// Use inline type annotations only

(function () {
  // IMPORTANT: Use `const w = window as any` to avoid TS strict-mode errors
  // with `Record<string, unknown>` cast on Window. The `any` cast is safe here
  // since this is a guard variable, not a typed API.
  const w = window as any;
  if (w.__waypointLoaded) return;
  w.__waypointLoaded = true;

  // --- Helpers ---
  function getBestSelector(el: Element): string { /* ... */ }
  function getVisibleText(el: Element): string { /* ... */ }
  function sendAction(action: Record<string, unknown>): void { /* ... */ }

  // --- Recording ---
  function attachRecorder(): void { /* ... */ }
  function detachRecorder(): void { /* ... */ }
  function onClickCapture(e: MouseEvent): void { /* ... */ }
  function onInputCapture(e: Event): void { /* ... */ }

  // --- Page Content Extraction ---
  function extractPageContent(): Record<string, unknown> { /* ... */ }

  // --- Message Handler ---
  chrome.runtime.onMessage.addListener(
    (msg: any, _sender: any, sendResponse: (r: unknown) => void) => {
      const action = msg.action || msg.type;
      switch (action) {
        case 'startRecording': /* ... */ break;
        case 'resumeRecording': /* ... */ break;
        case 'stopRecording': /* ... */ break;
        case 'click': /* ... */ break;
        case 'fill': /* ... */ break;
        case 'waitAndClick': /* ... */ break;
        case 'waitAndFill': /* ... */ break;
        case 'navigate': /* ... */ break;
        case 'getPageContent': /* ... */ break;
        case 'extractDataFields': /* ... */ break;
        case 'getPageText': /* ... */ break;
        case 'getPageUrl': /* ... */ break;
      }
      return true;
    }
  );

  // --- On-Load: Signal to background ---
  try {
    chrome.runtime.sendMessage({ type: 'BG_PAGE_LOADED', url: location.href });
  } catch { /* extension context invalidated */ }
})();
```

**Implementation details are identical to the CLAUDE.md spec** — see the "Content.js DOM Commands" section for each action's behavior. The TypeScript version adds type annotations to function signatures but the runtime logic is the same.

### File 13: `src/demo-bridge.ts`

Same IIFE pattern with `__waypointDemoBridgeLoaded` guard. Implements `extractPageContent()`, `getBestSelector()`, and the message handler for DOM read/write only (no recording). Used by demo HTML pages hosted on chrome-extension:// URLs.

### Verification

```bash
npm run build
# Reload extension, open any page, F12 console:
# > window.__waypointLoaded   → true
```

---

## Phase 4 — Side Panel UI (HTML + CSS)

**Goal:** Build the sidepanel HTML structure and dark theme CSS.

### File 14: `src/sidepanel/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Waypoint</title>
  <link rel="stylesheet" href="./sidepanel.css">
</head>
<body>
  <!-- HEADER -->
  <!-- RECORDING BAR -->
  <!-- CHAT AREA (with welcome card) -->
  <!-- SPINNER -->
  <!-- APPROVAL CARD -->
  <!-- INPUT AREA -->
  <!-- PANELS: workflows, datasource, agents, kb, settings -->

  <script type="module" src="./main.ts"></script>
</body>
</html>
```

**Key difference from vanilla JS:** The script tag uses `type="module"` and points to `main.ts`. Vite handles the TS→JS transform and bundling.

**All HTML element IDs remain identical to the CLAUDE.md spec** — see the full element ID list in CLAUDE.md under "UI Panels". Every `#id` referenced by the JS logic must exist in this HTML.

### File 15: `src/sidepanel/sidepanel.css`

Identical to CLAUDE.md CSS spec. Dark theme with CSS custom properties:

```css
:root {
  --bg: #0a0d16;
  --bg2: #12151f;
  --bg3: #1a1d2e;
  --border: #242840;
  --accent: #7c6ff7;
  --text: #e2e8f0;
  --text-muted: #8892b0;
  --green: #26de81;
  --red: #ff4757;
}
```

Same component styles as before: header, badges, icon buttons, recording bar, side panels, KB/agents panels, chat area, chat bubbles, approval card, buttons, input area, spinner, workflow/datasource panels, welcome screen.

### Verification

```bash
npm run build
# Reload extension → click icon → dark-themed sidepanel opens
# All structural elements visible (non-functional until Phase 5)
```

---

## Phase 5 — Side Panel Logic (TypeScript Modules)

**Goal:** Build all sidepanel application logic as focused TypeScript modules. This replaces the monolithic `sidepanel.js` (~2280 lines) with ~18 smaller, typed modules.

### Module Dependency Graph

```
main.ts (entry point)
  ├── state.ts              (app state singleton)
  ├── settings.ts           (save/load settings)
  │     └── config.ts       (runtime config)
  ├── panels.ts             (toggle panels)
  ├── agents.ts             (agent CRUD)
  │     └── state.ts
  ├── kb.ts                 (knowledge base)
  │     └── state.ts
  ├── pii.ts                (PII masking)
  ├── claude.ts             (API client)
  │     └── config.ts
  ├── chat-ui.ts            (render messages)
  │     └── pii.ts
  ├── chat-handler.ts       (send handler + agent core)
  │     ├── claude.ts
  │     ├── chat-ui.ts
  │     ├── system-prompt.ts
  │     ├── plan-parser.ts
  │     ├── approval.ts
  │     ├── cross-tab.ts
  │     └── kb.ts
  ├── system-prompt.ts      (build system prompt)
  ├── plan-parser.ts        (parse action_plan JSON)
  ├── approval.ts           (approval card UI)
  │     └── executor.ts
  ├── executor.ts           (plan execution engine)
  │     ├── cross-tab.ts
  │     └── chat-ui.ts
  ├── cross-tab.ts          (tab helpers + variable sub)
  │     └── state.ts
  ├── demo.ts               (hardcoded demo)
  │     ├── approval.ts
  │     └── cross-tab.ts
  ├── scenario.ts           (multi-agent pipeline)
  │     ├── claude.ts
  │     ├── agents.ts
  │     ├── kb.ts
  │     ├── cross-tab.ts
  │     └── approval.ts
  ├── recording.ts          (workflow recording)
  ├── workflows.ts          (workflow management)
  └── csv.ts                (CSV auto-fill)
```

---

### Module 1: `src/sidepanel/state.ts`

```typescript
import type { AppState } from '../types/state';

export const state: AppState = {
  conversationHistory: [],
  kbDocuments: [],
  agentDefs: [],
  recordedActions: [],
  isRecording: false,
  isAgentRunning: false,
  piiMaskEnabled: true,
  pendingPlan: null,
  pendingResume: null,
  pollInterval: null,
  variables: {},
  openTabs: [],
  pendingScenario: false,
};
```

### Module 2: `src/sidepanel/settings.ts`

```typescript
import { config } from '../config';
import { state } from './state';

export async function loadSettings(): Promise<void> {
  const { wp_settings } = await chrome.storage.local.get('wp_settings');
  if (!wp_settings) return;
  // Populate DOM fields + update config object + state.piiMaskEnabled
}

export async function saveSettings(): Promise<void> {
  // Read from DOM → chrome.storage.local.set → update config
}

export function initSettings(): void {
  document.getElementById('btn-settings-save')
    ?.addEventListener('click', saveSettings);
}
```

### Module 3: `src/sidepanel/panels.ts`

```typescript
type PanelKey = 'wf' | 'ds' | 'agents' | 'kb' | 'settings';

const PANEL_MAP: Record<PanelKey, string> = {
  wf: 'workflows-panel',
  ds: 'datasource-panel',
  agents: 'agents-panel',
  kb: 'kb-panel',
  settings: 'settings-panel',
};

let currentPanel: PanelKey | null = null;

export function togglePanel(which: PanelKey | null): void {
  // Toggle hidden class on all panels, toggle active on buttons
}

export function initPanels(): void {
  // Wire all toggle + close buttons
}
```

### Module 4: `src/sidepanel/agents.ts`

```typescript
import type { AgentDef } from '../types/actions';
import { state } from './state';

const DEFAULT_AGENTS: AgentDef[] = [
  // 5 default agents with exact system prompts from CLAUDE.md
];

export async function loadAgents(): Promise<void> { /* ... */ }
export async function saveAgents(): Promise<void> { /* ... */ }
export function getAgentDef(role: string): AgentDef | undefined { /* ... */ }
export function renderAgentList(): void { /* ... */ }
export function initAgents(): void { /* wire #btn-agent-add */ }
```

### Module 5: `src/sidepanel/kb.ts`

```typescript
import type { KBDocument } from '../types/actions';
import { state } from './state';

export async function loadKB(): Promise<void> { /* ... */ }
export async function saveKB(): Promise<void> { /* ... */ }
export function kbContextFor(query: string): string { /* keyword match, return top 2 */ }
export function renderKBList(): void { /* ... */ }
export function initKB(): void { /* wire #btn-kb-add */ }
```

### Module 6: `src/sidepanel/pii.ts`

```typescript
interface PIIPattern {
  regex: RegExp;
  token: string;
}

const PII_PATTERNS: PIIPattern[] = [
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, token: '[EMAIL]' },
  { regex: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, token: '[PHONE]' },
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, token: '[SSN]' },
  { regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, token: '[CARD_NUM]' },
  { regex: /\b[A-Z]{1,2}\d{6,9}\b/g, token: '[PASSPORT]' },
];

export function maskPII(text: string): string { /* ... */ }
export function hasPII(text: string): boolean { /* ... */ }
```

### Module 7: `src/sidepanel/claude.ts`

```typescript
import { config } from '../config';

interface ClaudeCallParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system: string;
  maxTokens?: number;
}

export async function claudeCall({ messages, system, maxTokens = 2048 }: ClaudeCallParams): Promise<string> {
  if (!config.CLAUDE_API_KEY.startsWith('sk-ant-')) {
    throw new Error('Invalid Claude API key. Set it in Settings.');
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.content[0].text;
}
```

### Modules 8-18: Remaining Sidepanel Modules

Each module corresponds to a section from the original monolithic plan. The logic is identical — only the organization changes.

| Module | File | Corresponds To | Key Exports |
|--------|------|----------------|-------------|
| 8 | `chat-ui.ts` | Section 9 | `escHtml()`, `renderMarkdown()`, `addUserMsg()`, `addAssistantMsg()`, `addSystemMsg()` |
| 9 | `chat-handler.ts` | Sections 11-12 | `handleSend()`, `runAgent()`, `initChatHandler()` |
| 10 | `system-prompt.ts` | Section 13 | `buildSystemPrompt()` |
| 11 | `plan-parser.ts` | Section 14 | `tryParseActionPlan()`, `trimHistory()` |
| 12 | `approval.ts` | Section 15 | `showApprovalCard()`, `hideApprovalCard()`, `initApproval()` |
| 13 | `executor.ts` | Section 16 | `executePlan()`, `executeStep()`, `waitForUserInput()`, `sleep()`, `waitForTabLoad()` |
| 14 | `cross-tab.ts` | Section 17 | `getOpenTabs()`, `subVars()`, `sendToBackground()` |
| 15 | `demo.ts` | Section 18 | `DEMO_RECOVERY_PLAN`, `launchDemo()`, `launchDemoAI()`, `initDemo()` |
| 16 | `scenario.ts` | Section 19 | `buildScenarioPlan()`, `OrchestratorAgent()`, `SiteSelectorAgent()`, `DOMReaderAgent()`, `PlanGeneratorAgent()`, `initScenario()` |
| 17 | `recording.ts` | Section 20 | `initRecording()` |
| 18 | `workflows.ts` | Section 21 | `loadWorkflows()`, `renderWorkflowList()`, `initWorkflows()` |
| 19 | `csv.ts` | Section 22 | `parseCSV()`, `initCSV()` |

The implementation logic for each module is **exactly as described in the CLAUDE.md spec and the section-by-section breakdown**. The only change is that functions are now exported from modules instead of being globals, and they import their dependencies explicitly.

### Module 20: `src/sidepanel/main.ts` (Entry Point)

```typescript
import { loadSettings, initSettings } from './settings';
import { initPanels } from './panels';
import { loadAgents, renderAgentList, initAgents } from './agents';
import { loadKB, renderKBList, initKB } from './kb';
import { initChatHandler } from './chat-handler';
import { initApproval } from './approval';
import { initDemo } from './demo';
import { initScenario } from './scenario';
import { initRecording } from './recording';
import { initWorkflows } from './workflows';
import { initCSV } from './csv';

async function init(): Promise<void> {
  // Load persisted data
  await loadSettings();
  await loadKB();
  await loadAgents();

  // Render initial UI
  renderKBList();
  renderAgentList();

  // Wire up all event handlers
  initSettings();
  initPanels();
  initAgents();
  initKB();
  initChatHandler();
  initApproval();
  initDemo();
  initScenario();
  initRecording();
  initWorkflows();
  initCSV();
}

document.addEventListener('DOMContentLoaded', init);
```

### Verification

```bash
npm run build
# Reload extension → open sidepanel
# Test: Settings save/load, KB add/delete, chat with Claude, demo launch
```

---

## Phase 6 — Demo Server + Demo Pages

**Goal:** Build the Node/Express demo server and 4 demo HTML pages. Replaces the Python `http.server` approach with a single `npm run demo` command.

### File 21: `demo/server.ts`

```typescript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = path.join(__dirname, 'public');

// Port 3000 — External systems (StaySG Hotels)
const external = express();
external.use(express.static(DEMO_DIR));
external.listen(3000, () => {
  console.log('StaySG Hotels Portal:      http://localhost:3000/hotel-portal.html');
});

// Port 3001 — Internal systems (SilverOS)
const internal = express();
internal.use(express.static(DEMO_DIR));
internal.listen(3001, () => {
  console.log('SilverOS Flight Schedule:  http://localhost:3001/flight-schedule.html');
  console.log('SilverOS Passenger List:   http://localhost:3001/passenger-manifest.html');
  console.log('SilverOS CRM Email:        http://localhost:3001/crm-email.html');
});
```

**Usage:**
```bash
npm run demo          # starts both servers
# OR
npm run dev           # starts Vite watch + both demo servers
```

### File 22-25: Demo HTML Pages

All 4 demo pages live in `demo/public/` and are identical to the CLAUDE.md spec:

| File | Port | Purpose | Key Elements |
|------|------|---------|-------------|
| `flight-schedule.html` | 3001 | Read-only ops dashboard | SQ321 delayed row, no forms |
| `passenger-manifest.html` | 3001 | Data source | `data-waypoint-field` attributes on James Lim row |
| `hotel-portal.html` | 3000 | 3-step booking form | `#hotel-location`, `#btn-hotel-search`, `#btn-book-crowne`, `#booking-guest-*`, `#btn-confirm-booking` |
| `crm-email.html` | 3001 | Email compose | `#crm-email-to`, `#crm-email-subject`, `#crm-email-body`, `#btn-crm-send` |

**Note on demo-bridge.js:** Demo pages reference the built `demo-bridge.js` from the extension's `dist/` folder. Since demo pages are served from localhost (not chrome-extension://), they actually use the regular `content.ts` injection — so `demo-bridge.ts` is only needed if you serve demo pages from the extension itself. For the localhost approach, the content script auto-injects and `demo-bridge.ts` is a fallback.

### Verification

```bash
npm run demo
# Open http://localhost:3000/hotel-portal.html — search/book/confirm flow works
# Open http://localhost:3001/passenger-manifest.html — passenger data visible
# Open F12 console on passenger-manifest:
# > Object.fromEntries([...document.querySelectorAll('[data-waypoint-field]')].map(el => [el.dataset.waypointField, el.textContent.trim()]))
# → { passenger-name: "James Lim Wei Ming", ... }
```

---

## Phase 7 — Automated Tests (Vitest)

**Goal:** Set up Vitest with Chrome API mocks. Write unit tests for pure logic and integration tests for modules that use `chrome.*` APIs.

### Why Vitest works for Chrome extensions

Vitest runs in Node, not in a browser. Chrome extension APIs (`chrome.storage`, `chrome.tabs`, etc.) don't exist in Node. The solution:

1. **Pure logic modules** (no Chrome APIs) — test directly, no mocking needed
2. **Chrome-dependent modules** — provide a mock `chrome` global before each test

No special library required — just a ~60-line mock setup file.

### File: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,                    // describe/it/expect without imports
    environment: 'node',
    setupFiles: ['./test/setup.ts'],  // runs before every test file
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/types/**', 'src/content.ts', 'src/demo-bridge.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

**Notes:**
- `content.ts` and `demo-bridge.ts` are excluded from coverage — they're IIFE bundles with DOM-dependent code that's hard to test in Node. Test those via manual browser testing.
- `globals: true` enables `describe`, `it`, `expect` without importing them.

### File: `test/chrome-mock.ts` — Typed Chrome API Stubs

This is the core of Chrome extension testing. Provides a fake `chrome` namespace that tracks calls and returns configurable responses.

```typescript
// Minimal typed mock for Chrome extension APIs used by Waypoint

type Listener = (...args: any[]) => void;

function createEventMock() {
  const listeners: Listener[] = [];
  return {
    addListener: (fn: Listener) => listeners.push(fn),
    removeListener: (fn: Listener) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    hasListeners: () => listeners.length > 0,
    // Test helper: fire all registered listeners
    _fire: (...args: any[]) => listeners.forEach(fn => fn(...args)),
    _listeners: listeners,
  };
}

// In-memory store for chrome.storage.local
let storageData: Record<string, unknown> = {};

export function createChromeMock() {
  storageData = {};

  return {
    runtime: {
      sendMessage: vi.fn((_msg: unknown, callback?: (r: unknown) => void) => {
        callback?.({ ok: true });
      }),
      onMessage: createEventMock(),
      getURL: vi.fn((path: string) => `chrome-extension://fake-id/${path}`),
    },

    storage: {
      local: {
        get: vi.fn((keys: string | string[]) => {
          if (typeof keys === 'string') {
            return Promise.resolve({ [keys]: storageData[keys] });
          }
          const result: Record<string, unknown> = {};
          for (const k of keys) result[k] = storageData[k];
          return Promise.resolve(result);
        }),
        set: vi.fn((items: Record<string, unknown>) => {
          Object.assign(storageData, items);
          return Promise.resolve();
        }),
        remove: vi.fn((keys: string | string[]) => {
          const arr = typeof keys === 'string' ? [keys] : keys;
          for (const k of arr) delete storageData[k];
          return Promise.resolve();
        }),
      },
    },

    tabs: {
      query: vi.fn(() => Promise.resolve([])),
      update: vi.fn(() => Promise.resolve({})),
      create: vi.fn(() => Promise.resolve({ id: 999 })),
      sendMessage: vi.fn(() => Promise.resolve({ success: true })),
    },

    windows: {
      update: vi.fn(() => Promise.resolve({})),
    },

    scripting: {
      executeScript: vi.fn(() => Promise.resolve([{ result: true }])),
    },

    action: {
      onClicked: createEventMock(),
    },

    sidePanel: {
      open: vi.fn(() => Promise.resolve()),
    },
  };
}

// Helper: pre-seed storage for tests
export function seedStorage(data: Record<string, unknown>) {
  storageData = { ...data };
}

// Helper: get raw storage state for assertions
export function getStorageData() {
  return { ...storageData };
}
```

### File: `test/setup.ts` — Global Setup

```typescript
import { createChromeMock } from './chrome-mock';

// Install chrome mock as a global before each test
beforeEach(() => {
  const mock = createChromeMock();
  (globalThis as any).chrome = mock;
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

This runs before every test file. Each test gets a fresh `chrome` mock with empty storage and clean spy history.

---

### Unit Tests (no Chrome APIs — pure logic)

These modules have zero Chrome dependencies and are the easiest to test:

#### `test/unit/pii.test.ts`

```typescript
import { maskPII, hasPII } from '@/sidepanel/pii';

describe('maskPII', () => {
  it('masks email addresses', () => {
    expect(maskPII('contact test@example.com now'))
      .toBe('contact [EMAIL] now');
  });

  it('masks phone numbers', () => {
    expect(maskPII('call (555) 123-4567'))
      .toBe('call [PHONE]');
  });

  it('masks SSNs', () => {
    expect(maskPII('SSN: 123-45-6789'))
      .toBe('SSN: [SSN]');
  });

  it('masks credit card numbers', () => {
    expect(maskPII('card 4111 1111 1111 1111'))
      .toBe('card [CARD_NUM]');
  });

  it('masks passport numbers', () => {
    expect(maskPII('passport E12345678'))
      .toBe('passport [PASSPORT]');
  });

  it('leaves clean text unchanged', () => {
    expect(maskPII('hello world')).toBe('hello world');
  });

  it('masks multiple PII types in one string', () => {
    const input = 'Email test@x.com, phone (555) 123-4567';
    const result = maskPII(input);
    expect(result).toContain('[EMAIL]');
    expect(result).toContain('[PHONE]');
    expect(result).not.toContain('test@x.com');
  });
});

describe('hasPII', () => {
  it('returns true when PII is present', () => {
    expect(hasPII('test@example.com')).toBe(true);
  });

  it('returns false for clean text', () => {
    expect(hasPII('hello world')).toBe(false);
  });
});
```

#### `test/unit/plan-parser.test.ts`

```typescript
import { tryParseActionPlan } from '@/sidepanel/plan-parser';

describe('tryParseActionPlan', () => {
  it('parses valid action plan JSON from Claude response', () => {
    const text = 'Here is the plan: {"type":"action_plan","summary":"Test","steps":[{"action":"click","selector":"#btn","description":"Click it"}]}';
    const plan = tryParseActionPlan(text);
    expect(plan).not.toBeNull();
    expect(plan!.type).toBe('action_plan');
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].action).toBe('click');
  });

  it('returns null for plain text responses', () => {
    expect(tryParseActionPlan('This page is about hotels.')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(tryParseActionPlan('{"type":"action_plan", broken')).toBeNull();
  });

  it('returns null if type is not action_plan', () => {
    expect(tryParseActionPlan('{"type":"other","steps":[]}')).toBeNull();
  });

  it('handles nested braces in step values', () => {
    const text = '{"type":"action_plan","summary":"Test","steps":[{"action":"fill","selector":"#x","value":"obj = {}","description":"Fill"}]}';
    const plan = tryParseActionPlan(text);
    expect(plan).not.toBeNull();
    expect(plan!.steps[0].value).toBe('obj = {}');
  });
});
```

#### `test/unit/cross-tab.test.ts`

```typescript
import { subVars } from '@/sidepanel/cross-tab';

describe('subVars', () => {
  // NOTE: subVars reads from state.variables — test with state pre-seeded

  it('replaces {{variable}} with state value', () => {
    // Assumes subVars accepts variables map or reads from state
    // Adjust based on actual implementation signature
  });

  it('leaves {{unknown}} as-is when variable not found', () => {
    // ...
  });

  it('returns non-string inputs unchanged', () => {
    expect(subVars(undefined as any)).toBeUndefined();
    expect(subVars(null as any)).toBeNull();
  });

  it('replaces multiple variables in one string', () => {
    // ...
  });
});
```

#### `test/unit/csv.test.ts`

```typescript
import { parseCSV } from '@/sidepanel/csv';

describe('parseCSV', () => {
  it('parses simple CSV', () => {
    const rows = parseCSV('name,email\nAlice,a@b.com\nBob,b@c.com');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: 'Alice', email: 'a@b.com' });
    expect(rows[1]).toEqual({ name: 'Bob', email: 'b@c.com' });
  });

  it('handles quoted fields with commas', () => {
    const rows = parseCSV('name,address\n"Doe, John","123 Main St, Apt 4"');
    expect(rows[0].name).toBe('Doe, John');
    expect(rows[0].address).toBe('123 Main St, Apt 4');
  });

  it('handles CRLF line endings', () => {
    const rows = parseCSV('a,b\r\n1,2\r\n3,4');
    expect(rows).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(parseCSV('')).toEqual([]);
  });

  it('handles header-only CSV', () => {
    expect(parseCSV('name,email')).toEqual([]);
  });
});
```

#### `test/unit/kb.test.ts`

```typescript
import { kbContextFor } from '@/sidepanel/kb';

describe('kbContextFor', () => {
  // NOTE: kbContextFor reads from state.kbDocuments
  // Pre-seed state before testing, or refactor to accept docs as param

  it('returns matching KB docs for relevant query', () => {
    // ...
  });

  it('returns empty string when no docs match', () => {
    // ...
  });

  it('returns top 2 docs ranked by keyword overlap', () => {
    // ...
  });
});
```

---

### Integration Tests (use Chrome API mocks)

These test modules that call `chrome.storage.local`, `chrome.runtime.sendMessage`, etc. The mocks from `test/setup.ts` are automatically available.

#### `test/integration/settings.test.ts`

```typescript
import { loadSettings, saveSettings } from '@/sidepanel/settings';
import { config } from '@/config';
import { seedStorage } from '../chrome-mock';

// Mock DOM elements that settings.ts reads/writes
beforeEach(() => {
  document.body.innerHTML = `
    <input id="setting-claude-key" value="" />
    <input id="setting-claude-model" value="" />
    <input id="setting-pii-mask" type="checkbox" />
  `;
});

describe('loadSettings', () => {
  it('populates config from stored settings', async () => {
    seedStorage({
      wp_settings: {
        claudeKey: 'sk-ant-test-key',
        claudeModel: 'claude-sonnet-4-6',
        piiMask: true,
      },
    });

    await loadSettings();

    expect(config.CLAUDE_API_KEY).toBe('sk-ant-test-key');
    expect(config.CLAUDE_MODEL).toBe('claude-sonnet-4-6');
  });

  it('handles empty storage gracefully', async () => {
    await loadSettings();  // should not throw
    expect(config.CLAUDE_API_KEY).toBe('');
  });
});

describe('saveSettings', () => {
  it('persists settings to chrome.storage.local', async () => {
    const input = document.getElementById('setting-claude-key') as HTMLInputElement;
    input.value = 'sk-ant-new-key';

    await saveSettings();

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        wp_settings: expect.objectContaining({ claudeKey: 'sk-ant-new-key' }),
      })
    );
  });
});
```

**Note on DOM in Vitest:** Vitest uses `node` environment by default (no DOM). For tests that manipulate `document`, either:
- Use `// @vitest-environment jsdom` comment at the top of those specific test files
- Or set `environment: 'jsdom'` in vitest.config for integration tests

**Recommended approach:** Use `// @vitest-environment jsdom` comment at the top of individual integration test files that need DOM access, rather than `environmentMatchGlobs` (which is deprecated in Vitest 3.x):

```typescript
// test/integration/settings.test.ts
// @vitest-environment jsdom
import { loadSettings, saveSettings } from '@/sidepanel/settings';
// ... tests that manipulate document.body
```

> **NOTE:** `environmentMatchGlobs` was deprecated in Vitest 3.x. Use `test.projects` or per-file `@vitest-environment` comments instead.

And add `jsdom` to devDependencies:
```
"jsdom": "^26.0.0"
```

#### `test/integration/agents.test.ts`

```typescript
import { loadAgents, saveAgents, getAgentDef } from '@/sidepanel/agents';
import { state } from '@/sidepanel/state';

describe('loadAgents', () => {
  it('seeds default agents when storage is empty', async () => {
    await loadAgents();
    expect(state.agentDefs.length).toBeGreaterThanOrEqual(5);
    expect(getAgentDef('orchestrator')).toBeDefined();
    expect(getAgentDef('plan_generator')).toBeDefined();
  });

  it('loads agents from storage when present', async () => {
    // Pre-seed storage with custom agents, verify they load
  });

  it('merges missing default agents on load', async () => {
    // Store only 3 of 5 defaults, verify all 5 present after load
  });
});
```

#### `test/integration/claude.test.ts`

```typescript
import { claudeCall } from '@/sidepanel/claude';
import { config } from '@/config';

describe('claudeCall', () => {
  it('throws if API key is not set', async () => {
    config.CLAUDE_API_KEY = '';
    await expect(
      claudeCall({ messages: [{ role: 'user', content: 'hi' }], system: 'test' })
    ).rejects.toThrow('Invalid Claude API key');
  });

  it('throws if API key does not start with sk-ant-', async () => {
    config.CLAUDE_API_KEY = 'bad-key';
    await expect(
      claudeCall({ messages: [{ role: 'user', content: 'hi' }], system: 'test' })
    ).rejects.toThrow('Invalid Claude API key');
  });

  it('calls the Anthropic API with correct headers', async () => {
    config.CLAUDE_API_KEY = 'sk-ant-test-key-123';
    config.CLAUDE_MODEL = 'claude-sonnet-4-6';

    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: 'Hello!' }] }),
    });
    globalThis.fetch = mockFetch;

    const result = await claudeCall({
      messages: [{ role: 'user', content: 'hi' }],
      system: 'Be brief',
    });

    expect(result).toBe('Hello!');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-test-key-123',
          'anthropic-dangerous-direct-browser-access': 'true',
        }),
      })
    );
  });

  it('throws on non-200 response', async () => {
    config.CLAUDE_API_KEY = 'sk-ant-test-key-123';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limited'),
    });

    await expect(
      claudeCall({ messages: [{ role: 'user', content: 'hi' }], system: 'test' })
    ).rejects.toThrow('Claude API 429');
  });
});
```

#### `test/integration/background.test.ts`

```typescript
// Test background.ts message handler logic
// Import the handler function (may need to refactor background.ts
// to export handleMessage for testability)

describe('background message handler', () => {
  it('BG_START initializes recording', () => {
    // Fire BG_START message → verify recording state
  });

  it('BG_ACTION appends to recording', () => {
    // Fire BG_START → BG_ACTION → BG_GET → verify action in list
  });

  it('BG_STOP stops recording and returns actions', () => {
    // Fire BG_START → BG_ACTION × 3 → BG_STOP → verify all 3 returned
  });

  it('BG_RESET clears state', () => {
    // Fire BG_START → BG_ACTION → BG_RESET → BG_GET → verify empty
  });
});
```

**Testability tip:** Export `handleMessage` from `background.ts` so it can be called directly in tests without needing to simulate the full Chrome message listener. The file still registers the listener at the top level for Chrome, but tests call the function directly.

---

### Running Tests

```bash
npm test              # single run, all tests
npm run test:watch    # re-run on file change (great during development)
npm run test:coverage # generate coverage report
```

### Test Coverage Targets

| Module | Coverage Goal | Notes |
|--------|--------------|-------|
| `pii.ts` | 100% | Pure regex logic, easy to cover |
| `plan-parser.ts` | 100% | Pure JSON parsing |
| `csv.ts` | 90%+ | Pure parsing, test edge cases |
| `cross-tab.ts` | 90%+ | `subVars` is pure; `getOpenTabs` needs chrome mock |
| `claude.ts` | 90%+ | Mock `fetch`, test error paths |
| `settings.ts` | 80%+ | Chrome storage mock + DOM |
| `agents.ts` | 80%+ | Storage mock for CRUD |
| `kb.ts` | 80%+ | Storage mock + keyword search |
| `background.ts` | 70%+ | Complex message routing |
| `executor.ts` | 60%+ | Hard to test `sleep`/`waitForTabLoad` fully |

Modules NOT tested in Vitest (test manually in browser):
- `content.ts` — runs in page context, heavily DOM-dependent
- `demo-bridge.ts` — same reason
- `chat-ui.ts` — DOM rendering, verify visually
- `sidepanel.css` / `index.html` — visual

### Verification

```bash
npm test
# All tests pass, coverage report generated
```

---

## Phase 8 — Manual Integration Testing

### Test Checklist

**Extension Load:**
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] Load `dist/` at chrome://extensions — no errors
- [ ] Click icon → sidepanel opens with dark theme
- [ ] All 5 panels open/close correctly

**Settings:**
- [ ] Enter Claude API key → Save → Reload → key preserved
- [ ] PII mask toggle persists

**Knowledge Base:**
- [ ] Add KB entry → persists after reload
- [ ] Delete KB entry → gone after reload
- [ ] Empty KB auto-seeds with 4 demo systems on scenario run

**Chat Agent:**
- [ ] Navigate to any page, type "What is this page about?" → get text response
- [ ] Type "Click the first button" → get action plan with approval card
- [ ] Approve → plan executes

**Recording:**
- [ ] Start recording → click/type on a page → stop → actions captured
- [ ] Save workflow → persists → Replay → actions execute

**Demo Scenario (Hardcoded):**
- [ ] `npm run demo` starts both servers
- [ ] Click launch demo → 4 tabs open on localhost:3000/3001
- [ ] Approval card shows ~14 steps
- [ ] Approve → execution runs across all 4 tabs
- [ ] Passenger data flows from manifest to hotel form and CRM email

**AI Scenario Planner:**
- [ ] Click scenario chip → default scenario appears
- [ ] Send → pipeline: Orchestrator → Site Selector → DOM Reader → Plan Generator
- [ ] Each stage logs in chat
- [ ] Final plan appears in approval card with real selectors
- [ ] Approve → execution succeeds

**CSV Auto-Fill:**
- [ ] Upload CSV → preview renders → auto-mapping suggests selectors
- [ ] Run → forms fill row by row

---

## Build Order Summary

| Phase | What | Files | Can Test After |
|-------|------|-------|----------------|
| 0 | Scaffold + tooling | `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` | `npm run build` works |
| 1 | Type definitions | `src/types/*.ts` (4 files) | `npm run typecheck` passes |
| 2 | Config + background | `manifest.json`, `config.ts`, `background.ts` | Extension loads in Chrome |
| 3 | Content script | `content.ts`, `demo-bridge.ts` | Event capture + DOM commands |
| 4 | Sidepanel UI | `index.html`, `sidepanel.css` | UI renders in sidepanel |
| 5 | Sidepanel logic | `src/sidepanel/*.ts` (20 modules) | Full app functionality |
| 6 | Demo server + pages | `demo/server.ts`, 4 HTML files | Demo scenario works |
| 7 | Automated tests | `test/**/*.test.ts`, `chrome-mock.ts`, `setup.ts` | `npm test` passes |
| 8 | Manual integration | (no new files) | Everything verified end-to-end |

---

## AI Development Tips

1. **Use `/waypoint-bootstrap`** — the most comprehensive command, builds everything. Update it to reference the new TypeScript structure.

2. **Build one phase at a time.** Run `npm run build` and reload the extension after each phase.

3. **Run `npm run typecheck` frequently** — TypeScript catches bugs before they reach Chrome.

4. **Use `/waypoint-debug`** when something breaks.

5. **Use other `/waypoint-*` commands** for specific tasks (see `.claude/commands/`).

6. **The Vite build config is the trickiest part.** If `vite-plugin-web-extension` causes issues, fall back to a simpler multi-build approach with separate Vite configs for IIFE outputs.

7. **Test in the right DevTools context:**
   - Sidepanel → right-click sidepanel → Inspect
   - Background → chrome://extensions → Service worker link
   - Content script → F12 on target page

---

## Hackathon Shortcuts

If time is limited, prioritize:

1. **Must have:** Phases 0-4 + `claude.ts` + `demo.ts` = working demo
2. **Nice to have:** `scenario.ts` (multi-agent pipeline) = impressive AI demo
3. **Can skip for demo:** `recording.ts`, `workflows.ts`, `csv.ts`
4. **Can hardcode:** API key in `config.ts` instead of building Settings UI
5. **Can skip:** PII masking, error handling edge cases, loading spinners

---

## Key Differences from Vanilla JS Approach

| Aspect | Vanilla JS | TypeScript + Vite + Vitest |
|--------|-----------|----------------------------|
| Build step | None (Chrome loads raw JS) | `npm run build` → `dist/` |
| Type safety | None | Full — catches bugs at compile time |
| Module system | Global vars + script order | ES modules with explicit imports |
| sidepanel.js | 1 file, ~2280 lines | ~20 focused, testable modules |
| Config | `defaults.js` + `config.js` (load order matters) | Single `config.ts` module |
| Demo servers | `python -m http.server` (2 terminals) | `npm run demo` (1 command) |
| Dev workflow | Edit → reload extension | `npm run dev` (auto-rebuild on save) |
| Testing | Manual only | `npm test` — unit + integration with Chrome API mocks |
| Chrome loading | Load project folder directly | Load `dist/` folder |

---

## Implementation Notes & Known Fixes

These notes capture issues discovered during the first complete implementation. Apply them to avoid the same pitfalls.

### Fix 1: Vite Config — `root: 'src'` is mandatory

The `vite-plugin-web-extension` resolves manifest entry paths relative to the Vite `root`. Without `root: 'src'`, the plugin cannot find `sidepanel/index.html` and fails with:

```
error: Could not resolve entry module "sidepanel/index.html"
```

**Fix:** Set `root: 'src'` and adjust `outDir` to `'../dist'`. The manifest file path becomes `'manifest.json'` (relative to root).

### Fix 2: `window as any` pattern in content.ts

TypeScript strict mode rejects `(window as Record<string, unknown>).__waypointLoaded` because `Window & typeof globalThis` doesn't satisfy the `Record<string, unknown>` index signature. Use `const w = window as any` instead:

```typescript
const w = window as any;
if (w.__waypointLoaded) return;
w.__waypointLoaded = true;
```

### Fix 3: Claude Model ID

The model `claude-sonnet-4-5-20250514` returns a 404 from the Anthropic API. Use current model IDs:
- `claude-sonnet-4-6` (recommended default)
- `claude-opus-4-6` (most capable)
- `claude-haiku-4-5-20251001` (fastest)

Update `src/config.ts`, `sidepanel/index.html` (settings placeholder), and any test files.

### Fix 4: CSV Parser — preserve quotes during line splitting

The `parseCSV()` function splits text into lines, then splits each line into fields. The line-splitting pass must **preserve quote characters** in the output so the field-splitting pass (`parseLine`) can handle quoted commas correctly.

**Bug:** Stripping `"` characters during line splitting causes `"Doe, John"` to become `Doe, John` before field parsing — which then splits on the comma.

**Fix:** During line splitting, only track `inQuotes` for newline handling. Append all characters (including `"`) to `current`. Let `parseLine` handle quote stripping.

### Fix 5: Vitest `environmentMatchGlobs` is deprecated

In Vitest 3.x, `environmentMatchGlobs` triggers a deprecation warning. Instead, use per-file `// @vitest-environment jsdom` comments at the top of integration test files that need DOM access.

### Fix 6: PII phone regex doesn't match parenthesized area codes

The phone number regex `\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b` matches `555-123-4567` but not the opening `(` in `(555) 123-4567` because the `\b` word boundary doesn't match before `(`. Tests should use the format `555-123-4567` or the regex should be adjusted to handle parenthesized area codes.

### Fix 7: Brand Design System Integration

The sidepanel CSS should follow a structured design token system. The implementation uses CSS custom properties organized into:
- Brand colors (primary scale, accent, highlight)
- Dark mode surface/text/border tokens
- Semantic colors (success/warning/error with surface variants)
- Spacing scale (8px grid: 2/4/8/12/16/24/32/40px)
- Border radius scale (4/8/12/16/9999px)
- Shadow scale (sm/md/lg/xl)
- Animation tokens (duration + easing)
- Focus ring for accessibility

### Fix 8: Express 5 demo server — stale processes

When restarting the demo server, kill existing processes on ports 3000/3001 first. Express 5 doesn't always release the port immediately:

```bash
lsof -ti:3000 -ti:3001 | xargs kill 2>/dev/null
npm run demo
```

### Build Output Reference

After a successful full build, expect these output sizes:

| File | Size (approx) |
|------|--------------|
| `dist/sidepanel/index.js` | ~420 KB (127 KB gzipped) — includes React, react-markdown, Lucide |
| `dist/index.css` | ~17 KB (4 KB gzipped) — Tailwind CSS |
| `dist/sidepanel/index.html` | ~0.35 KB |
| `dist/content.js` | ~4.4 KB |
| `dist/background.js` | ~3.4 KB |
| `dist/manifest.json` | ~0.7 KB |

---

## Phase 9 — React + Tailwind Migration (Post-Implementation)

The sidepanel was migrated from vanilla TypeScript to **React 19 + Tailwind CSS 3 + Lucide React + react-markdown**.

### Architecture Change

**Before:** 20 vanilla TS modules with direct DOM manipulation
**After:** React component tree with centralized state via `useReducer` + Context

### New Dependencies
- `react`, `react-dom` — UI framework
- `lucide-react` — SVG icon library (replaces all emojis)
- `react-markdown` + `remark-gfm` — Markdown/code block rendering in chat
- `@vitejs/plugin-react` — JSX transform for Vite
- `tailwindcss` + `postcss` + `autoprefixer` — Utility-first CSS

### Theme: Slate & Emerald
- Base: `#0F172A` (slate-950)
- Surface: `#1E293B` (slate-800)
- Elevated: `#334155` (slate-700)
- Accent: `#10B981` (emerald-500)
- Accent hover: `#059669` (emerald-600)

### Vite Config for React in Chrome Extension

The `vite-plugin-web-extension` uses `htmlViteConfig` to pass `@vitejs/plugin-react` only for HTML entry points (sidepanel). Background and content scripts build as IIFE without React.

```typescript
webExtension({
  manifest: 'manifest.json',
  htmlViteConfig: { plugins: [react()] },
})
```

### Component Structure

```
src/sidepanel/
├── main.tsx                    React entry point
├── App.tsx                     Root component + init effects
├── index.css                   Tailwind directives + custom styles
├── context/AppContext.tsx       State management (useReducer + Context)
├── components/
│   ├── Header.tsx              Lucide icon buttons, status badge
│   ├── ChatArea.tsx            Message list with auto-scroll
│   ├── ChatMessage.tsx         react-markdown rendering
│   ├── InputArea.tsx           Textarea + send button
│   ├── ApprovalCard.tsx        Plan review with Lucide step icons
│   ├── WelcomeCard.tsx         Demo/example chips
│   ├── Spinner.tsx             Loading indicator
│   ├── RecordingBar.tsx        Recording state bar
│   └── panels/
│       ├── SettingsPanel.tsx
│       ├── KBPanel.tsx
│       ├── AgentsPanel.tsx
│       ├── WorkflowsPanel.tsx
│       └── DataSourcePanel.tsx
├── chat-handler.ts             Dispatch-based (no DOM)
├── executor.ts                 Dispatch-based (no DOM)
├── recording.ts                Dispatch-based (no DOM)
├── demo.ts                     Dispatch-based (no DOM)
├── scenario.ts                 Dispatch-based (no DOM)
├── pii.ts                      Pure logic (unchanged)
├── claude.ts                   Pure logic (unchanged)
├── plan-parser.ts              Pure logic (updated - no state import)
├── system-prompt.ts            Pure logic (unchanged)
├── cross-tab.ts                Pure logic (updated - variables param)
└── csv.ts                      Pure logic (updated - no DOM imports)
```

### State Management Pattern

Single `AppContext` with `useReducer`. The `pendingResume` callback (used during plan execution to wait for user input) is stored in a `useRef` because functions should not be React state values.

### Deleted Files (replaced by React)
- `sidepanel.css`, `main.ts`, `state.ts`, `chat-ui.ts`, `panels.ts`, `approval.ts`, `settings.ts`, `agents.ts`, `workflows.ts`
