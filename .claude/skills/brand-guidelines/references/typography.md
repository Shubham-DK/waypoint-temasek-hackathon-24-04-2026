# Typography Tokens — Complete Reference

## Table of Contents

1. [Font Families](#font-families)
2. [Font Weights](#font-weights)
3. [Font Sizes](#font-sizes)
4. [Line Heights](#line-heights)
5. [Letter Spacing](#letter-spacing)
6. [Desktop Typescale](#desktop-typescale)
7. [Mobile Typescale](#mobile-typescale)
8. [Usage Guidelines](#usage-guidelines)

---

## Font Families

| Token | Value | CSS Fallback Stack |
|-------|-------|--------------------|
| `typeface/font/display` | **Inter** | `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |
| `typeface/font/default` | **Inter** | `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |

**Font loading**: Inter is a free, open-source font designed for computer screens. Load from Google Fonts (`https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`) or bundle locally. The system font fallback stack ensures graceful degradation if Inter is not available.

---

## Font Weights

| Token | Value | CSS Weight |
|-------|-------|------------|
| `typeface/weight/regular` | Regular | `400` |
| `typeface/weight/medium` | Medium | `500` |
| `typeface/weight/prominent` | SemiBold | `600` |
| `typeface/weight/extra-prominent` | Bold | `700` |

---

## Font Sizes

| Token | Value |
|-------|-------|
| `typeface/size/xxs` | `11px` |
| `typeface/size/xs` | `12px` |
| `typeface/size/sm` | `14px` |
| `typeface/size/md` | `16px` |
| `typeface/size/lg` | `18px` |
| `typeface/size/xl` | `24px` |
| `typeface/size/2xl` | `28px` |

---

## Line Heights

| Token | Value |
|-------|-------|
| `typeface/line-height/xxs` | `12px` |
| `typeface/line-height/xs` | `16px` |
| `typeface/line-height/sm` | `20px` |
| `typeface/line-height/md` | `24px` |
| `typeface/line-height/lg` | `28px` |
| `typeface/line-height/xl` | `32px` |
| `typeface/line-height/2xl` | `36px` |

---

## Letter Spacing

| Token | Value | Use |
|-------|-------|-----|
| `typeface/tracking/tight` | `-0.025em` | Display text, large headings |
| `typeface/tracking/default` | `0px` | Normal text |
| `typeface/tracking/caps` | `0.05em` | ALL CAPS labels |

---

## Desktop Typescale

The complete set of predefined type styles for desktop (breakpoint >= 768px):

| Style | Font | Weight | Size | Line Height | Letter Spacing |
|-------|------|--------|------|-------------|----------------|
| `header_1` | Inter | Bold (700) | 28px | 36px | -0.025em |
| `header_2` | Inter | SemiBold (600) | 24px | 32px | -0.025em |
| `body_1` | Inter | Regular (400) | 16px | 24px | 0 |
| `body_1_semibold` | Inter | SemiBold (600) | 16px | 24px | 0 |
| `body_2` | Inter | Regular (400) | 14px | 20px | 0 |
| `subheader_1` | Inter | Bold (700) | 16px | 24px | 0 |
| `subheader_2` | Inter | Bold (700) | 14px | 20px | 0 |
| `subheader_3` | Inter | SemiBold (600) | 12px | 16px | 0 |
| `label_1` | Inter | Medium (500) | 14px | 20px | 0 |
| `label_2` | Inter | Medium (500) | 12px | 16px | 0 |
| `label_all_caps_1` | Inter | Medium (500) | 14px | 20px | 0.05em |
| `label_all_caps_2` | Inter | Medium (500) | 12px | 16px | 0.05em |
| `label_all_caps_3` | Inter | Medium (500) | 11px | 12px | 0.05em |

---

## Mobile Typescale

Only headers change on mobile (breakpoint < 768px). Everything else stays the same.

| Style | Desktop | Mobile |
|-------|---------|--------|
| `header_1` | 28px / 36px LH | **22px / 28px LH** |
| `header_2` | 24px / 32px LH | **18px / 24px LH** |
| All others | Same | Same |

---

## Usage Guidelines

### When to use each style

| Context | Style(s) |
|---------|----------|
| Page title / Hero heading | `header_1` |
| Section heading | `header_2` |
| Card title / Panel heading | `subheader_1` |
| Table column header | `subheader_2` |
| Small group label | `subheader_3` |
| Body copy | `body_1` |
| Emphasized body text | `body_1_semibold` |
| Secondary body text / compact text | `body_2` |
| Form labels, input text | `label_1` |
| Captions, footnotes, badges | `label_2` |
| Category tags, status labels | `label_all_caps_1` or `label_all_caps_2` |
| Tiny legal / metadata | `label_all_caps_3` |

### CSS class pattern

```css
.text-header-1 {
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-weight: 700;
  font-size: 28px;
  line-height: 36px;
  letter-spacing: -0.025em;
}

.text-header-2 {
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-weight: 600;
  font-size: 24px;
  line-height: 32px;
  letter-spacing: -0.025em;
}

.text-body-1 {
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 24px;
}

.text-body-2 {
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 20px;
}

.text-label-1 {
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-weight: 500;
  font-size: 14px;
  line-height: 20px;
}

.text-label-caps {
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-weight: 500;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Mobile override */
@media (max-width: 767px) {
  .text-header-1 {
    font-size: 22px;
    line-height: 28px;
  }
  .text-header-2 {
    font-size: 18px;
    line-height: 24px;
  }
}
```
