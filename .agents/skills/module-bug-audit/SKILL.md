---
name: module-bug-audit
description: >-
  Thoroughly audits a specified module or directory for bugs, race conditions,
  memory leaks, SOLID violations, and integration flaws across both frontend
  (React/TypeScript) and backend (Tauri/Rust), generating a complete mitigation
  plan with mandatory second-pass review and diagnostic logging strategies.
---

# Skill: Deep Module Bug Audit & Mitigation Plan

Activate this skill when the user requests an inspection, bug audit, code health review, or deep scan of a specific module, component, or directory in the **Caderno** project.

> [!IMPORTANT]
> This skill focuses on **bug detection and diagnostic analysis**. For comprehensive multi-dimensional reviews (architecture + types + performance + security + design), use the `full-module-review` orchestrator skill instead.

---

## 1. Objectives

Perform a thorough, multi-stage inspection on the specified module to:
- **Identify Logical Bugs & Edge Cases**: Null/undefined dereferencing, boundary condition errors, malformed payloads, async race conditions.
- **Audit Architectural & SOLID Health**: Detect monolithic "God" files (>300 lines), SRP violations, tight coupling between UI and storage/IPC drivers, and LSP adapter inconsistencies.
- **Audit Multiplatform Integrations**: Tauri v2 (Rust backend IPC) vs Web/Browser IndexedDB/Firestore compatibility, unhandled platform errors, and path resolution edge cases.
- **Inspect Reactivity & Lifecycle**: Unmounted state updates, memory leaks in event listeners/timers/Yjs CRDT observers, infinite re-render loops, and stale closures.
- **Validate Type Safety**: Detect `any`, `as any`, unvalidated type assertions (`as unknown as T`), and missing return type contracts.
- **Audit Rust/Tauri Backend**: Unchecked `.unwrap()` calls, unhandled `Result` propagation, SQL injection via string formatting, panic paths in IPC command handlers, missing input validation.
- **Formulate Deep Diagnostic Logging**: Design high-resolution, contextual log checkpoints that trace asynchronous execution flows, isolate root causes, and confirm bug mitigation at runtime.

---

## 2. Four-Phase Audit Protocol

### Phase 1: Scope & Dependency Mapping
1. Identify all files belonging to the target module.
2. Map public contracts (interfaces, types, exports) and consumer modules (where this module is imported/consumed).
3. Check existing automated tests for the module and its direct dependencies.
4. Identify platform boundaries (Tauri IPC calls, IndexedDB operations, Firebase sync points).

### Phase 2: First Pass — Line-by-Line Deep Scan

Examine all module files across critical audit vectors:

#### Frontend (React / TypeScript):
1. **Async Flow & Concurrency**:
   - Are there unhandled `async/await` operations without structured `try/catch`?
   - Can asynchronous operations resolve after component unmount?
   - Are there race conditions where concurrent calls overwrite newer state with stale data?
2. **SOLID & Code Structure**:
   - Does any component exceed single responsibility boundaries?
   - Are there monolithic files (>300 lines) that should be decomposed?
3. **Type Safety & Data Integrity**:
   - Are there any `any` types, loose casts, or unvalidated IPC/IndexedDB responses?
   - Are data interfaces strict with proper discriminated unions and type guards?
4. **Platform Compatibility (Tauri vs Web)**:
   - Do native Tauri calls have resilient fallbacks for web/browser environments?
   - Do file path resolvers properly handle cross-platform quirks (spaces, accents, Windows backslashes, URI schemas)?
5. **Reactivity, Performance & Resource Cleanup**:
   - Are event listeners, intervals, animation frames, and Yjs observers properly cleaned up?
   - Are dependency arrays in `useCallback` / `useMemo` accurate?

#### Backend (Rust / Tauri):
6. **Panic Safety**:
   - Are there `.unwrap()`, `.expect()`, or index access (`vec[i]`) on potentially empty/invalid data in IPC command handlers?
   - Are all `Result<T, E>` values properly propagated or handled (not silently discarded)?
7. **SQL Safety**:
   - Are all SQL queries using parameterized bindings (`params![]`, `?`)? Any string interpolation (`format!("{}", user_input)`) in SQL?
