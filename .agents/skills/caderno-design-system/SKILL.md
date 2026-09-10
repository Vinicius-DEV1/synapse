---
name: caderno-design-system
description: >-
  Official design system and visual style guide for Caderno: unified neutral dark palette,
  whisper-thin borders, semantic accents, button hierarchies, and embedded widget standards
  ensuring 100% aesthetic harmony across Caderno, Anki, Files, and Questions.
---

# Caderno Design System & Visual Style Standards

This skill defines the official visual architecture, design tokens, color palette, component hierarchies, and cross-module harmony guidelines for the **Caderno** ecosystem. All modules (Caderno Editor, Anki Flashcards, Files Explorer, Questions & Quizzes, Settings, and Embedded Widgets) must strictly adhere to these standards.

---

## 1. Core Visual Philosophy: Zen Minimalism & Zero Screaming

1. **Refined Dark Neutral Canvas**:
   - The interface must feel calming, professional, and immersive (inspired by Linear, Claude, Notion, and VS Code).
   - Never use harsh pitch black (`#000000`) or muddy washed-out grays.
   - Deep rich neutrals:
     - **Main Background (`bg-dark-bg`)**: `#0f0e17` (or `bg-zinc-950`)
     - **Elevated Surfaces / Cards (`bg-dark-card`)**: `#1a1924` (or `bg-zinc-900/60` to `bg-zinc-900/80`)
     - **Tertiary Surfaces (`bg-dark-surface`)**: `#15141b` (or `bg-zinc-950/60`)
     - **Subtle Hover Surface**: `bg-white/[0.04]` to `bg-white/[0.06]`

2. **Whisper-Thin Borders (Hairline Outlines)**:
   - High-contrast white or bright borders cause eye fatigue.
   - Standard card & container borders: `border border-white/5` or `border border-white/[0.06]`.
   - Hover card border: `hover:border-white/[0.12]`.
   - Active/selected focus ring: `ring-1 ring-white/20` or soft brand accent `border-brand-500/40`.

3. **Subdued, Purposeful Semantic & Brand Accents**:
   - Accents provide consistent functional identity across Caderno, Anki, and Questions, without oversaturating the screen.
   - **Unified Brand / Indigo (Shades of Blue/Indigo)**:
     - The signature interactive accent throughout Caderno and Anki is **Indigo** (`#6366f1` / `indigo-500`, `indigo-600`, `indigo-400`).
     - **Primary Buttons / Key Triggers**: `bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-sm active:scale-95` (e.g., "Estudar" no Anki, "Praticar" e "Nova Bateria" em Questões, "Salvar").
     - **Active Chips / Filters**: `bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 font-medium`.
     - **Interactive Badges / Origin Links**: `bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25`.
     - **Focus Rings**: `focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20`.
     - **Container Hover Accent**: `hover:border-indigo-500/30`.
   - **Correct / Success**: Soft emerald (`text-emerald-400/90`, `bg-emerald-500/10`, `border-emerald-500/20`).
   - **Incorrect / Error**: Muted rose (`text-rose-400/90`, `bg-rose-500/10`, `border-rose-500/20`).
   - **Warning / Review**: Gentle warm amber (`text-amber-400/90`, `bg-amber-500/10`, `border-amber-500/20`).
   - **Neutral Fallback**: `text-zinc-200`, `bg-white/10`, `border-white/15`.

---

## 2. Color Palette & Typography Tokens

### 2.1. Surfaces & Backgrounds
| Token | Tailwind Class | Hex / RGBA Value | Usage |
| :--- | :--- | :--- | :--- |
| Canvas Root | `bg-dark-bg` / `bg-zinc-950` | `#0f0e17` | Full app canvas and viewports |
| Card / Container | `bg-dark-card` / `bg-zinc-900/60` | `#1a1924` / `rgba(24,24,27,0.6)` | Content cards, lists, sidebars |
| Card Hover | `hover:bg-white/5` / `hover:border-indigo-500/30` | `rgba(255,255,255,0.05)` | Interactive row/card hover |
| Overlay / Modal | `bg-zinc-950/80 backdrop-blur-md` | `rgba(9,9,11,0.8)` | Headers, sticky bars, modals |

