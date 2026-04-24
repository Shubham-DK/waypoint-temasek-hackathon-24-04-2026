/**
 * Dynamic site-adaptive theming for Waypoint.
 *
 * Sets two families of CSS custom properties on :root:
 *
 *   --accent-h / --accent-s / --accent-l
 *     The vivid brand colour (buttons, links, active icons, badges).
 *
 *   --bg-h
 *     Shifts the hue of EVERY slate-* and surface-* Tailwind token.
 *     Background panels, borders, muted text — all morph to the site's hue.
 *
 * Extraction pipeline — all runs in the page context via executeScript so
 * extension CSP `connect-src` restrictions don't block favicon fetches:
 *   1. <meta name="theme-color">          — authoritative, highest weight
 *   2. CSS custom properties on :root, body, ytd-app, #app, #root, etc.
 *   3. Header / nav background colour
 *   4. Primary button background
 *   5. Prominent link colour in header
 *   6. Favicon dominant colour (canvas, same-origin fetch from page context)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rgb { r: number; g: number; b: number }
interface Hsl { h: number; s: number; l: number }
interface Candidate { hsl: Hsl; weight: number }

// ─── Colour math (sidepanel context) ─────────────────────────────────────────

function hexToRgb(hex: string): Rgb | null {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  if (full.length !== 6) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Parse hex / rgb() / rgba() / hsl() → Rgb. Returns null if unrecognised. */
function parseColor(raw: string): Rgb | null {
  const c = raw.trim();
  if (c.startsWith('#')) return hexToRgb(c);
  let m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  // hsl(h s% l%) modern syntax
  m = c.match(/hsla?\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%/);
  if (m) {
    const h = +m[1], s = +m[2] / 100, l2 = +m[3] / 100;
    const c2 = (1 - Math.abs(2 * l2 - 1)) * s;
    const x = c2 * (1 - Math.abs(((h / 60) % 2) - 1));
    const m2 = l2 - c2 / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60)       { r = c2; g = x; }
    else if (h < 120) { r = x;  g = c2; }
    else if (h < 180) { g = c2; b = x; }
    else if (h < 240) { g = x;  b = c2; }
    else if (h < 300) { r = x;  b = c2; }
    else              { r = c2; b = x; }
    return { r: Math.round((r + m2) * 255), g: Math.round((g + m2) * 255), b: Math.round((b + m2) * 255) };
  }
  return null;
}

function colorScore(h: number, s: number, l: number): number {
  void h;
  if (s < 15 || l < 5 || l > 93) return 0;
  return s * 1.5 - Math.abs(50 - l) * 0.4;
}

// ─── Combined DOM + Favicon extraction (injected into active tab) ─────────────
//
// Running inside the page context means:
//   • fetch(faviconUrl) is same-origin → no CORS issue, no extension CSP block
//   • getComputedStyle works on any element including custom elements (ytd-app)
//
// Must be fully self-contained — no imports, no closures over outer vars.

