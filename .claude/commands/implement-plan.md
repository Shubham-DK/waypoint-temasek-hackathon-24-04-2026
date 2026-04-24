# Implement the Waypoint TypeScript Migration Plan

You are executing the **Waypoint Chrome Extension — Technical Implementation Plan** defined in `docs/IMPLEMENTATION_PLAN.md`. Your job is to read that plan and build the complete TypeScript + Vite + Vitest version of the extension, phase by phase.

**Target phase:** $ARGUMENTS (if blank, start from Phase 0 and work through all phases in order)

---

## Before You Start

1. **Read the full plan** — open and read `docs/IMPLEMENTATION_PLAN.md` end-to-end so you understand all 9 phases, the project structure, and the dependency graph between modules.
2. **Read `CLAUDE.md`** — the existing extension spec is your reference for behavior, message types, selectors, agent prompts, and demo pages.
3. **Check current state** — run `ls` and `git status` to see what already exists. If previous phases have been built, pick up where they left off.

---

## Execution Rules

- **Build one phase at a time.** Complete all files in a phase before moving to the next.
- **After each phase, verify it works** by running the verification steps listed in the plan (e.g., `npm run build`, `npm run typecheck`, `npm test`).
- **If a verification step fails, fix it** before proceeding to the next phase.
- **Follow the plan's file structure exactly** — the `src/`, `demo/`, and `test/` directory layout is specified and must be followed.
- **Use the exact type definitions, interfaces, and module exports** described in the plan.
- **Preserve all existing demo HTML pages** in `demo/` — migrate them to `demo/public/` as the plan specifies.
- **Do not skip phases** unless the user explicitly passes a phase number as an argument.

---

## Phase Checklist

Work through these phases from the plan. After completing each phase, state what was created and confirm verification passed.

### Phase 0 — Project Scaffold + Build Tooling
- [ ] `package.json` with all dependencies and scripts
- [ ] `tsconfig.json` (strict mode, ES2022)
- [ ] `tsconfig.node.json` (for Vite + server scripts)
- [ ] `vite.config.ts` (multi-format output for Chrome extension)
- [ ] Run: `npm install && npm run build` — must succeed

### Phase 1 — Type Definitions
- [ ] `src/types/config.ts` — WaypointConfig interface
- [ ] `src/types/messages.ts` — BackgroundMessage, ContentMessage, RecordedAction, PageContent, TabInfo
- [ ] `src/types/actions.ts` — ActionStep, ActionPlan, Workflow, KBDocument, AgentDef, IdentifiedSite, TabContext
- [ ] `src/types/state.ts` — AppState interface
- [ ] Run: `npm run typecheck` — must pass with 0 errors

### Phase 2 — Config + Background Service Worker
- [ ] `src/manifest.json` — Chrome MV3 manifest
- [ ] `src/config.ts` — runtime config singleton
- [ ] `src/background.ts` — full message router (all 14 message types)
- [ ] Run: `npm run build` — load `dist/` in Chrome, service worker shows no errors

### Phase 3 — Content Script
- [ ] `src/content.ts` — IIFE with event capture + DOM execution
- [ ] `src/demo-bridge.ts` — IIFE for chrome-extension:// pages
- [ ] Run: `npm run build` — open any page, verify `window.__waypointLoaded === true`

### Phase 4 — Side Panel UI (HTML + CSS)
- [ ] `src/sidepanel/index.html` — all element IDs from the spec
- [ ] `src/sidepanel/sidepanel.css` — dark theme with CSS variables
- [ ] Run: `npm run build` — reload extension, sidepanel opens with dark theme

### Phase 5 — Side Panel Logic (TypeScript Modules)
- [ ] All 20 modules under `src/sidepanel/` as specified in the plan:
  - `state.ts`, `settings.ts`, `panels.ts`, `agents.ts`, `kb.ts`, `pii.ts`
  - `claude.ts`, `chat-ui.ts`, `chat-handler.ts`, `system-prompt.ts`
  - `plan-parser.ts`, `approval.ts`, `executor.ts`, `cross-tab.ts`
  - `demo.ts`, `scenario.ts`, `recording.ts`, `workflows.ts`, `csv.ts`
  - `main.ts` (entry point — imports and initializes all modules)
- [ ] Run: `npm run build` — full app functionality in sidepanel

### Phase 6 — Demo Server + Demo Pages
- [ ] `demo/server.ts` — Express server for ports 3000 + 3001
- [ ] `demo/public/flight-schedule.html`
- [ ] `demo/public/passenger-manifest.html`
- [ ] `demo/public/hotel-portal.html`
- [ ] `demo/public/crm-email.html`
- [ ] Run: `npm run demo` — all 4 pages load correctly

### Phase 7 — Automated Tests (Vitest)
- [ ] `vitest.config.ts`
- [ ] `test/setup.ts` + `test/chrome-mock.ts`
- [ ] Unit tests: `pii`, `plan-parser`, `csv`, `cross-tab`, `kb`, `system-prompt`
- [ ] Integration tests: `settings`, `agents`, `claude`, `executor`, `background`
- [ ] Run: `npm test` — all tests pass

### Phase 8 — Manual Integration Testing
- [ ] Walk through the full test checklist from the plan
- [ ] Report any issues found and fix them

---

## How to Handle Specific Phases

If the user passes a phase number (e.g., `Phase 3`):
1. Read the plan to understand that phase's requirements
2. Check that prerequisite phases are already built
3. Build only that phase
4. Verify it works

If the user passes `resume` or no argument:
1. Check what exists in the project
2. Determine which phase to continue from
3. Build from that phase forward

---

## Key References

- **Full implementation plan:** `docs/IMPLEMENTATION_PLAN.md`
- **Extension behavior spec:** `CLAUDE.md`
- **Existing vanilla JS code** (if present): `sidepanel.js`, `background.js`, `content.js` — use as behavioral reference
- **Existing demo pages** (if present): `demo/*.html` — migrate to `demo/public/`

---

Now read `docs/IMPLEMENTATION_PLAN.md` and begin implementing. Start with the target phase (or Phase 0 if no argument given). After each phase, report what was created and confirm verification passed.