### 2.2. Typography
| Token | Tailwind Class | Usage |
| :--- | :--- | :--- |
| Primary Text | `text-zinc-100` / `text-white` | Headings, card titles, primary content |
| Secondary Text | `text-zinc-300` / `text-dark-text` | Body copy, active options, descriptions |
| Subtext / Meta | `text-zinc-400` / `text-dark-subtext` | Counts, timestamps, types, labels |
| Muted / Inactive | `text-zinc-500` / `text-zinc-600` | Placeholders, inactive icons, breadcrumb separators |
| Monospace Metrics | `font-mono text-xs` / `text-[10px]` | Numbers, byte sizes, question counts, percentages |

---

## 3. Component Styling Standards

### 3.1. Buttons
1. **Primary Action**:
   - Classes: `px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm shadow-indigo-600/20 active:scale-95 transition-all`
   - Purpose: Main positive actions (e.g. "+ Adicionar", "Estudar", "Praticar", "Nova Bateria", "Iniciar Simulado").
2. **Secondary Neutral Action**:
   - Classes: `px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06] hover:border-white/15 text-xs font-medium transition-all active:scale-95`
   - Purpose: Secondary actions (e.g. "Cancelar", "Editar", "Filtro").
3. **Ghost / Icon Button**:
   - Classes: `p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors`
   - Purpose: Row actions, toolbar controls, more options ("...").
4. **Hover-Revealed Row Actions**:
   - Classes: `opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity`
   - Purpose: Never clutter multiple table or list rows with visible action icons when reading. They appear smoothly on hover.

### 3.2. Filter Chips & Tags
1. **Unselected Chip**:
   - Classes: `px-2.5 py-1 rounded-lg text-xs font-medium bg-dark-bg/50 hover:bg-white/[0.06] text-zinc-400 hover:text-white border border-white/5 transition-all`
2. **Selected Chip**:
   - Classes: `px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 shadow-sm transition-all`

### 3.3. Embedded Widgets in Caderno Notes (e.g., QuestionBlock, FocusWidget, FileWidget)
1. **Widget Container**:
   - Must look like a seamless, integrated block within the note document.
   - Classes: `w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-dark-card/50 hover:bg-white/[0.04] border border-white/5 hover:border-indigo-500/30 transition-all select-none`
2. **Left Indicator Icon**:
   - Harmonious indigo badge: `p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0`.
3. **Launch / Focus Button inside Widget**:
   - Refined indigo action: `px-2.5 py-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95`
4. **Secondary Actions (`ExternalLink`, `Edit`, `Trash`)**:
   - Must be `opacity-0 group-hover:opacity-100 transition-opacity` so notes remain calm and readable until the user hovers over the block.

---

## 4. Cross-Module Consistency Checklist

Before closing any UI task:
- [ ] Surface backgrounds use `bg-dark-bg` (`#0f0e17`) or `bg-dark-card` (`#1a1924` / `bg-zinc-900/60`).
- [ ] Borders are whisper-thin (`border-white/5` or `border-white/[0.06]`), not thick or bright.
- [ ] Secondary action buttons use refined neutral styling (`bg-white/[0.04]`), not saturated purple.
- [ ] Repetitive row action icons (`...`, edit, delete) fade in on hover (`opacity-0 group-hover:opacity-100`).
- [ ] Accuracy/success metrics use gentle emerald (`text-emerald-400/90`), error review uses gentle rose (`text-rose-400/90`), warnings use gentle amber (`text-amber-400/90`).
- [ ] All interactive elements have micro-interactions (`transition-all active:scale-95`).
- [ ] Full functional parity is strictly preserved.
