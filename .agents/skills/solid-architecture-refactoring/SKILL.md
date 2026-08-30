---
name: solid-architecture-refactoring
description: >-
  Refactors monolithic files, tight couplings, and complex modules into clean,
  decoupled, SOLID-compliant architectures while strictly preserving 100%
  functional and visual parity.
---

# Skill: SOLID Architecture & Anti-Monolith Refactoring

Activate this skill when refactoring complex modules, decomposing monolithic "God" files/components (>300 lines), untangling tightly coupled logic, or structuring new architectural subsystems according to **SOLID** and **Clean Architecture** principles in the **Caderno** project.

---

## 1. Absolute Directives

> [!CAUTION]
> ### INVIOLABLE CONSTRAINTS
> 1. **100% Functional Parity**: Never remove or simplify business logic, keyboard shortcuts, edge cases, error states, or user capabilities.
> 2. **100% Visual & Design Parity**: Never alter visual styling, colors, padding, Tailwind classes, animations, or DOM visual output unless explicitly requested.
> 3. **Incremental & Safe Transformation**: Refactor in testable, backward-compatible increments, keeping existing export contracts intact or updating all consumers cleanly.

---

## 2. SOLID Refactoring Playbook

### 2.1. Single Responsibility Principle (SRP) — Anti-Monolith Decomposition

When a file exceeds 300 lines or mixes UI rendering, state management, and I/O logic:

#### The 4-Part Decomposition Pattern:
Transform a monolithic component `MyFeatureView.tsx` into a cohesive feature directory:

```text
src/components/my-feature/
├── MyFeatureView.tsx          # Pure Presentation Container (< 150 lines)
├── hooks/
│   └── useMyFeature.ts        # Orchestration, state, callbacks, side effects
├── components/
│   ├── FeatureHeader.tsx      # Atomic Sub-component
│   ├── FeatureList.tsx        # Atomic Sub-component
│   └── FeatureItem.tsx        # Atomic Sub-component
├── services/
│   └── featureUtils.ts        # Pure domain calculations, formatting, algorithms
└── types/
    └── index.ts               # Feature-specific strict interfaces & types
```

#### Step-by-Step Separation:
1. **Extract Types**: Move inline interfaces and action payloads into `types.ts`.
2. **Extract Pure Domain Logic**: Move calculation functions, string formatters, and array transformations into pure utility files in `services/` or `utils/`.
3. **Extract Orchestration Hook**: Move `useState`, `useEffect`, `useCallback`, and async dispatchers into `hooks/useMyFeature.ts`. Return clean state and action handlers:
   ```typescript
   export function useMyFeature(props: MyFeatureProps) {
     // State, memos, handlers
     return { state, handlers };
   }
   ```
4. **Extract Atomic Sub-Components**: Break down giant JSX render trees into sub-components in `components/`.
5. **Assemble Clean View**: `MyFeatureView.tsx` simply consumes `useMyFeature()` and delegates rendering to sub-components.

---

### 2.2. Open / Closed Principle (OCP) — Extensibility via Strategy & Registry

When encountering nested `switch/case` or chained `if/else` statements that check types/modes (e.g., rendering different view types, file viewers, or editor blocks):

#### Strategy / Registry Pattern:
Instead of hardcoding every variant into a single file:
```typescript
// Define a shared strategy contract
export interface IViewRenderer<T = unknown> {
  canHandle(type: string): boolean;
  render(props: T): React.ReactNode;
}

// Registry map open for new registrations without modifying callers
export class ViewRegistry {
  private static renderers = new Map<string, React.FC<any>>();

  static register(type: string, component: React.FC<any>): void {
    this.renderers.set(type, component);
  }

  static get(type: string): React.FC<any> | undefined {
    return this.renderers.get(type);
  }
}
```

---

### 2.3. Liskov Substitution Principle (LSP) — Multiplatform Interchangeability

When writing platform adapters (Tauri Desktop vs Web Browser / IndexedDB / Cloud):

1. Define a strict common interface (e.g., `IStorageAdapter`, `IAudioService`).
2. Ensure both implementations (`TauriStorageAdapter` and `WebStorageAdapter`) honor the exact same contract, return types, and error handling behavior.
3. Callers must be able to switch between adapters without noticing any behavioral discrepancy.

---

### 2.4. Interface Segregation Principle (ISP) — Granular Client Contracts

1. **Avoid "Fat" Monolithic Interfaces**:
   ```typescript
   // BAD: Monolithic interface forcing all clients to implement everything
   interface IDataManager {
     saveNote(): void;
     loadNote(): void;
     exportPdf(): void;
     generateOcr(): void;
     syncToCloud(): void;
   }

   // GOOD: Granular, segregated interfaces
   interface INoteRepository {
     saveNote(note: Note): Promise<void>;
     loadNote(id: string): Promise<Note | null>;
   }
   interface IPdfExporter {
     exportPdf(doc: Note): Promise<Uint8Array>;
   }
   interface ICloudSyncService {
     sync(): Promise<SyncResult>;
   }
   ```
2. Components and hooks should only declare dependencies on the sub-interfaces they actually use.

---

### 2.5. Dependency Inversion Principle (DIP) — Decoupled UI from Infrastructure

1. **Never Import Platform Drivers Directly in Presentation Components**:
   - Do NOT import `@tauri-apps/plugin-fs` or raw IndexedDB handles directly inside a button click handler in a React component.
2. **Inject via Services or Custom Hooks**:
   - Presentation components call `const { saveFile } = useFileStorage();`.
   - `useFileStorage` uses the adapter provided by the platform context / dependency container.

---

## 3. Standard Refactoring Workflow

### Step 1: Analyze & Map Dependencies
- Inspect the file and its callers.
- Identify all props, local state variables, side effects, and external dependencies.

### Step 2: Create Implementation Plan Artifact
- Create `implementation_plan.md` outlining the proposed modular structure, file splits, and interface definitions.
- Request user approval.

### Step 3: Extract & Reassemble
- Extract types and pure utilities first.
- Extract the custom hook.
- Extract atomic sub-components.
- Reassemble the main container view.
- Re-export the main component from the original path or update barrel exports.

### Step 4: Verification & Automated Tests
- Run `npm test` / `vitest` to verify that all existing tests pass.
- Run typecheck to verify zero TypeScript errors.

---

## 4. Delivery Checklist

- [ ] Has the file been decomposed into cohesive modules (<300 lines each)?
- [ ] Is presentation cleanly separated from state orchestration and business logic?
- [ ] Are all UI styles, CSS/Tailwind classes, and layout positions 100% identical?
- [ ] Are platform-specific APIs (Tauri/Web) properly isolated behind abstractions?
- [ ] Are all interfaces segregated and types strictly typed without `any`?
- [ ] Do all automated tests pass without regressions?
