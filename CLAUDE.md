# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Waypoint is a Chrome MV3 extension (side panel) that acts as an AI browser agent. It records user interactions, calls the Claude API to generate action plans, executes those plans across multiple browser tabs, and orchestrates a multi-agent pipeline. Built with TypeScript, React, Vite, Tailwind CSS, and Vitest.

## Commands

```bash
npm run build          # Type-check + Vite production build → dist/
npm run dev            # Vite watch build + demo Express servers (ports 3000/3001)
npm run demo           # Demo servers only
npm run typecheck      # TypeScript strict check
npm test               # Vitest single run
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Vitest with V8 coverage
```

Load `dist/` as an unpacked extension at `chrome://extensions` (Developer mode).

## Reference Docs

| Topic | File |
|-------|------|
| Full architecture, module map, agent pipeline, action plan schema | [docs/architecture.md](docs/architecture.md) |
| Background message types, chrome storage keys | [docs/message-types.md](docs/message-types.md) |
| Testing setup, Chrome API mocking, coverage | [docs/testing.md](docs/testing.md) |
| Demo system, pages, selectors | [docs/demo-system.md](docs/demo-system.md) |
| Known security vulnerabilities | [docs/security.md](docs/security.md) |
| Full build plan (9 phases) | [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) |
