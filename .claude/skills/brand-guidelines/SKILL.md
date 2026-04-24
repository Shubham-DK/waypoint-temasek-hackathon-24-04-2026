---
name: brand-guidelines
description: "Modern brand design system and frontend guidelines for building polished, accessible web UIs. Use this skill whenever building, styling, or reviewing any frontend UI, web page, dashboard, form, component, or application. Also use when the user asks about brand colors, typography, spacing, design tokens, theming, component styling, or visual consistency — even if they don't say 'brand' or 'design system' explicitly. If the output will be visible to users (HTML, CSS, React, Vue, Tailwind config, etc.), consult this skill to ensure it follows the design system."
---

# Brand Guidelines — Design System

You are building modern, polished UI. Every frontend output must follow this **Design System v2.0** — the official design token system. This skill gives you the complete token vocabulary so your output is consistent, accessible, and visually refined.

## How to use this skill

1. **Read this file first** for the quick-reference values (brand colors, core typography, spacing scale, key patterns).
2. **Read the reference files** when you need exhaustive detail:
   - `references/colors.md` — Full color palettes (primitives, semantic, theme, state layers, dark mode)
   - `references/typography.md` — Complete typescale for desktop and mobile, font stacks, fallbacks
   - `references/components.md` — Component tokens (card, modal, table, toast, etc.), layout/grid, breakpoints, shadows, borders, animation, z-index
3. Apply values using CSS custom properties, Tailwind config, or inline styles — whatever the project requires.

---

## Brand Identity at a Glance

The visual identity is **modern, vibrant, and clean**. Think polished SaaS product — bold indigo primary, energetic coral accents, with crisp typography and generous whitespace. All colors meet WCAG 2.1 AA contrast requirements.

### The Three Brand Colors

| Role | Token | Hex | When to use |
|------|-------|-----|-------------|
| **Indigo** (Primary) | `brand/primary` | `#4F46E5` | Headers, primary buttons, nav bars, brand-heavy surfaces |
| **Coral** (Accent) | `brand/accent` | `#F97316` | Accent highlights, badges, call-to-action emphasis |
| **Teal** (Highlight) | `brand/highlight` | `#14B8A6` | Secondary actions, status indicators, subtle accents |

### Primary Color Scale (Indigo family)

Use these for most UI surfaces and text:

| Token | Hex | Typical use |
|-------|-----|-------------|
| `primary/900` | `#312E81` | Brand headers, hero sections |
| `primary/800` | `#3730A3` | Hover states on dark elements |
| `primary/700` | `#4338CA` | Active/pressed states |
| `primary/600` | `#4F46E5` | Default primary buttons, links |
| `primary/500` | `#6366F1` | Primary surfaces, lighter buttons |
| `primary/400` | `#818CF8` | Secondary elements, tags |
| `primary/100` | `#E0E7FF` | Light tints, disabled primary |
| `primary/50` | `#EEF2FF` | Subtle backgrounds, hover fills |

### Semantic Colors

| Role | Key shade | Hex |
|------|-----------|-----|
| **Success** (green) | `success/500` | `#22C55E` |
| **Warning** (amber) | `warning/500` | `#F59E0B` |
| **Error** (red) | `error/500` | `#EF4444` |
| **Secondary** (blue) | `secondary/500` | `#3B82F6` |
| **Accent** (coral) | `accent/500` | `#F97316` |

### Text Colors (Light Theme)

| Token | Hex | Use |
|-------|-----|-----|
| `text/title` | `#1E1B4B` | Page titles, hero headings |
| `text/primary` | `#111827` | Body copy |
| `text/secondary` | `#374151` | Supporting text |
| `text/tertiary` | `#6B7280` | Captions, metadata |
| `text/disabled` | `#9CA3AF` | Disabled labels |
| `text/link` | `#4F46E5` | Hyperlinks |

### Background Colors (Light Theme)

| Token | Hex | Use |
|-------|-----|-----|
| `background/base-l0` | `#F8FAFC` | Page background |
| `background/surface-l1` | `#FFFFFF` | Cards, panels, elevated surfaces |

> For **dark mode tokens**, full **neutral scale**, and **state layer overlays**, read `references/colors.md`.