async function _extractAll(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};

  const isUsable = (c: string | null | undefined): boolean =>
    !!(c && c !== 'none' && c !== 'transparent' && c !== 'white' &&
       c !== '#fff' && c !== '#ffffff' &&
       !c.match(/^\s*rgba?\(\s*255\s*,\s*255\s*,\s*255/) &&
       !c.match(/^\s*rgba?\(\s*0\s*,\s*0\s*,\s*0[^.)]/) && // pure black
       c !== 'rgba(0, 0, 0, 0)' && c.trim().length > 2);

  // 1. <meta name="theme-color">
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (isUsable(meta?.content)) out.metaTheme = meta!.content.trim();

  // 2. CSS custom properties — query multiple root elements to cover design systems
  //    that set vars on body, ytd-app (YouTube), #app (Vue), etc., not just :root.
  const cssVarNames = [
    '--primary-color', '--brand-color', '--color-primary', '--primary',
    '--accent-color', '--accent', '--theme-color', '--color-brand',
    '--color-accent', '--main-color', '--highlight-color', '--color-link',
    '--color-cta', '--color-action', '--color-button', '--link-color',
    '--color-interactive', '--focus-color', '--color-focus',
    // Atlassian / Jira tokens
    '--ds-background-brand-bold', '--ds-text-brand',
    // GitHub tokens
    '--color-accent-fg', '--color-btn-primary-bg',
    '--fgColor-accent', '--bgColor-accent-emphasis',
    // YouTube tokens
    '--yt-spec-brand-icon-active', '--yt-spec-call-to-action',
    // Google Material
    '--md-sys-color-primary',
    // Adobe Spectrum
    '--spectrum-blue-900', '--spectrum-global-color-blue-600',
  ];

  const rootCandidates: Element[] = [
    document.documentElement,
    document.body,
    ...Array.from(document.querySelectorAll('ytd-app, tp-yt-app-drawer, #app, #root, [data-reactroot]')),
  ];

  for (const el of rootCandidates) {
    if (out.cssVar) break;
    try {
      const rs = getComputedStyle(el);
      for (const v of cssVarNames) {
        const val = rs.getPropertyValue(v).trim();
        if (isUsable(val)) { out.cssVar = val; break; }
      }
    } catch { /* skip inaccessible elements */ }
  }

  // 3. Header / nav background
  const header = document.querySelector<HTMLElement>(
    'header, [role="banner"], nav, .navbar, .header, #header, #top-nav, ' +
    '.site-header, .app-header, .global-header, ytd-masthead, .ytp-chrome-top'
  );
  if (header) {
    const bg = getComputedStyle(header).backgroundColor;
    if (isUsable(bg)) out.headerBg = bg;
  }

  // 4. Primary / CTA button background
  const btn = document.querySelector<HTMLElement>(
    '.btn-primary, .button-primary, [class*="btn-cta"], [class*="cta-btn"], ' +
    'button.primary, a.primary, [data-testid*="primary-btn"], ' +
    'ytd-button-renderer[style-target="host"] button, ' +
    '.gh-btn-primary, .aui-button-primary'
  );
  if (btn) {
    const bg = getComputedStyle(btn).backgroundColor;
    if (isUsable(bg)) out.buttonBg = bg;
  }

  // 5. Link colour in header
  if (header) {
    const links = header.querySelectorAll<HTMLElement>('a, button');
    for (const el of Array.from(links).slice(0, 10)) {
      const col = getComputedStyle(el).color;
      if (isUsable(col) && col !== 'rgba(0, 0, 0, 0)') { out.headerLink = col; break; }
    }
  }

  // 6. Manifest URL (so sidepanel can do the PWA fetch)
  const manifestEl = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifestEl?.href) out.manifestUrl = manifestEl.href;

  // 7. Favicon canvas analysis — runs here in page context so fetch is same-origin.
  //    This avoids the extension's connect-src CSP which blocks third-party favicons.
  try {
    const iconLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]'));
    // Prefer PNG icons; fall back to any icon, then /favicon.ico
    const pngIcon = iconLinks.find(l => l.type === 'image/png' || /\.png(\?|$)/i.test(l.href));
    const iconUrl = pngIcon?.href
      ?? iconLinks.find(l => l.href && !l.href.includes('.svg'))?.href
      ?? (location.origin + '/favicon.ico');

    const res = await fetch(iconUrl, { cache: 'force-cache' });
    if (!res.ok) throw new Error('favicon fetch failed');
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);

    const size = Math.min(bmp.width, bmp.height, 64);
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Build a hue histogram weighted by saturation score
    const histogram = new Float32Array(36); // 36 × 10° buckets

    const _toHsl = (ri: number, gi: number, bi: number) => {
      const r = ri / 255, g = gi / 255, b = bi / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (mx + mn) / 2;
      if (mx !== mn) {
        const d = mx - mn;
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (mx === g) h = ((b - r) / d + 2) / 6;
        else               h = ((r - g) / d + 4) / 6;
      }
      return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    };

    const _score = (s: number, l: number) => {
      if (s < 15 || l < 5 || l > 93) return 0;
      return s * 1.5 - Math.abs(50 - l) * 0.4;
    };

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 100) continue;
      const { h, s, l } = _toHsl(data[i], data[i + 1], data[i + 2]);
      const sc = _score(s, l);
      if (sc <= 0) continue;
      histogram[Math.floor(h / 10) % 36] += sc;
    }

    const maxVal = Math.max(...histogram);
    if (maxVal >= 40) { // enough saturated pixels
      const maxBucket = histogram.indexOf(maxVal);
      const peakH = maxBucket * 10;
      let bestScore = 0, bestH = peakH, bestS = 70;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 100) continue;
        const { h, s, l } = _toHsl(data[i], data[i + 1], data[i + 2]);
        const dist = Math.min(Math.abs(h - peakH), 360 - Math.abs(h - peakH));
        if (dist > 30) continue;
        const sc = _score(s, l);
        if (sc > bestScore) { bestScore = sc; bestH = h; bestS = s; }
      }

      if (bestScore > 8) {
        out.faviconHsl = `${bestH},${bestS},50`;
      }
    }
  } catch { /* favicon analysis failed — silent */ }

  return out;
}

