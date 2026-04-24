# Color Tokens — Complete Reference

This file contains every color token from the design system. Organized bottom-up: primitives first, then semantic aliases, then theme-resolved values.

## Table of Contents

1. [Primitive Palettes](#primitive-palettes) — raw hex values
2. [Semantic Aliases](#semantic-aliases) — role-based mapping to primitives
3. [Light Theme](#light-theme) — resolved values for light mode
4. [Dark Theme](#dark-theme) — resolved values for dark mode
5. [State Layers](#state-layers) — interaction overlays

---

## Primitive Palettes

These are the base colors. Everything else references these.

### Neutral (Slate Grays)

| Token | Hex |
|-------|-----|
| `neutral/0` | `#FFFFFF` |
| `neutral/50` | `#F8FAFC` |
| `neutral/100` | `#F1F5F9` |
| `neutral/200` | `#E2E8F0` |
| `neutral/300` | `#CBD5E1` |
| `neutral/400` | `#94A3B8` |
| `neutral/500` | `#64748B` |
| `neutral/600` | `#475569` |
| `neutral/700` | `#334155` |
| `neutral/750` | `#293548` |
| `neutral/800` | `#1E293B` |
| `neutral/850` | `#172033` |
| `neutral/900` | `#0F172A` |

### Indigo (Primary Brand)

| Token | Hex |
|-------|-----|
| `indigo/50` | `#EEF2FF` |
| `indigo/100` | `#E0E7FF` |
| `indigo/200` | `#C7D2FE` |
| `indigo/300` | `#A5B4FC` |
| `indigo/400` | `#818CF8` |
| `indigo/500` | `#6366F1` |
| `indigo/600` | `#4F46E5` |
| `indigo/700` | `#4338CA` |
| `indigo/800` | `#3730A3` |
| `indigo/900` | `#312E81` |

### Blue (Secondary)

| Token | Hex |
|-------|-----|
| `blue/50` | `#EFF6FF` |
| `blue/100` | `#DBEAFE` |
| `blue/200` | `#BFDBFE` |
| `blue/300` | `#93C5FD` |
| `blue/400` | `#60A5FA` |
| `blue/500` | `#3B82F6` |
| `blue/600` | `#2563EB` |
| `blue/700` | `#1D4ED8` |
| `blue/800` | `#1E40AF` |
| `blue/900` | `#1E3A8A` |

### Green (Success)

| Token | Hex |
|-------|-----|
| `green/50` | `#F0FDF4` |
| `green/100` | `#DCFCE7` |
| `green/200` | `#BBF7D0` |
| `green/300` | `#86EFAC` |
| `green/400` | `#4ADE80` |
| `green/500` | `#22C55E` |
| `green/600` | `#16A34A` |
| `green/700` | `#15803D` |
| `green/800` | `#166534` |
| `green/900` | `#14532D` |

### Amber (Warning)

| Token | Hex |
|-------|-----|
| `amber/50` | `#FFFBEB` |
| `amber/100` | `#FEF3C7` |
| `amber/200` | `#FDE68A` |
| `amber/300` | `#FCD34D` |
| `amber/400` | `#FBBF24` |
| `amber/500` | `#F59E0B` |
| `amber/600` | `#D97706` |
| `amber/700` | `#B45309` |
| `amber/800` | `#92400E` |
| `amber/900` | `#78350F` |

### Red (Error)

| Token | Hex |
|-------|-----|
| `red/50` | `#FEF2F2` |
| `red/100` | `#FEE2E2` |
| `red/200` | `#FECACA` |
| `red/300` | `#FCA5A5` |
| `red/400` | `#F87171` |
| `red/500` | `#EF4444` |
| `red/600` | `#DC2626` |
| `red/700` | `#B91C1C` |
| `red/800` | `#991B1B` |
| `red/900` | `#7F1D1D` |

### Orange (Accent / Coral)

| Token | Hex |
|-------|-----|
| `orange/50` | `#FFF7ED` |
| `orange/100` | `#FFEDD5` |
| `orange/200` | `#FED7AA` |
| `orange/300` | `#FDBA74` |
| `orange/400` | `#FB923C` |
| `orange/500` | `#F97316` |
| `orange/600` | `#EA580C` |
| `orange/700` | `#C2410C` |
| `orange/800` | `#9A3412` |
| `orange/900` | `#7C2D12` |

### Teal (Highlight)

| Token | Hex |
|-------|-----|
| `teal/50` | `#F0FDFA` |
| `teal/100` | `#CCFBF1` |
| `teal/200` | `#99F6E4` |
| `teal/300` | `#5EEAD4` |
| `teal/400` | `#2DD4BF` |
| `teal/500` | `#14B8A6` |
| `teal/600` | `#0D9488` |
| `teal/700` | `#0F766E` |
| `teal/800` | `#115E59` |
| `teal/900` | `#134E4A` |

---

## Semantic Aliases

These map semantic roles to the primitives above. Use semantic names in your code so themes work correctly.

| Semantic | Maps to Primitive |
|----------|-------------------|
| `primary/*` | `indigo/*` (e.g., `primary/600` = `indigo/600` = `#4F46E5`) |
| `secondary/*` | `blue/*` (e.g., `secondary/500` = `blue/500` = `#3B82F6`) |
| `success/*` | `green/*` (e.g., `success/500` = `green/500` = `#22C55E`) |
| `warning/*` | `amber/*` (e.g., `warning/500` = `amber/500` = `#F59E0B`) |
| `error/*` | `red/*` (e.g., `error/500` = `red/500` = `#EF4444`) |
| `accent/*` | `orange/*` (e.g., `accent/500` = `orange/500` = `#F97316`) |
| `highlight/*` | `teal/*` (e.g., `highlight/500` = `teal/500` = `#14B8A6`) |

All shades (50 through 900) map 1:1.

---

## Light Theme

These are the resolved values for light mode. Use these token names in your theme layer.

### Brand

| Token | Resolves To | Hex |
|-------|-------------|-----|
| `brand/primary` | `primary/600` | `#4F46E5` |
| `brand/accent` | `accent/500` | `#F97316` |
| `brand/highlight` | `highlight/500` | `#14B8A6` |

### Backgrounds

| Token | Resolves To | Hex |
|-------|-------------|-----|
| `background/base-l0` | `neutral/50` | `#F8FAFC` |
| `background/surface-l1` | `neutral/0` | `#FFFFFF` |

### Borders

| Token | Resolves To | Hex |
|-------|-------------|-----|
| `border/border` | `neutral/200` | `#E2E8F0` |
| `border/divider` | `neutral/100` | `#F1F5F9` |
| `border/focus-ring` | `primary/500` | `#6366F1` |

### Text

| Token | Resolves To | Hex |
|-------|-------------|-----|
| `text/title` | `indigo/900` | `#312E81` → use `#1E1B4B` for maximum contrast |
| `text/primary` | `neutral/900` | `#0F172A` → use `#111827` for body copy |
| `text/secondary` | `neutral/700` | `#334155` → use `#374151` |
| `text/tertiary` | `neutral/500` | `#64748B` → use `#6B7280` |
| `text/disabled` | `neutral/400` | `#94A3B8` → use `#9CA3AF` |
| `text/link` | `primary/600` | `#4F46E5` |
| `text/visited-link` | `primary/800` | `#3730A3` |

### Tables

| Token | Resolves To | Hex |
|-------|-------------|-----|
| `table/parent-layer-l0` | `neutral/0` | `#FFFFFF` |
| `table/child-layer-l1` | `neutral/50` | `#F8FAFC` |
| `table/disabled-layer` | `neutral/200` | `#E2E8F0` |

### Utility / Status

| Token | Resolves To | Hex |
|-------|-------------|-----|
| `utility/success-surface` | `success/700` | `#15803D` |
| `utility/on-success-surface` | `neutral/0` | `#FFFFFF` |
| `utility/success-text` | `success/700` | `#15803D` |
| `utility/warning-surface` | `warning/500` | `#F59E0B` |
| `utility/on-warning-surface` | `neutral/900` | `#0F172A` |
| `utility/warning-text` | `neutral/800` | `#1E293B` |
| `utility/error-surface` | `error/700` | `#B91C1C` |
| `utility/on-error-surface` | `neutral/0` | `#FFFFFF` |
| `utility/error-text` | `error/700` | `#B91C1C` |

---

## Dark Theme

### Backgrounds

| Token | Resolves To | Hex |
|-------|-------------|-----|
| `background/base-l0` | `neutral/900` | `#0F172A` |
| `background/surface-l1` | `neutral/800` | `#1E293B` |

### Borders

| Token | Resolves To | Hex |
|-------|-------------|-----|
| `border/border` | `neutral/600` | `#475569` |
| `border/divider` | `neutral/700` | `#334155` |
| `border/focus-ring` | `primary/400` | `#818CF8` |

### Text

| Token | Resolves To | Hex |
|-------|-------------|-----|
| `text/title` | `neutral/0` | `#FFFFFF` |
| `text/primary` | `neutral/0` | `#FFFFFF` |
| `text/secondary` | `neutral/300` | `#CBD5E1` |
| `text/tertiary` | `neutral/400` | `#94A3B8` |
| `text/disabled` | `neutral/600` | `#475569` |
| `text/link` | `primary/400` | `#818CF8` |
| `text/visited-link` | `primary/300` | `#A5B4FC` |

### Utility / Status (Dark)

| Token | Resolves To | Hex |
|-------|-------------|-----|
| `utility/success-surface` | `success/400` | `#4ADE80` |
| `utility/success-text` | `success/300` | `#86EFAC` |
| `utility/warning-surface` | `warning/400` | `#FBBF24` |
| `utility/warning-text` | `warning/300` | `#FCD34D` |
| `utility/error-surface` | `error/400` | `#F87171` |
| `utility/error-text` | `error/300` | `#FCA5A5` |

Brand colors (`primary`, `accent`, `highlight`) remain the same in dark mode.

---

## State Layers

Semi-transparent overlays for interactive states. Apply on top of the element's background.

### Interaction mapping

| State | Opacity | Use |
|-------|---------|-----|
| Hovered | 12% | Mouse hover |
| Focused | 12% | Keyboard focus |
| Pressed | 16% | Active/click |
| Dragged | 20% | Drag in progress |
| Selected | 24% | Selected item |

### Light surfaces (white overlay)

| Opacity | Hex |
|---------|-----|
| 12% | `#FFFFFF1F` |
| 16% | `#FFFFFF29` |
| 20% | `#FFFFFF33` |
| 24% | `#FFFFFF3D` |

### Dark surfaces — by role

| Role | 12% | 16% | 20% | 24% |
|------|-----|-----|-----|-----|
| Primary (indigo) | `#4F46E51F` | `#4F46E529` | `#4F46E533` | `#4F46E53D` |
| Neutral (slate) | `#0F172A1F` | `#0F172A29` | `#0F172A33` | `#0F172A3D` |
| Success (green) | `#15803D1F` | `#15803D29` | `#15803D33` | `#15803D3D` |
| Warning (amber) | `#B453091F` | `#B4530929` | `#B4530933` | `#B453093D` |
| Error (red) | `#B91C1C1F` | `#B91C1C29` | `#B91C1C33` | `#B91C1C3D` |
| Accent (orange) | `#EA580C1F` | `#EA580C29` | `#EA580C33` | `#EA580C3D` |
| Highlight (teal) | `#0D94881F` | `#0D948829` | `#0D948833` | `#0D94883D` |
