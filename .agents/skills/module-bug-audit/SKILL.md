---
name: module-bug-audit
description: >-
  Thoroughly audits a specified module or directory for bugs, race conditions,
  memory leaks, SOLID violations, and integration flaws, generating a complete
  mitigation plan with a mandatory second-pass review loop and detailed diagnostic logging strategies.
---

# Skill: Deep Module Bug Audit & Mitigation Plan

Activate this skill when the user requests an inspection, bug audit, code health review, or deep scan of a specific module, component, or directory in the **Caderno** project.

---

## 1. Objectives

Perform a thorough, multi-stage inspection on the specified module to:
- **Identify Logical Bugs & Edge Cases**: Null/undefined dereferencing, boundary condition errors, malformed payloads, async race conditions.
- **Audit Architectural & SOLID Health**: Detect monolithic "God" files (>300 lines), SRP violations, tight coupling between UI and storage/IPC drivers, and LSP adapter inconsistencies.
- **Audit Multiplatform Integrations**: Tauri v2 (Rust backend IPC) vs Web/Browser IndexedDB/Firestore compatibility, unhandled platform errors, and path resolution edge cases.
- **Inspect Reactivity & Lifecycle**: Unmounted state updates, memory leaks in event listeners/timers/Yjs CRDT observers, infinite re-render loops, and stale closures.
- **Validate Type Safety**: Detect `any`, `as any`, unvalidated type assertions (`as unknown as T`), and missing return type contracts.
- **Formulate Deep Diagnostic Logging**: Design high-resolution, contextual log checkpoints that trace asynchronous execution flows, isolate root causes, and confirm bug mitigation at runtime.

---

## 2. Four-Phase Audit Protocol

### Phase 1: Scope & Dependency Mapping
1. Identify all files belonging to the target module (e.g., `src/services/storage/`, `src/components/editor-extensions/`, etc.).
2. Map public contracts (interfaces, types, exports) and consumer modules (where this module is imported/consumed).
3. Check existing automated tests for the module and its direct dependencies.

### Phase 2: First Pass - Line-by-Line Deep Scan
Examine all module files across critical audit vectors:

1. **Async Flow & Concurrency**:
   - Are there unhandled `async/await` operations without structured `try/catch`?
   - Can asynchronous operations resolve after component unmount?
   - Are there race conditions where concurrent calls overwrite newer state with stale data?
2. **SOLID & Code Structure**:
   - Does any component or function exceed single responsibility boundaries (e.g., a component doing UI rendering, IndexedDB transactions, and image resizing)?
   - Are there monolithic files (>300 lines) that should be decomposed into sub-components, custom hooks, and domain services?
3. **Type Safety & Data Integrity**:
   - Are there any `any` types, loose casts, or unvalidated IPC/IndexedDB responses?
   - Are data interfaces strict with proper discriminated unions and type guards?
4. **Platform & Multiplatform Compatibility (Tauri vs Web)**:
   - Do native Tauri calls (`@tauri-apps/api`, fs/dialog plugins) have resilient fallbacks for web/browser environments?
   - Do file path resolvers properly handle cross-platform quirks (spaces, accents, Windows backslashes, URI schemas)?
5. **Reactivity, Performance & Resource Cleanup**:
   - Are event listeners, intervals, animation frames, and Yjs observers properly cleaned up in `useEffect` return functions?
   - Are dependency arrays in `useCallback` / `useMemo` accurate to avoid stale closures and wasteful re-renders?

### Phase 3: Second Pass - Cross-Review Loop
> [!IMPORTANT]
> **MANDATORY:** Before finalizing the report, perform a second review loop focused on:
1. **Cascade Impact**: If this module throws an error or fails to load, how do parent components and consumers behave? Does the app crash (blank screen) or degrade gracefully with an Error Boundary / user fallback?
2. **Non-Obvious Extremes**: Extremely large datasets (thousands of notes/flashcards), sudden network disconnections during save operations, rapid tab switching, concurrent multi-tab Yjs document edits.
3. **Async Reversibility**: Re-read complex async segments with the question: *"What breaks if the sequence of async responses arrives in reverse order?"*. Add newly discovered findings to the report.

### Phase 4: Structured Mitigation Plan
Format findings into a professional, actionable report:

```markdown
# Audit Report: [Module Name]

## 1. Module Overview
- **Path**: [relative/absolute path]
- **Audited Files**: [clickable file links]
- **Core Responsibility**: [summary]

## 2. Vulnerability & Bug Inventory

### [BUG-01] [Descriptive Title]
- **Severity**: Critical | High | Medium | Low
- **Category**: SOLID Violation | Memory Leak | Async Race Condition | Type Vulnerability | Multiplatform Flaw
- **Location**: [file.ts:L12-L34](file:///path/to/file.ts#L12-L34)
- **Root Cause**: Concise explanation of the defect.
- **Reproduction / Risk Scenario**: How and when the failure triggers.
- **Second-Pass Finding**: Secondary impact identified during cross-review.

## 3. Step-by-Step Mitigation Plan
For each bug or category:
1. **Proposed Action**: Exact architectural or code fix preserving backward compatibility.
2. **Parity Guarantee**: Verification that no existing features, UX, or styles are broken.
3. **Diagnostic Logging Recommendations**:
   - High-granularity log checkpoints (operation IDs, payload summaries, timing, state before/after).
   - Exact log patterns to trace execution flow and definitively confirm in console/telemetry that the bug was resolved.
4. **Verification Plan**: Targeted unit tests or manual reproduction verification steps.
```

---

## 3. Strict Non-Regression & Feature Preservation Rule

During audits and mitigation planning:
- **DO NOT** suggest removing features or oversimplifying business logic.
- If a feature has bugs or is written as a monolith, the mitigation must **harden, modularize, and repair the implementation**, preserving 100% of its intended behavior and user capabilities.