// ─── CSS application ──────────────────────────────────────────────────────────

const DEFAULTS = { accentH: 160, accentS: 84, accentL: 39, bgH: 222 };

function applyTheme(accentH: number, accentS: number): void {
  const root = document.documentElement;
  const s = Math.min(90, Math.max(55, accentS));
  root.style.setProperty('--accent-h', String(accentH));
  root.style.setProperty('--accent-s', `${s}%`);
  root.style.setProperty('--accent-l', `${DEFAULTS.accentL}%`);
  root.style.setProperty('--bg-h', String(accentH));
}

function resetTheme(): void {
  const root = document.documentElement;
  root.style.setProperty('--accent-h', String(DEFAULTS.accentH));
  root.style.setProperty('--accent-s', `${DEFAULTS.accentS}%`);
  root.style.setProperty('--accent-l', `${DEFAULTS.accentL}%`);
  root.style.setProperty('--bg-h', String(DEFAULTS.bgH));
}

// ─── Candidate selection ──────────────────────────────────────────────────────

function pickBest(candidates: Candidate[]): Hsl | null {
  let best: Hsl | null = null;
  let bestScore = 0;
  for (const { hsl, weight } of candidates) {
    const s = colorScore(hsl.h, hsl.s, hsl.l) * weight;
    if (s > bestScore) { bestScore = s; best = hsl; }
  }
  return bestScore > 5 ? best : null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function syncAccentFromActiveTab(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const url = tab.url ?? '';
    if (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('about:') ||
      url === ''
    ) {
      resetTheme();
      return;
    }

    // Run all extraction in the page context.
    // This avoids the extension's connect-src CSP for favicon fetches and
    // lets us query any element (e.g. ytd-app) for CSS custom properties.
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'ISOLATED',
      func: _extractAll,
    });

    const dom = result?.result as Record<string, string> | null;
    if (!dom) { resetTheme(); return; }

    const candidates: Candidate[] = [];

    const addCss = (raw: string | undefined, weight: number) => {
      if (!raw) return;
      const rgb = parseColor(raw);
      if (!rgb) return;
      candidates.push({ hsl: rgbToHsl(rgb.r, rgb.g, rgb.b), weight });
    };

    addCss(dom.metaTheme,  3.5);  // site declared it — highest confidence
    addCss(dom.cssVar,     3.0);  // explicit design-system token
    addCss(dom.buttonBg,   2.5);  // primary button = brand colour
    addCss(dom.headerBg,   2.0);  // nav background
    addCss(dom.headerLink, 1.5);  // link inside nav

    // Favicon result was already processed in page context — just parse the HSL triple
    if (dom.faviconHsl) {
      const parts = dom.faviconHsl.split(',').map(Number);
      if (parts.length === 3 && parts.every(isFinite)) {
        candidates.push({ hsl: { h: parts[0], s: parts[1], l: parts[2] }, weight: 2.2 });
      }
    }

    // PWA manifest theme_color — fetch from sidepanel (works for same-origin manifests;
    // may fail for third-party domains due to extension connect-src CSP, which is fine).
    if (dom.manifestUrl) {
      fetch(dom.manifestUrl, { cache: 'force-cache' })
        .then(r => r.json())
        .then((manifest: Record<string, unknown>) => {
          const tc = manifest.theme_color as string | undefined;
          if (tc) {
            const rgb = parseColor(tc);
            if (rgb) {
              const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
              if (colorScore(hsl.h, hsl.s, hsl.l) > 5) applyTheme(hsl.h, hsl.s);
            }
          }
        })
        .catch(() => {});
    }

    const best = pickBest(candidates);
    if (best) {
      applyTheme(best.h, best.s);
    } else {
      resetTheme();
    }
  } catch {
    // Silent — never crash the sidepanel over a theming failure
  }
}
