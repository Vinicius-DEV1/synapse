---
name: code-quality-refactoring
description: >-
  Actionable workflow and decision heuristics for refactoring monolithic components,
  hardening code quality, optimizing performance, and reorganizing directory structures
  while strictly preserving 100% functional and visual parity.
---

# Code Quality Refactoring & Hardening

> Activate when refactoring monolithic files, optimizing performance, remediating
> anti-patterns, decomposing components, or reorganizing directory structures.

> [!IMPORTANT]
> This skill provides **actionable workflows and decision heuristics**. All
> foundational rules (SOLID principles, anti-pattern catalog, type safety, performance
> standards, multiplatform handling) are defined in `AGENTS.md` §3–§9 and are always
> loaded. This skill teaches **how and when** to apply them.

---

## 1. Inviolable Constraints

> [!CAUTION]
> 1. **100% Functional Parity** — Never remove features, edge-case handling, keyboard
>    shortcuts, or user capabilities.
> 2. **100% Visual Parity** — Never alter Tailwind classes, CSS tokens, animations,
>    or DOM layout unless the user explicitly requests visual changes.
> 3. **Under-the-Hood Focus** — Default scope is internal logic, resilience, efficiency,
>    and clean architecture.

---

## 2. Decision Heuristics — When to Apply What

### 2.1. When to Decompose a File (SRP)

| Signal | Action |
| :----- | :----- |
| File > 300 lines | Extract sub-components, hooks, or utilities |
| Component does UI + state + I/O | Split into View + Hook + Service |
| Modal/panel has > 3 distinct sections | Extract each section as atomic sub-component |
| Same logic duplicated in 2+ components | Extract into shared hook or utility |
| File has > 5 `useState` declarations | Extract orchestration into custom hook |

### 2.2. When to Virtualize

| Signal | Action |
| :----- | :----- |
| List renders > 50 items simultaneously | Use `react-window` / `react-virtuoso` or CSS `content-visibility: auto` |
| Scrollable grid with images/cards | Add `loading="lazy"` + `decoding="async"` + consider virtual grid |
| DOM node count > 1500 in a single view | Audit and reduce with virtualization or pagination |

### 2.3. When to Code-Split

| Signal | Action |
| :----- | :----- |
| Heavy library in one view (PDF.js, TLDraw, EpubJS, Tesseract) | Wrap with `React.lazy` + `Suspense` |
| Modal/panel imports > 100KB of dependencies | Lazy-load the entire modal component |
| Feature used by < 20% of sessions | Dynamic import behind user action trigger |

### 2.4. When to Extract a Custom Hook

| Signal | Action |
| :----- | :----- |
| `useEffect` with > 10 lines of logic | Extract into `use<Feature>` hook |
| Component mixes UI rendering with async data fetching | Move fetching + state into hook |
| Same lifecycle pattern in 2+ components | Shared hook with parameterization |
| Complex keyboard event handling | Dedicated `useKeyboardNavigation` hook |

### 2.5. When to Optimize Algorithmically

| Signal | Action |
| :----- | :----- |
| `Array.find()` / `Array.filter()` in render path with > 100 items | Pre-index into `Map` or `Set` |
| Nested loops (`O(n²)`) in data transformation | Flatten with hash-based lookups |
| Repeated `.includes()` checks on large arrays | Convert to `Set` for `O(1)` `.has()` |
| String concatenation in tight loop | Use `Array.join()` or template literals |

---

## 3. The 4-Part Decomposition Pattern

When decomposing a monolithic component, target this directory structure:

```text
src/components/<feature>/
├── <Feature>View.tsx              # Pure Presentation Container (< 150 lines)
├── hooks/
│   └── use<Feature>.ts            # Orchestration: state, callbacks, effects
├── components/
│   ├── <Feature>Header.tsx        # Atomic sub-component
│   ├── <Feature>List.tsx          # Atomic sub-component
│   └── <Feature>Item.tsx          # Atomic sub-component
├── services/
│   └── <feature>Utils.ts          # Pure domain logic, algorithms, formatters
└── types/
    └── index.ts                   # Feature-specific strict interfaces
```

### Step-by-Step Execution Order

1. **Extract Types First** — Move all inline interfaces, discriminated unions, and
   action payloads into `types/index.ts`. This creates the contract.

2. **Extract Pure Domain Logic** — Move calculation functions, formatters, validators
   into `services/<feature>Utils.ts`. These must be React-free.

3. **Extract Orchestration Hook** — Move `useState`, `useEffect`, `useCallback`,
   `useMemo`, and async dispatchers into `hooks/use<Feature>.ts`:

   ```typescript
   export interface Use<Feature>Return {
     items: Item[];
     selectedId: string | null;
     isLoading: boolean;
     handleSelect: (id: string) => void;
     handleDelete: (id: string) => Promise<void>;
     handleSearch: (query: string) => void;
   }

   export function use<Feature>(props: <Feature>Props): Use<Feature>Return {
     // All state and side effects here
     return { items, selectedId, isLoading, handleSelect, handleDelete, handleSearch };
   }
   ```

4. **Extract Atomic Sub-Components** — Break the JSX render tree into focused
   sub-components. Each receives only the props it needs.

5. **Assemble Clean View** — The main `<Feature>View.tsx` consumes `use<Feature>()`
   and delegates rendering to sub-components (< 150 lines).

6. **Update Barrel Exports** — Ensure original import paths still work.

---

## 4. Refactoring Workflow

### Step 1: Pre-Audit & Dependency Mapping

1. Read the entire target file. Identify: line count, useState/useEffect count,
   external dependencies, consumer modules.
2. Map Presentation vs Orchestration vs Domain Logic vs Infrastructure I/O.
3. Formulate clear decomposition goals.

### Step 2: Implementation Plan

- Create a plan artifact with: proposed file structure, module boundaries, parity
  guarantees, and verification steps.
- Request user approval before modifying code.

### Step 3: Atomic Execution

- Execute changes in the order: Types → Logic → Hook → Sub-components → View → Exports.
- After each extraction, verify all props, callbacks, and Tailwind tokens are preserved.
- Use atomic commits per logical unit extracted.

### Step 4: Verification

- Run targeted tests: `npx vitest run <target_path>` or `npx vitest related --run <files>`.
- Run type check: `npx tsc -b --noEmit` if cross-module contracts changed.
- Confirm zero visual regressions by reviewing Tailwind class preservation.

---

## 5. Delivery Checklist

- [ ] All original features, edge cases, and keyboard shortcuts preserved?
- [ ] All visual designs, Tailwind classes, and CSS tokens 100% identical?
- [ ] Monolithic files decomposed into single-responsibility modules (< 300 lines)?
- [ ] Presentation cleanly separated from orchestration and domain logic?
- [ ] All `any` eliminated in favor of strict, safe types?
- [ ] All async tasks, subscriptions, and timers properly cleaned up on unmount?
- [ ] All comments in concise English with dead/obsolete comments removed?
- [ ] Multiplatform fallbacks (Tauri vs Web) remain fully operational?
- [ ] Targeted tests pass with zero regressions?
