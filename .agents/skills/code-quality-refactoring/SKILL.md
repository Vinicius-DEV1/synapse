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

### 2.6. When to Consolidate into Unified Core (`core/synapse-core`)

| Signal | Action |
| :----- | :----- |
| Controller (C++), Tauri command, or Android ViewModel writes raw SQL (`SELECT ... FROM ...`) | Move repository query and schema types into `core/synapse-core/` |
| Client computes business metrics (balances, streaks, quiz stats, card queues) | Move calculation into `core/synapse-core/` domain submodules; expose via bridges |
| Same persistence or business logic duplicated between Qt, Tauri, Web, and Mobile | Consolidate in `core/synapse-core` as Single Source of Truth (SSOT) |
| C++ controller exceeds 300 lines due to JSON serialization and query assembly | Refactor into thin presentation controller using high-level bridge functions |
| Domain file in `core/synapse-core/` exceeds 250 lines (Monolith Risk) | Decompose into folder: `models.rs`, `calculations.rs` / `logic.rs`, sub-repositories, `mod.rs`, `tests.rs` |
| Bridge file in `bridges/` exceeds 250 lines | Decompose into domain-specific sub-files (`domain/<feature>.rs`) under `mod.rs` |

---

## 3. Cross-Application Module Boundaries

Shared refactoring outcomes are equivalent behavior and maintainable counterpart structure, not identical physical trees. React/Tauri uses its established UI/hook/service/API layers; Qt uses QML plus thin C++ controllers and `bridge-qt`; Compose uses `features/<module>/ui/` plus ViewModels/UniFFI; the Expo shell remains integration-only. For Android lifecycle and native UX checks, use [`android-native-parity`](../android-native-parity/SKILL.md).

Keep each module discoverable under the same canonical ID across app targets. Follow each app's layer boundaries instead of copying one framework's folder layout into every client:

| App | Presentation | Orchestration | Domain and persistence |
| :--- | :--- | :--- | :--- |
| React/Tauri | `apps/web-react/src/components/<module>/` | `src/hooks/`, `src/store/`, or a focused module hook directory | `core/synapse-core/` (Tauri commands delegate directly); `src/services/<module>/` for Web |
| Qt desktop | `apps/desktop-qt/qml/<module>/` | `src/controllers/<module>/` (thin adapters exposing `Q_PROPERTY`) | `core/synapse-core/` via `bridges/bridge-qt/` high-level domain APIs |
| Android Compose | `app/src/main/java/com/synapse/features/<module>/ui/` | A module `viewmodel/` package when needed | `core/synapse-core/` via `bridges/bridge-uniffi/` |
| Expo WebView | Host shell only | Shell lifecycle | No duplicate product domain; delegate to the React app |

Keep shared app-level composition and platform adapters out of feature folders. Use the canonical names in `docs/architecture/module-structure.md`; preserve public route keys and persisted IDs when renaming source directories.

### Cross-Client Counterpart Naming

- Before extracting or moving a shared feature, check the counterpart map in `docs/architecture/module-structure.md` and preserve the canonical module ID, semantic component/action names, typed payload field names, and test scenario names.
- Keep corresponding files atomic and easy to compare. Align module-local groupings (`components/table/`, `modals/`, or `ui/`) when a real counterpart exists, but retain framework-native layer roots and naming suffixes (`.tsx`, `.qml`, `Screen.kt`, `ViewModel`).
- Do not create empty mirror folders, duplicate implementations of Core-owned logic, or one-function wrappers just to make the trees look identical. Use a documented direct mapping when idiomatic language naming requires a different public symbol.
- When an extraction changes the counterpart map, update it in the same stage and keep React UI/layout unchanged unless the user explicitly requests a web change.

For broader cross-client naming and contract work, use [`cross-platform-module-parity`](../cross-platform-module-parity/SKILL.md).

### Step-by-Step Execution Order

1. **Extract Types First** — Move inline interfaces, discriminated unions, and
   action payloads into `apps/web-react/src/types/` or a cohesive module `types.ts`.
   This creates the contract before the implementation moves.

2. **Extract Pure Domain Logic** — Move calculation functions, formatters, and
   validators into `apps/web-react/src/services/<module>/`. Keep these React-free.

3. **Extract Orchestration Hook** — Move `useState`, `useEffect`, `useCallback`,
   `useMemo`, and async dispatchers into `apps/web-react/src/hooks/` or a focused
   hook directory owned by that module:

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

6. **Update Consumers and Exports** — Update imports after moves. Add a barrel only
   when it is the module's intentional public API; do not keep compatibility wrappers
   solely to preserve obsolete paths.

---

## 4. Refactoring Workflow

### Step 1: Pre-Audit & Dependency Mapping

1. Read the entire target file. Identify: line count, useState/useEffect count,
   external dependencies, consumer modules.
2. Map Presentation vs Orchestration vs Domain Logic vs Infrastructure I/O.
3. Formulate clear decomposition goals and identify the owning app-specific module path.

### Step 2: Implementation Plan

- Record a concise plan with the proposed file structure, module boundaries, parity
  guarantees, and verification steps. Use a separate plan artifact for multi-module
  or high-risk reorganizations.
- Confirm authorization before modifying code. An explicit authorization already given for the current migration or reorganization applies to its necessary follow-up path updates; ask only when a new irreversible or external action is outside that authorization.

### Step 3: Atomic Execution

- Execute changes in the order: Types → Logic → Hook → Sub-components → View → Exports.
- After each extraction, verify all props, callbacks, and Tailwind tokens are preserved.
- Use atomic commits per logical unit extracted.

### Step 4: Verification

- Run targeted tests: `npm run test -- <target_path>` or `npm run test:related -- <files>`.
- Run type check: `npm run typecheck` if cross-module contracts changed.
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
