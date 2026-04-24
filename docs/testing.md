# Testing

## Commands

```bash
npm test               # Vitest single run
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Vitest with V8 coverage report
```

## Structure

- **Unit tests** (`test/unit/`) run in `node` environment — pure logic, no mocking needed
- **Integration tests** (`test/integration/`) run in `jsdom` environment — use Chrome API mocks

## Chrome API Mocking

- `test/setup.ts` installs a fresh `chrome` mock (from `test/chrome-mock.ts`) as `globalThis.chrome` before each test
- Chrome mock covers: `runtime.sendMessage`, `storage.local.get/set/remove`, `tabs.query/update/create/sendMessage`, `scripting.executeScript`, `sidePanel.open`
- Helper: `seedStorage(data)` pre-populates mock storage; `getStorageData()` inspects it

## Coverage

- `content.ts` and `demo-bridge.ts` are excluded from coverage (IIFE + DOM-heavy, tested manually in browser)
- Path alias: `@` maps to `src/` in test imports
