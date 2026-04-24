# Component & Layout Tokens — Complete Reference

## Table of Contents

1. [Spacing Scale](#spacing-scale)
2. [Dimension Scale](#dimension-scale)
3. [Size Primitives](#size-primitives)
4. [Border Radius](#border-radius)
5. [Border Width](#border-width)
6. [Shadows](#shadows)
7. [Breakpoints](#breakpoints)
8. [Layout Grid](#layout-grid)
9. [Z-Index](#z-index)
10. [Opacity](#opacity)
11. [Animation](#animation)
12. [Icon Sizes](#icon-sizes)
13. [Component Specs](#component-specs)

---

## Spacing Scale

Use these for margins, padding, and gaps between elements.

| Token | Maps To | Value |
|-------|---------|-------|
| `spacing/0` | `size/0` | 0px |
| `spacing/1` | `size/25` | 2px |
| `spacing/2` | `size/50` | 4px |
| `spacing/3` | `size/100` | 8px |
| `spacing/4` | `size/150` | 12px |
| `spacing/5` | `size/200` | 16px |
| `spacing/6` | `size/300` | 24px |
| `spacing/7` | `size/400` | 32px |
| `spacing/8` | `size/500` | 40px |
| `spacing/9` | `size/600` | 48px |
| `spacing/10` | `size/700` | 56px |
| `spacing/11` | `size/800` | 64px |
| `spacing/12` | `size/1000` | 80px |
| `spacing/13` | `size/1200` | 96px |

---

## Dimension Scale

Use these for component width/height sizing (buttons, inputs, avatars, etc.).

| Token | Maps To | Value |
|-------|---------|-------|
| `dimension/1` | `size/100` | 8px |
| `dimension/2` | `size/150` | 12px |
| `dimension/3` | `size/200` | 16px |
| `dimension/4` | `size/300` | 24px |
| `dimension/5` | `size/400` | 32px |
| `dimension/6` | `size/450` | 36px |
| `dimension/7` | `size/500` | 40px |
| `dimension/8` | `size/600` | 48px |
| `dimension/9` | `size/700` | 56px |
| `dimension/10` | `size/800` | 64px |
| `dimension/11` | `size/1200` | 96px |
| `dimension/12` | `size/1600` | 128px |

---

## Size Primitives

The raw size scale that spacing and dimension tokens reference.

| Token | Value |
|-------|-------|
| `size/0` | 0px |
| `size/25` | 2px |
| `size/50` | 4px |
| `size/100` | 8px |
| `size/150` | 12px |
| `size/200` | 16px |
| `size/300` | 24px |
| `size/400` | 32px |
| `size/450` | 36px |
| `size/500` | 40px |
| `size/600` | 48px |
| `size/700` | 56px |
| `size/800` | 64px |
| `size/1000` | 80px |
| `size/1200` | 96px |
| `size/1600` | 128px |

---

## Border Radius

| Token | Maps To | Value |
|-------|---------|-------|
| `radius/0` | `size/0` | 0px |
| `radius/1` | `size/25` | 2px |
| `radius/2` | `size/50` | 4px |
| `radius/3` | `size/100` | 8px |
| `radius/4` | `size/150` | 12px |
| `radius/5` | `size/200` | 16px |
| `radius/6` | `size/300` | 24px |
| `radius/7` | `size/400` | 32px |
| `radius/8` | `size/500` | 40px |
| `radius/9` | `size/600` | 48px |
| `radius/10` | `size/700` | 56px |
| `radius/11` | `size/800` | 64px |
| Full pill | — | 9999px |

**Common usage**: `radius/2` (4px) for buttons/inputs, `radius/3` (8px) for cards/dropdowns, `radius/4` (12px) for modals/large cards, `9999px` for pills/avatars/toggles.

---

## Border Width

| Token | Value |
|-------|-------|
| `border-width-thin` | 1px |
| `border-width-medium` | 1.5px |
| `border-width-thick` | 2px |

---

## Shadows

| Token | Value | Use |
|-------|-------|-----|
| `shadow-sm` | `0px 1px 2px rgba(0,0,0,0.05)` | Subtle lift (navbar, card at rest) |
| `shadow-md` | `0px 2px 4px -1px rgba(0,0,0,0.06), 0px 4px 6px -1px rgba(0,0,0,0.1)` | Default card shadow |
| `shadow-lg` | `0px 4px 6px -2px rgba(0,0,0,0.05), 0px 10px 15px -3px rgba(0,0,0,0.1)` | Elevated (dropdowns, toasts) |
| `shadow-xl` | `0px 10px 25px -5px rgba(0,0,0,0.1), 0px 20px 40px -10px rgba(0,0,0,0.08)` | Modals, dialogs |

---

## Breakpoints

| Token | Value | Mode Name |
|-------|-------|-----------|
| `breakpoint/wide` | 1280px | Wide (1280+) — Default |
| `breakpoint/desktop` | 1024px | Desktop (1024-1279) |
| `breakpoint/tablet` | 768px | Tablet (768-1023) |
| `breakpoint/mobile` | 320px | Mobile (320-767) |

### Media query pattern

```css
/* Mobile first */
@media (min-width: 768px)  { /* tablet */ }
@media (min-width: 1024px) { /* desktop */ }
@media (min-width: 1280px) { /* wide */ }
```

---

## Layout Grid

### Wide (1280px+)

| Property | Value |
|----------|-------|
| Min width | 1280px |
| Max width | 1440px |
| Margins | 24px |
| Gutter | 48px |
| Sidebar min | 280px |
| Side menu | 240px |

### Desktop (1024px - 1279px)

| Property | Value |
|----------|-------|
| Min width | 1024px |
| Max width | 1279px |
| Margins | 24px |
| Gutter | 24px |
| Sidebar min | 280px |
| Side menu | 240px |

### Tablet (768px - 1023px)

| Property | Value |
|----------|-------|
| Min width | 768px |
| Max width | 1023px |
| Margins | 24px |
| Gutter | 24px |
| Sidebar min | 280px |
| Side menu | 240px |

### Mobile (320px - 767px)

| Property | Value |
|----------|-------|
| Min width | 320px |
| Max width | 767px |
| Margins | 16px |
| Gutter | 16px |
| Sidebar min | 120px |
| Sidebar max | 120px |

---

## Z-Index

| Token | Value | Use |
|-------|-------|-----|
| `z-index-base` | 0 | Default stacking |
| `z-index-dropdown` | 10 | Dropdown menus |
| `z-index-sticky` | 20 | Sticky headers |
| `z-index-overlay` | 30 | Overlay backdrops |
| `z-index-modal` | 40 | Modal dialogs |
| `z-index-toast` | 50 | Toast notifications |

---

## Opacity

| Token | Value | Use |
|-------|-------|-----|
| `opacity-disabled` | 0.4 | Disabled elements |
| `opacity-overlay` | 0.6 | Modal backdrop |
| `opacity-hover-overlay` | 0.8 | Hover overlay |

---

## Animation

### Duration

| Token | Value | Use |
|-------|-------|-----|
| `duration-fast` | 100ms | Micro-interactions (hover, focus) |
| `duration-normal` | 200ms | Standard transitions |
| `duration-slow` | 300ms | Larger animations (modals, drawers) |

### Easing

| Token | Value | Use |
|-------|-------|-----|
| `easing-ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exiting elements |
| `easing-ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Entering elements |
| `easing-ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | General movement |

---

## Icon Sizes

| Token | Value |
|-------|-------|
| `icon-size-sm` | 16px |
| `icon-size-md` | 24px |
| `icon-size-lg` | 32px |

---

## Component Specs

Exact token values for common UI components. Use these when building or styling components.

### Card

| Property | Value |
|----------|-------|
| Border radius | 12px (`radius/4`) |
| Shadow | `shadow-md` |
| Padding | 24px (`spacing/6`) |

### Modal

| Property | Value |
|----------|-------|
| Overlay background | `rgba(0,0,0,0.6)` |
| Overlay z-index | 40 |
| Dialog border radius | 12px |
| Dialog shadow | `shadow-xl` |
| Dialog padding | 24px |

### Toast

| Property | Value |
|----------|-------|
| Border radius | 8px (`radius/3`) |
| Shadow | `shadow-lg` |
| Padding | 16px 20px |
| Z-index | 50 |

### Tooltip

| Property | Value |
|----------|-------|
| Border radius | 4px (`radius/2`) |
| Padding | 8px 12px |
| Shadow | `shadow-md` |

### Badge

| Property | Value |
|----------|-------|
| Border radius | 9999px (pill) |
| Padding | 4px 8px |
| Font size | 12px |

### Table

| Property | Value |
|----------|-------|
| Cell padding | 12px 16px |
| Border width | 1px |
| Header font weight | 600 |
| Header bg (light) | `#F8FAFC` (`neutral/50`) |
| Alternating row bg | `#F1F5F9` (`neutral/100`) |

### Tabs

| Property | Value |
|----------|-------|
| Border radius | 8px |
| Padding | 12px 20px |
| Active border width | 2px |

### Accordion

| Property | Value |
|----------|-------|
| Border radius | 8px |
| Padding | 16px |
| Header font weight | 600 |

### Checkbox

| Property | Value |
|----------|-------|
| Size | 20px |
| Border radius | 4px |
| Border width | 1.5px |

### Radio

| Property | Value |
|----------|-------|
| Size | 20px |
| Border radius | 9999px |
| Border width | 1.5px |

### Toggle / Switch

| Property | Value |
|----------|-------|
| Width | 44px |
| Height | 24px |
| Thumb size | 20px |
| Border radius | 9999px |

### Select / Dropdown

| Property | Value |
|----------|-------|
| Min height | 40px |
| Padding | 12px 16px |
| Border radius | 8px |

### Avatar

| Size | Value |
|------|-------|
| Small | 32px |
| Medium | 40px |
| Large | 64px |
| Border radius | 9999px |

### Breadcrumb

| Property | Value |
|----------|-------|
| Font size | 14px |
| Spacing | 8px |

### Pagination

| Property | Value |
|----------|-------|
| Item size | 32px |
| Border radius | 4px |
| Spacing | 4px |

### Progress Bar

| Property | Value |
|----------|-------|
| Height | 8px |
| Border radius | 9999px |

### Skeleton Loader

| Property | Value |
|----------|-------|
| Border radius | 8px |
| Opacity | 0.7 |

### Navbar

| Property | Value |
|----------|-------|
| Height | 64px |
| Padding | 16px 24px |
| Shadow | `shadow-sm` |

### Footer

| Property | Value |
|----------|-------|
| Padding | 40px 24px |
| Border top width | 1px |
