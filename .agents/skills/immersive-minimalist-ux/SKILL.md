---
name: immersive-minimalist-ux
description: >-
  Designs and refactors full-canvas, distraction-free study and reading experiences
  with sophisticated neutral palettes, ergonomic typography, cognitive noise suppression,
  and keyboard-first fluidity (zero mouse fatigue).
---

# Skill: Immersive Minimalist Architecture & Zen Visual Design

Activate this skill when designing, refactoring, or optimizing focus modes, document/markdown viewers, question/quiz players, revision inspectors, or reader components in the **Caderno** project to achieve elite, distraction-free immersion inspired by modern industry benchmarks (Claude, Notion, Typeform, Anki).

---

## 1. Core Directives & Philosophy

> [!IMPORTANT]
> ### THE ZEN IMMERSION PHILOSOPHY
> 1. **Full-Canvas Viewport over Floating Modals**:
>    - Study and reading sessions demand unbroken cognitive flow. Never constrain the user inside floating pop-up boxes (`max-w-3xl`, heavy outer shadows, stacked backdrops, double scrollbars).
>    - Elevate focus modes to true full-viewport canvases (`fixed inset-0 z-[100] bg-zinc-950 flex flex-col`).
> 2. **Silence the Noise (Zero Visual Screaming)**:
>    - Replace high-saturation colors (loud purples, harsh yellow warnings) with refined neutral grays (`zinc-950`, `zinc-900`, `zinc-800`, `zinc-400`, `zinc-100`).
>    - Accents must be functional, subdued, and gentle on the eyes.
> 3. **Ergonomic Keyboard-First Navigation (Zero Mouse Fatigue)**:
>    - Resolving questions or navigating pages must never require hunting for small buttons with a mouse. Direct key bindings (`A-D`, `Enter`, `Space`, `Esc`, `Arrows`) must drive 100% of the workflow.

---

## 2. Visual Architecture Pillars

### 2.1. Viewport Structure & Header
- **Root Container**:
  ```tsx
  <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-fade-in select-none">
  ```
- **Sticky Minimalist Header**:
  - Height: `h-12` to `h-14` (thin and unobtrusive).
  - Background: `bg-zinc-950/80 backdrop-blur-md border-b border-white/[0.04]`.
  - Content: Title of session / document on the left, subtle progression indicator (`03 / 10`), and a quiet exit action (`Esc` badge + close button) on the right.
- **Reading Progress**:
  - Rely on natural scroll position or an ultrafine hairline indicator (`h-0.5 bg-zinc-400`).
  - Never stack multiple conflicting progress bars or percentage labels.

### 2.2. Content Center & Ergonomic Measure
- **Reading Measure**: Constrain active content to `max-w-2xl` or `max-w-3xl mx-auto px-4 md:px-6 w-full`.
- **Vertical Breathing Space**: Use generous vertical margins and padding (`py-6 md:py-10 space-y-6 md:space-y-8`) to prevent cognitive claustrophobia.
- **Typography**:
  - Questions and headings: `text-lg md:text-xl font-medium text-zinc-100 leading-relaxed`.
  - Body / explanations: `text-sm md:text-base text-zinc-300 leading-relaxed`.

### 2.3. Option & Alternative Layout (Questions / Lists)
- **Single-Column Stacking**: Avoid dense multi-column grids that require saccadic eye scanning. Stack options vertically with generous tap/click targets (`py-3.5 px-4 rounded-xl`).
- **Option Styling Spectrum**:
  - **Default**: `bg-zinc-900/60 border border-white/[0.06] text-zinc-200 hover:bg-zinc-800/80 hover:border-white/[0.12] transition-all`.
  - **Selected / Focused**: `bg-zinc-800 border-zinc-600 text-white shadow-sm ring-1 ring-white/10`.
  - **Correct (Evaluated)**: `bg-emerald-500/10 border-emerald-500/25 text-emerald-200`.
  - **Incorrect (Evaluated)**: `bg-rose-500/10 border-rose-500/25 text-rose-200 line-through opacity-80`.
- **Keyboard Badges**:
  - Display subtle shortcut pills on options (`w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.08] text-xs font-mono font-medium text-zinc-400`).

### 2.4. Keyboard Interaction Engine
- Add a centralized `useEffect` keydown listener or container key handler:
  ```typescript
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (['a', 'b', 'c', 'd', 'e'].includes(e.key.toLowerCase())) {
      const idx = e.key.toLowerCase().charCodeAt(0) - 97;
      if (options[idx]) handleSelectOption(idx);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleProceedNext();
    } else if (e.key.toLowerCase() === 'g') {
      toggleExplanation();
    }
  };
  ```

---

## 3. Implementation Checklist

Before completing any immersive view or focus modal refactoring:
- [ ] Converted floating modal box (`max-w-3xl`, `max-h-[92vh]`) to true full-canvas (`fixed inset-0 bg-zinc-950`).
- [ ] Verified background color palette uses soothing neutrals (`zinc-950`, `zinc-900`, `zinc-800`) with hairline borders (`border-white/[0.04]`).
- [ ] Eliminated redundant badges, duplicate tags, and conflicting progress bars during active focus.
- [ ] Ensured typography uses relaxed measure and comfortable line height (`leading-relaxed`).
- [ ] Implemented complete keyboard support (`A-D`, `Enter`, `Space`, `Esc`, `Arrows`) with subtle visual cues.
- [ ] Verified that full functional parity is preserved (bookmarks, scoring, sound effects, AI feedback, explanations).
- [ ] Tested build via `npm run build` and confirmed zero regressions.
