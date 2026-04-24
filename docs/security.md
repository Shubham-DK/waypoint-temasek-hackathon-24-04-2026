# Security Considerations

## Known Vulnerabilities

### HIGH: XSS via CSV injection (`src/sidepanel/csv.ts`)
CSV column names and cell values are interpolated into `innerHTML` without escaping in `renderMappingTable()` and `renderPreview()`. The `escHtml()` function exists in `chat-ui.ts` but is not imported by `csv.ts`. A malicious CSV could execute JavaScript in the extension's privileged sidepanel context.

**Fix:** Import `escHtml` from `chat-ui.ts` and apply to all CSV-derived values before innerHTML interpolation.

### MEDIUM: Unvalidated URL navigation (`src/content.ts`, `src/background.ts`)
URLs from Claude API responses (action plans) are used for navigation without scheme validation. `content.ts` line 235 sets `window.location.href = msg.url` directly. No validation exists in the chain from plan parsing through execution.

**Fix:** Add URL scheme allowlisting (`http:`, `https:` only) before `window.location.href` and `chrome.tabs.update`.

### MEDIUM: Overly permissive CSP (`src/manifest.json`)
The `connect-src` directive includes a `https:` wildcard allowing fetch to any HTTPS endpoint. Only `api.anthropic.com` and `api.genspark.ai` are needed.

**Fix:** Remove `https:` from `connect-src`, keep only explicit domains.
