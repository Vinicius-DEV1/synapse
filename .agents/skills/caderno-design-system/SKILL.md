---
name: caderno-design-system
description: >-
  Official design system and visual style guide for Caderno: brand palette, dark canvas
  tokens, typography, component patterns, icon standards, animation system, and cross-module
  aesthetic harmony.
---

# Caderno Design System & Visual Style Standards

This skill defines the official visual architecture, design tokens, component patterns, and cross-module harmony guidelines for the **Caderno** ecosystem. All modules must strictly adhere to these standards.

> [!IMPORTANT]
> **Palette Context Rule**: This design system governs the **main application UI** (sidebar, editor, panels, settings, lists). **Immersive focus modes** (question players, readers, media viewers) use a deliberately neutral `zinc-950` canvas — see `immersive-minimalist-ux` skill for those specific patterns. This is by design, not a conflict.

---

## 1. Color Architecture

All tokens are defined in [`tailwind.config.mjs`](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/tailwind.config.mjs) and must never be replaced with arbitrary grays or external palettes.

### 1.1. Canvas & Surfaces (`dark-*`)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-dark-bg` | `#0f0e17` | Main application background (deep midnight). **Never** replace with `bg-zinc-950` or `#000`. |
| `bg-dark-card` | `#1a1924` | Elevated surfaces, cards, panels, modal backgrounds |
| `bg-dark-surface` | `#15141b` | Tertiary surfaces, subtle section separators |
| `text-dark-text` | `#fffffe` | Primary text color |
| `text-dark-subtext` | `#a7a9be` | Secondary text, descriptions, metadata |

### 1.2. Brand Accent System (`brand-*`)

The signature blue/periwinkle accent that defines Caderno's visual identity:

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-50` | `#f5f3ff` | Lightest tint (rarely used) |
| `brand-100` | `#ede9fe` | Very light backgrounds |
| `brand-200` | `#ddd6fe` | Light text on dark backgrounds |
| `brand-300` | `#c4b5fd` | Active chip text, link metadata, subtle text accents |
| `brand-400` | `#a78bfa` | Links, titles, active icons, input focus borders |
| `brand-500` | `#8b5cf6` | Main brand highlight, badges, checkmarks |
| `brand-600` | `#7c3aed` | Interactive button base, hover states |
| `brand-700` | `#6d28d9` | Pressed/active button states |
| `brand-800` | `#5b21b6` | Deep accents |
| `brand-900` | `#4c1d95` | Darkest brand shade |
| `brand-950` | `#2e1065` | Ultra-dark brand (used sparingly) |

### 1.3. Brand Opacity Patterns

| Context | Pattern |
|---------|---------|
| Badge / Icon background | `bg-brand-500/10 text-brand-400 border border-brand-500/20` |
| Active chip / selection | `bg-brand-500/20 text-brand-300 border border-brand-500/40` |
| Input focus ring | `focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20` |
| Card hover border | `hover:border-brand-500/30` |
| Subdued action button | `bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50` |
| Solid action button | `bg-brand-600 hover:bg-brand-500 text-white` |

### 1.4. Semantic Functional Colors

| State | Text | Background | Border |
|-------|------|-----------|--------|
| **Success / Correct** | `text-emerald-400/90` | `bg-emerald-500/10` | `border-emerald-500/20` |
| **Error / Incorrect** | `text-rose-400/90` | `bg-rose-500/10` | `border-rose-500/20` |
| **Warning / Review** | `text-amber-400/90` | `bg-amber-500/10` | `border-amber-500/20` |

### 1.5. Strict Prohibition

> [!CAUTION]
> **NEVER** strip `brand-*` accents to turn components completely gray (`zinc-800`, `zinc-900`, `zinc-400`, `white/5`). Caderno has a distinct, beautiful brand identity. "Minimalism" means avoiding clutter and neons — NOT wiping out the color architecture into lifeless monochrome.

---

## 2. Typography

### 2.1. Font Stack

The app uses the system font stack via Tailwind defaults. No custom Google Fonts are currently imported.

### 2.2. Type Scale

| Element | Classes |
|---------|---------|
| Page title / H1 | `text-xl font-semibold text-dark-text` |
| Section heading / H2 | `text-lg font-semibold text-dark-text` |
| Card title / H3 | `text-sm font-semibold text-dark-text` |
| Body text | `text-sm text-dark-subtext leading-relaxed` |
| Small / metadata | `text-xs text-dark-subtext` |
| Micro labels | `text-[10px] text-dark-subtext` |
| Code / monospace | `text-xs font-mono` |
| Button text (primary) | `text-xs font-semibold` |
| Button text (secondary) | `text-xs font-medium` |

---

## 3. Borders & Shadows

### 3.1. Whisper-Thin Borders (Hairline Outlines)

| Context | Pattern |
|---------|---------|
| Resting card / container | `border border-white/5` or `border border-white/[0.06]` |
| Card hover | `hover:border-brand-500/30` or `hover:border-white/10` |
| Active / selected | `ring-1 ring-brand-400/50 border-brand-400` |
| Input resting | `border border-white/10` |
| Input focus | `focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20` |
| Dividers | `border-t border-white/[0.04]` |

### 3.2. Shadows

Shadows are used sparingly in the dark theme. When needed:
- Cards: `shadow-sm` (subtle elevation)
- Modals: `shadow-xl` (strong separation from background)
- Buttons: `shadow-sm` on primary actions only

---

## 4. Component Patterns

### 4.1. Buttons

| Type | Classes |
|------|---------|
| **Solid Primary** | `px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all` |
| **Subdued Primary** | `px-3 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50 text-xs font-medium active:scale-95 transition-all` |
| **Ghost / Subtle** | `px-2 py-1 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 text-xs transition-all` |
| **Danger** | `px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 text-xs font-medium transition-all` |

