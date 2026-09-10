---
name: caderno-design-system
description: >-
  Official design system and visual style guide for Caderno: authentic brand palette
  (brand-400, brand-500, brand-300, brand-600), dark canvas (#0f0e17 / #1a1924),
  whisper-thin borders, and cross-module aesthetic harmony across Caderno, Anki, Files, and Questions.
---

# Caderno Design System & Visual Style Standards

This skill defines the official visual architecture, design tokens, color palette, component hierarchies, and cross-module harmony guidelines for the **Caderno** ecosystem. All modules (Caderno Editor, Anki Flashcards, Files Explorer, Questions & Quizzes, Settings, and Embedded Widgets) must strictly adhere to these standards.

---

## 1. Core Visual Architecture: The Caderno Identity

The app's visual architecture is established in `tailwind.config.mjs` and must never be altered or replaced with arbitrary grays or external palettes:

1. **Deep Canvas & Surfaces (`dark-*`)**:
   - **Main Background (`bg-dark-bg`)**: `#0f0e17` (deep dark blue/midnight canvas). Never replace with flat gray `bg-zinc-950` or `#000000`.
   - **Elevated Surfaces / Cards (`bg-dark-card`)**: `#1a1924` (subtle dark surface).
   - **Tertiary Surfaces (`bg-dark-surface`)**: `#15141b`.
   - **Text Tokens**: `text-dark-text` (`#fffffe`), `text-dark-subtext` (`#a7a9be`).

2. **Primary Interactive Accent (`brand-*`)**:
   - The signature accent of the application (the blue/periwinkle accent seen on headings, link cards, and badges):
     - `brand-300: #c4b5fd` (active chip text, link metadata, subtle text accents)
     - `brand-400: #a78bfa` (links, titles, active icons, input borders)
     - `brand-500: #8b5cf6` (main brand highlight, badges, checkmarks)
     - `brand-600: #7c3aed` (interactive button base, hover states)
   - **Opacity Accents**:
     - Badges / Icon backgrounds: `bg-brand-500/10 text-brand-400 border border-brand-500/20`
     - Active chips / selections: `bg-brand-500/20 text-brand-300 border border-brand-500/40`
     - Focus rings: `focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20`
     - Card hover border: `hover:border-brand-500/30`
     - Subdued action buttons: `bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50`
     - Solid action buttons: `bg-brand-600 hover:bg-brand-500 text-white`

3. **Strict Prohibition on Flat Gray Overwrites**:
   - **NEVER** strip `brand` accents to turn components completely gray (`zinc-800`, `zinc-900`, `zinc-400`, `white/5`).
   - The app has a distinct, beautiful brand identity. "Minimalism" means avoiding unnecessary clutter, screaming neons, and layout jumps — **NOT** wiping out the application's color architecture and turning everything into lifeless monochrome gray.

4. **Whisper-Thin Borders (Hairline Outlines)**:
   - Resting card & container borders: `border border-white/5` or `border border-white/[0.06]`.
   - Card hover border: `hover:border-brand-500/30` or `hover:border-white/10`.
   - Active/selected focus ring: `ring-1 ring-brand-400/50 border-brand-400`.

5. **Semantic Functional Accents**:
   - **Correct / Success**: Soft emerald (`text-emerald-400/90`, `bg-emerald-500/10`, `border-emerald-500/20`).
   - **Incorrect / Error**: Muted rose (`text-rose-400/90`, `bg-rose-500/10`, `border-rose-500/20`).
   - **Warning / Review**: Gentle warm amber (`text-amber-400/90`, `bg-amber-500/10`, `border-amber-500/20`).

---

## 2. Component Standards

### 2.1. Buttons
1. **Solid Primary Action**:
   - `px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all`
   - Usage: Primary triggers (e.g., "Nova Bateria", "Iniciar Simulado").
2. **Subdued Primary Action**:
   - `px-3 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50 text-xs font-medium active:scale-95 transition-all`
   - Usage: Row triggers (e.g., "Praticar", "Iniciar no Modo Foco").
3. **Hover-Revealed Row Actions**:
   - Secondary actions (edit, delete, external links) on list rows and cards must remain hidden at rest and fade in on hover:
     `opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity`

### 2.2. Embedded Note Widgets (e.g., QuestionBlockNodeView)
- Container: `bg-dark-card/50 hover:bg-white/[0.04] border border-white/5 hover:border-brand-500/30 rounded-xl`
- Icon: `p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20`
- Launch button: `bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50` with `<Play size={11} className="fill-brand-300" />`
- Secondary actions: `opacity-0 group-hover:opacity-100`

---

## 3. Consistency Checklist

Before concluding any visual changes:
- [ ] Uses `bg-dark-bg` (`#0f0e17`) and `bg-dark-card` (`#1a1924`), NEVER flat `zinc-950` as canvas.
- [ ] Interactive elements, links, and badges use the `brand-*` system (`brand-400`, `brand-300`, `brand-500`).
- [ ] Secondary row actions are hidden at rest and revealed on hover (`opacity-0 group-hover:opacity-100`).
- [ ] Full functional parity and all tests pass with zero regressions.
