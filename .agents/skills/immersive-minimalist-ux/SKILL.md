---
name: immersive-minimalist-ux
description: >-
  Actionable patterns and code recipes for building full-canvas, distraction-free
  study and reading experiences with ergonomic typography, cognitive noise suppression,
  and keyboard-first fluidity (zero mouse fatigue).
---

# Immersive Minimalist Architecture & Zen Visual Design

> Activate when designing, refactoring, or optimizing focus modes, document viewers,
> question/quiz players, revision inspectors, or reader components to achieve elite,
> distraction-free immersion.

> [!IMPORTANT]
> **Palette Reconciliation with Design System**:
> The main application UI uses the `brand-*` palette and `bg-dark-bg` (#0f0e17)
> canvas — see `design-system` skill. **Immersive focus modes** intentionally use
> `bg-zinc-950` as their canvas because:
> 1. They mount as **full-viewport overlays** (`fixed inset-0 z-[100]`) ABOVE the
>    main app
> 2. Pure neutral `zinc-950` eliminates blue undertone, reducing visual fatigue
>    during extended study sessions
> 3. Absence of `brand-*` accents in the canvas reinforces cognitive focus — accent
>    colors are reserved exclusively for functional feedback (correct/incorrect/warning)
>
> This is a deliberate design decision, not a conflict.

---

## 1. Core Philosophy

1. **Full-Canvas Viewport over Floating Modals** — Study and reading sessions demand
   unbroken cognitive flow. Never constrain the user inside floating pop-up boxes.
2. **Silence the Noise** — Replace high-saturation colors with refined neutrals.
   Accents must be functional, subdued, and gentle.
3. **Keyboard-First Navigation** — 100% of workflow must be drivable via keyboard.
   Mouse is optional, never required.

---

## 2. Component Recipes

### 2.1. Root Container & Viewport Structure

```tsx
{/* Full-viewport immersive canvas */}
<div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-fade-in select-none">

  {/* Sticky minimalist header (h-12 to h-14) */}
  <header className="sticky top-0 z-10 h-12 flex items-center justify-between px-4
    bg-zinc-950/80 backdrop-blur-md border-b border-white/[0.04] shrink-0">

    {/* Left: session title */}
    <span className="text-sm font-medium text-zinc-300 truncate">
      {sessionTitle}
    </span>

    {/* Center: progress counter (single source of truth) */}
    <span className="text-xs font-mono text-zinc-500">
      {`${currentIndex + 1} / ${totalCount}`}
    </span>

    {/* Right: exit button with Esc badge */}
    <button onClick={onClose} className="flex items-center gap-1.5 text-zinc-500
      hover:text-zinc-300 transition-colors">
      <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08]
        text-[10px] font-mono">Esc</kbd>
      <X size={16} />
    </button>
  </header>

  {/* Scrollable content area */}
  <main className="flex-1 overflow-y-auto">
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6 md:space-y-8">
      {children}
    </div>
  </main>
</div>
```

### 2.2. Reading Progress Indicator

Use ONE progress representation — never stack competing bars, badges, and percentages:

```tsx
{/* Ultrafine hairline progress bar at the very top */}
<div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-900">
  <div
    className="h-full bg-zinc-600 transition-all duration-300 ease-out"
    style={{ width: `${progressPercent}%` }}
  />
</div>
```

### 2.3. Question/Option Layout

```tsx
{/* Single-column vertical stacking with generous hit areas */}
<div className="space-y-3">
  {options.map((option, idx) => {
    const letter = String.fromCharCode(65 + idx); // A, B, C, D
    return (
      <button
        key={option.id}
        onClick={() => handleSelect(idx)}
        className={cn(
          "w-full flex items-start gap-3 py-3.5 px-4 rounded-xl text-left transition-all",
          "bg-zinc-900/60 border border-white/[0.06] text-zinc-200",
          "hover:bg-zinc-800/80 hover:border-white/[0.12]",
          isSelected && "bg-zinc-800 border-zinc-600 text-white shadow-sm ring-1 ring-white/10",
          isCorrect && "bg-emerald-500/10 border-emerald-500/25 text-emerald-200",
          isWrong && "bg-rose-500/10 border-rose-500/25 text-rose-200 line-through opacity-80",
        )}
      >
        <kbd className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md
          bg-white/[0.05] border border-white/[0.08] text-xs font-mono font-medium text-zinc-400">
          {letter}
        </kbd>
        <span className="text-sm md:text-base leading-relaxed">{option.text}</span>
      </button>
    );
  })}
</div>
```

### 2.4. Semantic Feedback Colors

| State          | Background          | Border                   | Text              |
| :------------- | :------------------ | :----------------------- | :---------------- |
| **Correct**    | `bg-emerald-500/10` | `border-emerald-500/25`  | `text-emerald-200` |
| **Incorrect**  | `bg-rose-500/10`    | `border-rose-500/25`     | `text-rose-200`    |
| **Warning**    | `bg-amber-500/10`   | `border-amber-500/25`    | `text-amber-200`   |
| **Active**     | `bg-zinc-800`       | `ring-1 ring-white/10`   | `text-white`       |
| **Neutral**    | `bg-zinc-900/60`    | `border-white/[0.06]`    | `text-zinc-200`    |

### 2.5. Keyboard Interaction Engine

```typescript
function useImmersiveKeyboard(config: {
  options: unknown[];
  onSelect: (index: number) => void;
  onProceed: () => void;
  onToggleExplanation?: () => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  enabled?: boolean;
}): void {
  useEffect(() => {
    if (config.enabled === false) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case 'Escape':
          config.onClose();
          break;
        case 'a': case 'b': case 'c': case 'd': case 'e':
        case 'A': case 'B': case 'C': case 'D': case 'E': {
          const idx = e.key.toLowerCase().charCodeAt(0) - 97;
          if (idx < config.options.length) config.onSelect(idx);
          break;
        }
        case '1': case '2': case '3': case '4': case '5': {
          const idx = parseInt(e.key) - 1;
          if (idx < config.options.length) config.onSelect(idx);
          break;
        }
        case 'Enter':
        case ' ':
          e.preventDefault();
          config.onProceed();
          break;
        case 'g': case 'G':
          config.onToggleExplanation?.();
          break;
        case 'ArrowLeft':
          config.onPrev?.();
          break;
        case 'ArrowRight':
          config.onNext?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config]);
}
```

### 2.6. Component-Specific Adaptations

| Component             | Keyboard                           | Layout                        | Notes |
| :-------------------- | :--------------------------------- | :---------------------------- | :---- |
| **Question Player**   | `A-E` select, `Enter` confirm, `G` explanation | Vertical stacked options | Hide metadata during solving |
| **Document Reader**   | `Arrow` scroll, `F` fullscreen     | `max-w-3xl` reading column    | `scroll-behavior: smooth` |
| **History Inspector** | `Arrow` navigate versions          | Side-by-side or stacked diff  | Highlight changes with amber |
| **Media Viewer**      | `Space` play/pause, `F` fullscreen | Centered, dark surround       | Auto-hide controls |
| **Flashcard Review**  | `Space` reveal, `1-4` rate         | Centered card, large text     | `transform rotateY` flip |

---

## 3. Typography Standards

| Element           | Classes                                              |
| :---------------- | :--------------------------------------------------- |
| Question/Heading  | `text-lg md:text-xl font-medium text-zinc-100 leading-relaxed` |
| Body/Explanation  | `text-sm md:text-base text-zinc-300 leading-relaxed` |
| Option text       | `text-sm md:text-base text-zinc-200 leading-relaxed` |
| Counter/Meta      | `text-xs font-mono text-zinc-500`                    |
| Shortcut badge    | `text-[10px] font-mono font-medium text-zinc-400`    |

---

## 4. Checklist

Before completing any immersive view:

- [ ] Full-canvas viewport (`fixed inset-0 z-[100] bg-zinc-950`), NOT a floating modal
- [ ] Single progress representation (counter OR bar, never both)
- [ ] Neutral palette: `zinc-950` canvas, `zinc-900` surfaces, `white/[0.04]` borders
- [ ] Semantic accents only: emerald (correct), rose (incorrect), amber (warning)
- [ ] Complete keyboard support with visible shortcut badges
- [ ] Input/textarea elements excluded from keyboard shortcuts
- [ ] `Escape` always closes/exits the immersive view
- [ ] All functional features preserved
- [ ] Content constrained to `max-w-2xl` to `max-w-3xl` reading measure
- [ ] Targeted tests pass with zero regressions