---

## Typography

### Fonts

| Role | Font Family | Fallback Stack |
|------|-------------|----------------|
| **Display / Headings** | **Inter** | system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif |
| **Body / UI** | **Inter** | system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif |

> Inter is a free, open-source font optimized for screens. Load it from Google Fonts or bundle locally. For projects without Inter, the system font stack provides excellent fallback.

### Key Type Styles (Desktop)

| Style | Font | Weight | Size | Line Height |
|-------|------|--------|------|-------------|
| `header_1` | Inter | 700 | 28px | 36px |
| `header_2` | Inter | 600 | 24px | 32px |
| `subheader_1` | Inter | 700 | 16px | 24px |
| `subheader_2` | Inter | 700 | 14px | 20px |
| `body_1` | Inter | 400 | 16px | 24px |
| `body_2` | Inter | 400 | 14px | 20px |
| `label_1` | Inter | 500 | 14px | 20px |
| `label_2` | Inter | 500 | 12px | 16px |

**Mobile difference**: `header_1` shrinks to 22px / 28px and `header_2` to 18px / 24px. All other styles stay the same.

> For the complete typescale including all-caps labels and letter-spacing, read `references/typography.md`.

---

## Spacing Scale

The spacing system is based on an 8px grid with half-steps:

| Token | Value | Common use |
|-------|-------|------------|
| `spacing/1` | 2px | Hairline gaps |
| `spacing/2` | 4px | Tight padding (badges, chips) |
| `spacing/3` | 8px | Inner padding, icon gaps |
| `spacing/4` | 12px | Standard padding |
| `spacing/5` | 16px | Default spacing between elements |
| `spacing/6` | 24px | Section padding, card padding |
| `spacing/7` | 32px | Large section gaps |
| `spacing/8` | 40px | Major layout sections |
| `spacing/9` | 48px | Page-level margins |

> Full spacing, dimension, and size primitives in `references/components.md`.

---

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `radius/0` | 0px | Sharp edges (tables) |
| `radius/2` | 4px | Buttons, inputs, small elements |
| `radius/3` | 8px | Cards, dropdowns, modals |
| `radius/4` | 12px | Large cards, dialogs |
| `radius/5` | 16px | Feature cards |
| `9999px` | Full | Pills, avatars, toggles |

---

## Shadows

| Token | Value | Use |
|-------|-------|-----|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift (cards at rest) |
| `shadow-md` | `0 2px 4px -1px rgba(0,0,0,0.06), 0 4px 6px -1px rgba(0,0,0,0.1)` | Default card shadow |
| `shadow-lg` | `0 4px 6px -2px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1)` | Elevated elements (dropdowns, toasts) |
| `shadow-xl` | `0 10px 25px -5px rgba(0,0,0,0.1), 0 20px 40px -10px rgba(0,0,0,0.08)` | Modals, dialogs |

---

## Breakpoints

| Mode | Min Width | Max Width |
|------|-----------|-----------|
| Wide | 1280px | - |
| Desktop | 1024px | 1279px |
| Tablet | 768px | 1023px |
| Mobile | 320px | 767px |

---

## Key Design Patterns

### Do