8. **IPC Serialization**:
   - Are Tauri command return types properly serializable (`#[derive(Serialize)]`)?
   - Are input parameters validated before processing?
9. **File System Safety**:
   - Are paths canonicalized before file operations?
   - Are there TOCTOU (time-of-check-time-of-use) vulnerabilities in file existence checks followed by reads/writes?

### Phase 3: Second Pass — Cross-Review Loop

> [!IMPORTANT]
> **MANDATORY:** Before finalizing the report, perform a second review loop focused on:
1. **Cascade Impact**: If this module throws an error or fails to load, how do parent components and consumers behave? Does the app crash (blank screen) or degrade gracefully with an Error Boundary / user fallback?
2. **Non-Obvious Extremes**: Extremely large datasets (thousands of notes/flashcards), sudden network disconnections during save operations, rapid tab switching, concurrent multi-tab Yjs document edits.
3. **Async Reversibility**: Re-read complex async segments with the question: *"What breaks if the sequence of async responses arrives in reverse order?"*. Add newly discovered findings to the report.
4. **Rust Panic Propagation**: For backend modules, trace what happens when a Rust panic occurs inside an IPC handler — does the frontend receive a useful error or a blank failure?

### Phase 4: Structured Mitigation Plan

Format findings into a professional, actionable report:

```markdown
# Audit Report: [Module Name]

## 1. Module Overview
- **Path**: [relative/absolute path]
- **Audited Files**: [clickable file links]
- **Core Responsibility**: [summary]
- **Platform Surface**: Frontend | Backend | Both

## 2. Vulnerability & Bug Inventory

### [BUG-01] [Descriptive Title]
- **Severity**: Critical | High | Medium | Low
- **Category**: SOLID Violation | Memory Leak | Async Race Condition | Type Vulnerability | Multiplatform Flaw | Panic Path | SQL Risk
- **Location**: [file.ts:L12-L34](file:///path/to/file.ts#L12-L34)
- **Root Cause**: Concise explanation of the defect.
- **Reproduction / Risk Scenario**: How and when the failure triggers.
- **Estimated Fix Effort**: Trivial (< 15min) | Moderate (15min–1h) | Complex (1h+)
- **Second-Pass Finding**: Secondary impact identified during cross-review.

## 3. Step-by-Step Mitigation Plan
For each bug or category:
1. **Proposed Action**: Exact architectural or code fix preserving backward compatibility.
2. **Parity Guarantee**: Verification that no existing features, UX, or styles are broken.
3. **Diagnostic Logging Recommendations**:
   - High-granularity log checkpoints (operation IDs, payload summaries, timing, state before/after).
   - Exact log patterns to trace execution flow and definitively confirm the bug was resolved.
4. **Verification Plan**: Targeted unit tests or manual reproduction verification steps.
```

---

## 3. Diagnostic Tools Reference

When investigating bugs, leverage these tools:

| Tool | Purpose | How to Use |
|------|---------|-----------|
| **Browser DevTools → Performance** | Identify render bottlenecks, layout thrashing | Record → analyze flame chart |
| **Browser DevTools → Memory** | Detect memory leaks, detached DOM nodes | Take heap snapshots before/after |
| **React DevTools → Profiler** | Identify unnecessary re-renders | Enable "Record why each component rendered" |
| **`console.time()` / `console.timeEnd()`** | Measure operation duration | Wrap suspected slow operations |
| **Tauri DevTools (Rust logs)** | Backend errors, IPC failures | `RUST_LOG=debug cargo tauri dev` |
| **Network tab** | Firebase/Firestore sync issues | Monitor WebSocket frames and REST calls |
| **`npx vitest run --reporter=verbose`** | Detailed test failure output | Run with verbose flag for full traces |

---

## 4. Strict Non-Regression & Feature Preservation Rule

During audits and mitigation planning:
- **DO NOT** suggest removing features or oversimplifying business logic.
- If a feature has bugs or is written as a monolith, the mitigation must **harden, modularize, and repair the implementation**, preserving 100% of its intended behavior and user capabilities.
