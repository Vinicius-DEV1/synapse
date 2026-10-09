---
name: module-bug-audit
description: >-
  Thoroughly audits a specified module or directory for bugs, race conditions,
  memory leaks, SOLID violations, and integration flaws across both frontend
  (React/TypeScript) and backend (Tauri/Rust), generating a complete mitigation
  plan with mandatory second-pass review and diagnostic logging strategies.
---

# Deep Module Bug Audit & Mitigation Plan

> Activate when the user requests an inspection, bug audit, code health review, or
> deep scan of a specific module, component, or directory.

> [!IMPORTANT]
> This skill focuses on **bug detection and diagnostic analysis**. For comprehensive
> multi-dimensional reviews (architecture + types + performance + security + design),
> use the `full-module-review` orchestrator skill instead.

---

## 1. Objectives

Perform a thorough, multi-stage inspection to:

- **Identify Logical Bugs & Edge Cases** — Null/undefined dereferencing, boundary
  errors, malformed payloads, async race conditions.
- **Audit Architectural Health** — Detect monolithic files (> 300 lines), SRP
  violations, tight coupling between UI and storage/IPC drivers.
- **Audit Multiplatform Integrations** — Tauri v2 IPC vs Web/IndexedDB/Firestore
  compatibility, unhandled platform errors, path resolution edge cases.
- **Inspect Reactivity & Lifecycle** — Unmounted state updates, memory leaks in
  listeners/timers/Yjs observers, infinite re-render loops, stale closures.
- **Validate Type Safety** — Detect `any`, `as any`, unvalidated assertions,
  missing return type contracts.
- **Audit Rust Backend** — Unchecked `.unwrap()`, unhandled `Result` propagation,
  SQL injection via string formatting, panic paths in IPC handlers.
- **Design Diagnostic Logging** — High-resolution contextual log checkpoints to
  trace async flows and confirm bug mitigation at runtime.

---

## 2. Four-Phase Audit Protocol

### Phase 1: Scope & Dependency Mapping

1. Identify all files belonging to the target module.
2. Map public contracts (interfaces, types, exports) and consumer modules.
3. Check existing automated tests and their coverage.
4. Identify platform boundaries (Tauri IPC, IndexedDB, Firebase sync points).

### Phase 2: First Pass — Line-by-Line Deep Scan

#### Frontend (React / TypeScript)

1. **Async Flow & Concurrency**:
   - Unhandled `async/await` without structured `try/catch`?
   - Async operations resolving after component unmount?
   - Race conditions where concurrent calls overwrite newer state with stale data?

2. **SOLID & Code Structure**:
   - Single responsibility violations?
   - Monolithic files (> 300 lines) that should be decomposed?

3. **Type Safety & Data Integrity**:
   - `any` types, loose casts, or unvalidated IPC/IndexedDB responses?
   - Strict interfaces with discriminated unions and type guards?

4. **Platform Compatibility (Tauri vs Web)**:
   - Resilient fallbacks for web/browser environments?
   - Cross-platform path handling (spaces, accents, Windows backslashes)?

5. **Reactivity, Performance & Cleanup**:
   - Listeners, intervals, RAF, and Yjs observers properly cleaned up?
   - Accurate dependency arrays in `useCallback` / `useMemo`?

#### Backend (Rust / Tauri)

6. **Panic Safety**:
   - `.unwrap()`, `.expect()`, or `vec[i]` on potentially invalid data in IPC handlers?
   - All `Result<T, E>` values properly propagated?

7. **SQL Safety**:
   - 100% parameterized queries (`params![]`, `?`)? Any `format!()` in SQL?

8. **IPC Serialization**:
   - Return types properly `#[derive(Serialize)]`?
   - Input parameters validated before processing?

9. **File System Safety**:
   - Paths canonicalized before operations?
   - TOCTOU vulnerabilities in check-then-use patterns?

### Phase 3: Second Pass — Cross-Review Loop

> [!IMPORTANT]
> **MANDATORY**: Before finalizing, perform a second loop focused on:
> 1. **Cascade Impact** — If this module throws, do consumers degrade gracefully
>    or crash to a blank screen?
> 2. **Non-Obvious Extremes** — Thousands of items, sudden disconnections during
>    save, rapid tab switching, concurrent multi-tab Yjs edits.
> 3. **Async Reversibility** — "What breaks if async responses arrive in reverse order?"
> 4. **Rust Panic Propagation** — Does the frontend receive useful errors or blank failures?

### Phase 4: Structured Mitigation Plan

```markdown
# Audit Report: [Module Name]

## 1. Module Overview
- **Path**: [relative/absolute path]
- **Audited Files**: [clickable file links]
- **Core Responsibility**: [summary]
- **Platform Surface**: Frontend | Backend | Both

## 2. Bug Inventory

### [BUG-01] [Descriptive Title]
- **Severity**: Critical | High | Medium | Low
- **Category**: SOLID | Memory Leak | Race Condition | Type Vulnerability | Platform | Panic | SQL
- **Location**: [file.ts:L12-L34](file:///path/to/file.ts#L12-L34)
- **Root Cause**: Concise explanation.
- **Risk Scenario**: How and when the failure triggers.
- **Estimated Fix Effort**: Trivial (< 15min) | Moderate (15min–1h) | Complex (1h+)
- **Second-Pass Finding**: Secondary impact from cross-review.

## 3. Step-by-Step Mitigation Plan
1. **Proposed Action**: Exact fix preserving backward compatibility.
2. **Parity Guarantee**: Verification that nothing is broken.
3. **Diagnostic Logging**: Log checkpoints to trace execution and confirm resolution.
4. **Verification Plan**: Targeted tests or manual reproduction steps.
```

---

## 3. Diagnostic Tools Reference

| Tool | Purpose | Usage |
| :--- | :------ | :---- |
| Browser DevTools → Performance | Render bottlenecks, layout thrashing | Record → analyze flame chart |
| Browser DevTools → Memory | Memory leaks, detached DOM nodes | Heap snapshots before/after |
| React DevTools → Profiler | Unnecessary re-renders | "Record why each component rendered" |
| `console.time()` / `timeEnd()` | Operation duration measurement | Wrap suspected slow operations |
| Tauri DevTools (Rust logs) | Backend errors, IPC failures | `RUST_LOG=debug cargo tauri dev` |
| Network tab | Firebase/Firestore sync issues | Monitor WebSocket frames and REST calls |
| `npx vitest run --reporter=verbose` | Detailed test failure output | Full traces for failing tests |

---

## 4. Non-Regression & Feature Preservation

During audits and mitigation planning:

- **DO NOT** suggest removing features or oversimplifying business logic.
- If a feature has bugs or is monolithic, the mitigation must **harden, modularize,
  and repair** the implementation, preserving 100% of intended behavior.