- Use `primary/600` (#4F46E5) for primary buttons, links, and interactive elements
- Use white (`#FFFFFF`) for card backgrounds on the `base-l0` (#F8FAFC) page
- Apply generous whitespace — the aesthetic is clean and modern
- Use the semantic color tokens (success/warning/error) for status indicators
- Support both light and dark themes using the theme tokens
- Use `spacing/5` (16px) as the default gap between elements
- Use `radius/3` (8px) as the default border-radius for containers
- Ensure all text meets WCAG 2.1 AA contrast ratios (4.5:1 for body, 3:1 for large text)

### Don't

- Don't use bright or saturated colors outside the defined palette
- Don't mix brand fonts with arbitrary web fonts
- Don't use shadows heavier than `shadow-xl`
- Don't skip the spacing scale — avoid arbitrary pixel values
- Don't use `primary/900` for large background fills on content-heavy pages (use `surface-l1` or `base-l0` instead, with indigo as accent)

### CSS Custom Property Pattern

When generating CSS, define tokens as custom properties:

```css
:root {
  /* Brand */
  --color-primary: #4F46E5;
  --color-accent: #F97316;
  --color-highlight: #14B8A6;

  /* Primary scale */
  --color-primary-50: #EEF2FF;
  --color-primary-100: #E0E7FF;
  --color-primary-500: #6366F1;
  --color-primary-600: #4F46E5;
  --color-primary-900: #312E81;

  /* Semantic */
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;

  /* Text */
  --text-title: #1E1B4B;
  --text-primary: #111827;
  --text-secondary: #374151;
  --text-tertiary: #6B7280;
  --text-link: #4F46E5;

  /* Surfaces */
  --bg-base: #F8FAFC;
  --bg-surface: #FFFFFF;

  /* Borders */
  --border-default: #E2E8F0;
  --border-divider: #F1F5F9;

  /* Typography */
  --font-display: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  /* Spacing */
  --space-1: 2px;
  --space-2: 4px;
  --space-3: 8px;
  --space-4: 12px;
  --space-5: 16px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 4px -1px rgba(0,0,0,0.06), 0 4px 6px -1px rgba(0,0,0,0.1);
  --shadow-lg: 0 4px 6px -2px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1);
  --shadow-xl: 0 10px 25px -5px rgba(0,0,0,0.1), 0 20px 40px -10px rgba(0,0,0,0.08);
}
```

### Tailwind Config Pattern

When configuring Tailwind, extend the theme:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4F46E5',
          accent: '#F97316',
          highlight: '#14B8A6',
        },
        primary: {
          50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE',
          300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1',
          600: '#4F46E5', 700: '#4338CA', 800: '#3730A3',
          900: '#312E81',
        },
        neutral: {
          0: '#FFFFFF', 50: '#F8FAFC', 100: '#F1F5F9',
          200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8',
          500: '#64748B', 600: '#475569', 700: '#334155',
          800: '#1E293B', 900: '#0F172A',
        },
        success: { 500: '#22C55E', 700: '#15803D' },
        warning: { 500: '#F59E0B', 700: '#B45309' },
        error: { 500: '#EF4444', 700: '#B91C1C' },
        secondary: { 500: '#3B82F6', 700: '#1D4ED8' },
        accent: { 500: '#F97316', 600: '#EA580C' },
      },
      fontFamily: {
        display: ["'Inter'", 'system-ui', '-apple-system', "'Segoe UI'", 'Roboto', 'sans-serif'],
        body: ["'Inter'", 'system-ui', '-apple-system', "'Segoe UI'", 'Roboto', 'sans-serif'],
      },
      spacing: {
        'ds-1': '2px', 'ds-2': '4px', 'ds-3': '8px',
        'ds-4': '12px', 'ds-5': '16px', 'ds-6': '24px',
        'ds-7': '32px', 'ds-8': '40px', 'ds-9': '48px',
      },
      borderRadius: {
        'ds-sm': '4px', 'ds-md': '8px', 'ds-lg': '12px', 'ds-xl': '16px',
      },
      boxShadow: {
        'ds-sm': '0 1px 2px rgba(0,0,0,0.05)',
        'ds-md': '0 2px 4px -1px rgba(0,0,0,0.06), 0 4px 6px -1px rgba(0,0,0,0.1)',
        'ds-lg': '0 4px 6px -2px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1)',
        'ds-xl': '0 10px 25px -5px rgba(0,0,0,0.1), 0 20px 40px -10px rgba(0,0,0,0.08)',
      },
    },
  },
};
```

---

## When Generating HTML Directly

If you're producing a standalone HTML file (no build system), load Inter from Google Fonts (`<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`) and embed the CSS custom properties in the `<style>` block. Use indigo (`#4F46E5`) for the navbar/header region, white (`#FFFFFF`) for card surfaces, and `#F8FAFC` as the page background. Keep layouts clean with the 8px spacing grid. Ensure all interactive elements have visible focus indicators using `primary/500` (#6366F1).

For components (modals, toasts, tables, cards, etc.), read `references/components.md` for the exact sizing, padding, and radius values to use.