### 4.2. Inputs & Selects

```
rounded-xl bg-dark-surface border border-white/10 text-sm text-dark-text 
placeholder:text-dark-subtext/50
focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 focus:outline-none
transition-all
```

### 4.3. Cards

```
bg-dark-card border border-white/5 rounded-xl 
hover:border-brand-500/30 hover:bg-white/[0.02]
transition-all duration-150
```

### 4.4. Modals & Dialogs

```
{/* Backdrop */}
<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />

{/* Modal container */}
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="w-full max-w-lg bg-dark-card border border-white/[0.08] 
    rounded-2xl shadow-xl animate-scale-in">
    {/* Content */}
  </div>
</div>
```

### 4.5. Tooltips

```
bg-zinc-800 text-xs text-zinc-200 px-2 py-1 rounded-lg border border-white/[0.08] shadow-md
```

### 4.6. Toasts / Notifications

```
bg-dark-card border border-white/[0.08] rounded-xl shadow-lg px-4 py-3 
text-sm text-dark-text animate-scale-in
```

### 4.7. Context Menus / Dropdowns

```
bg-dark-card border border-white/[0.08] rounded-xl shadow-xl py-1 animate-scale-in

{/* Menu item */}
px-3 py-2 text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 
transition-colors cursor-pointer
```

### 4.8. Tabs / Tab Bars

```
{/* Tab bar */}
flex gap-1 p-1 bg-dark-surface rounded-xl border border-white/5

{/* Tab (inactive) */}
px-3 py-1.5 rounded-lg text-xs font-medium text-dark-subtext hover:text-dark-text 
hover:bg-white/5 transition-all

{/* Tab (active) */}
px-3 py-1.5 rounded-lg text-xs font-medium text-brand-300 bg-brand-500/15 
border border-brand-500/25
```

### 4.9. Sidebar Items

```
{/* Sidebar item (inactive) */}
flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-dark-subtext 
hover:text-dark-text hover:bg-white/5 transition-all

{/* Sidebar item (active) */}
flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-brand-300 
bg-brand-500/10 border border-brand-500/20
```

### 4.10. Hover-Revealed Row Actions

Secondary actions (edit, delete, links) on list rows and cards must remain hidden at rest:
```
opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150
```

### 4.11. Embedded Note Widgets (e.g., QuestionBlockNodeView)

```
{/* Container */}
bg-dark-card/50 hover:bg-white/[0.04] border border-white/5 hover:border-brand-500/30 rounded-xl

{/* Icon badge */}
p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20

{/* Launch button (hover-revealed) */}
bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50
```

---

## 5. Icons (Lucide)

| Context | Size | Stroke Width | Opacity |
|---------|------|-------------|---------|
| Sidebar navigation | `size={18}` | Default (2) | Full |
| Button inline icon | `size={14}` to `size={16}` | Default (2) | Full |
| Badge / pill icon | `size={12}` to `size={14}` | `strokeWidth={2.5}` | Full |
| Card metadata icon | `size={14}` | Default (2) | `opacity-70` or `text-dark-subtext` |
| Action icon (hover-revealed) | `size={14}` to `size={16}` | Default (2) | `text-dark-subtext hover:text-dark-text` |
| Empty state icon | `size={40}` to `size={56}` | `strokeWidth={1}` | `text-dark-subtext/30` |

---

## 6. Animation System

### 6.1. Keyframes (from `tailwind.config.mjs`)

| Animation | Keyframes | Duration | Easing | Usage |
|-----------|----------|----------|--------|-------|
| `animate-fade-in` | `opacity: 0 → 1` | `200ms` | `ease-out` | Page/modal entrance |
| `animate-scale-in` | `opacity: 0, scale: 0.95 → opacity: 1, scale: 1` | `150ms` | `ease-out` | Dropdowns, toasts, tooltips |
| `animate-shake` | `translate: 0 → -5px → 5px → 0` | `200ms` | `ease-in-out` | Error feedback (wrong password, invalid input) |

### 6.2. Transition Standards

| Context | Classes |
|---------|---------|
| General interactive elements | `transition-all duration-150` |
| Color-only changes | `transition-colors duration-150` |
| Opacity reveals (hover actions) | `transition-opacity duration-150` |
| Button press feedback | `active:scale-95 transition-all` |
| Content fade-in | `transition-all duration-200 ease-out` |

### 6.3. GPU Acceleration Rules

- **Animate only**: `transform` (translate3d, scale, rotate) and `opacity`
- **Never animate**: `top`, `left`, `width`, `height`, `margin`, `padding` (these trigger layout reflow)
- **`will-change`**: Use sparingly and only during active animations, remove after completion

---

## 7. Consistency Checklist

Before concluding any visual changes:
- [ ] Canvas uses `bg-dark-bg` / `bg-dark-card` (NEVER flat `zinc-950` in main app UI)
- [ ] Interactive elements use `brand-*` tokens (`brand-400`, `brand-300`, `brand-500`, `brand-600`)
- [ ] Borders use whisper-thin patterns (`border-white/5` to `border-white/[0.08]`)
- [ ] Secondary row actions hidden at rest, revealed on hover (`opacity-0 group-hover:opacity-100`)
- [ ] Buttons follow the 4 established patterns (Solid, Subdued, Ghost, Danger)
- [ ] Icons use correct Lucide sizes and stroke widths per context
- [ ] Animations use established keyframes, not ad-hoc custom animations
- [ ] All transitions use `duration-150` or `duration-200` — no jarring instant changes
- [ ] Full functional parity preserved, zero visual regressions
