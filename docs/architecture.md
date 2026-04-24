# Architecture

## Three JS Contexts

The extension runs in three isolated JavaScript contexts, each with its own DevTools console:

**Background (`src/background.ts`)** — Service worker. Owns recording state (`active` flag + `actions[]`). Routes all messages between sidepanel and content scripts. Handles tab management (`SWITCH_TO_TAB`, `OPEN_OR_SWITCH_TAB`, `READ_TAB_FIELDS`, `READ_TAB_CONTENT`). For `EXECUTE_ACTION` with `navigate`, uses `chrome.tabs.update` directly; for all other actions, injects the content script then forwards the message.

**Content (`src/content.ts`)** — Injected into every page as an IIFE with `__waypointLoaded` guard. Captures click/input events during recording (sends `BG_ACTION` to background). Executes DOM commands (`click`, `fill`, `waitAndClick`, `waitAndFill`, `navigate`, `getPageContent`, `extractDataFields`). Extracts page structure via `extractPageContent()`.

**Sidepanel (`src/sidepanel/`)** — React app. Entry: `main.tsx` → `App.tsx` → context provider + components. This is where all Claude API calls, agent orchestration, plan approval, and plan execution happen.

Message flow: Sidepanel → `chrome.runtime.sendMessage` → Background → `chrome.tabs.sendMessage` → Content script.

## Sidepanel Module Map

Logic modules (non-React, imported by components):

| Module | Purpose |
|--------|---------|
| `claude.ts` | `claudeCall()` — direct fetch to Anthropic API with `anthropic-dangerous-direct-browser-access` header |
| `chat-handler.ts` | `handleSend()` — orchestrates page context fetch, PII masking, KB lookup, Claude call, plan parsing |
| `system-prompt.ts` | `buildSystemPrompt()` — assembles current page context + KB docs + open tabs into Claude system prompt |
| `plan-parser.ts` | `tryParseActionPlan()` — extracts `{"type":"action_plan",...}` JSON from Claude's text response by brace-walking |
| `executor.ts` | `executePlan()` — runs ActionPlan steps sequentially: navigate, click, fill, switch_tab, read_tab, open_tab, ask_user, confirm, wait |
| `scenario.ts` | `buildScenarioPlan()` — multi-agent pipeline: Orchestrator → Site Selector → DOM Reader → DOM Interpreter → Plan Generator |
| `cross-tab.ts` | `getOpenTabs()`, `subVars()` (replaces `{{variable}}` with captured data), `sendToBackground()` |
| `pii.ts` | `maskPII()`, `hasPII()` — regex patterns for email, phone, SSN, credit card, passport |
| `kb.ts` | Knowledge Base keyword search — scores docs by query word overlap, returns top 2 |
| `csv.ts` | `parseCSV()` — handles quoted fields, commas in quotes, CRLF |
| `recording.ts` | `startRecording()`, `stopRecording()` — controls content script event capture, polls BG_GET every 600ms |
| `demo.ts` | `DEMO_RECOVERY_PLAN` — hardcoded 14-step plan for SQ321 service recovery demo |

State: `src/sidepanel/context/AppContext.tsx` — React Context with reducer. Key state fields: `messages`, `conversationHistory`, `kbDocuments`, `agentDefs`, `pendingPlan`, `variables`, `pendingScenario`.

## Multi-Agent Pipeline (`scenario.ts`)

The scenario planner runs agents in sequence, each a separate Claude call:
1. **Orchestrator** — decides which agents to run and in what order
2. **Site Selector** — reads KB docs, identifies system URLs needed
3. **DOM Reader** — opens tabs, extracts live page structure; runs DOM Interpreter sub-agent per tab
4. **Plan Generator** — receives all context, produces executable `action_plan` JSON

Custom agents (added via Agents panel) are dispatched through `runGenericAgent()`.

## Action Plan JSON

Claude returns this format for DOM automation tasks:
```json
{
  "type": "action_plan",
  "summary": "...",
  "steps": [
    { "action": "navigate|click|fill|switch_tab|read_tab|open_tab|ask_user|confirm|wait", ... }
  ]
}
```
Pages with `data-waypoint-field="key"` attributes are captured by `read_tab` → stored in `state.variables` → substituted into `fill` values as `{{key}}`.
