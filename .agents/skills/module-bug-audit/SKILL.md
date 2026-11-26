---
name: module-bug-audit
description: >-
  Audits a specified feature across React/Tauri, Desktop Qt, and native Android for bugs, races, lifecycle leaks, and integration flaws, with an evidence-based mitigation plan and mandatory second-pass review.
---

# Deep Module Bug Audit & Mitigation Plan

> Activate when the user requests an inspection, bug audit, code health review, or
> deep scan of a specific module, component, or directory.

> [!IMPORTANT]
> This skill focuses on **bug detection and diagnostic analysis**. For comprehensive
> multi-dimensional reviews (architecture + types + performance + security + design),
> use the `full-module-review` orchestrator skill instead.

---

## Client and Layer Coverage

Select the actual target(s) before scanning: React Web/Tauri, Desktop Qt, native Android Compose, and, when requested, the Expo WebView shell. Inspect React hooks/services and Tauri IPC; QML/C++ controllers and `bridge-qt`; Compose/ViewModels and UniFFI; and shell lifecycle/back/inset integration as applicable. Verify shared rules in Rust Core once, then check each adapter and UI lifecycle separately. The WebView shell is not a separate copy of product modules.

## 1. Objectives

Perform a thorough, multi-stage inspection to:

- **Identify Logical Bugs & Edge Cases** — Null/undefined dereferencing, boundary
  errors, malformed payloads, async race conditions.
- **Audit Architectural Health** — Detect monolithic files (> 300 lines), SRP
  violations, tight coupling between UI and storage/IPC drivers.
- **Audit Multiplatform Integrations** — React Web/Tauri browser-vs-IPC behavior, Qt QML/C++/FFI, Android Compose/ViewModel/UniFFI, shell integration, unhandled platform errors, URI/path resolution, and per-client persistence or sync differences.
- **Inspect Lifecycle & Concurrency** — React effects and Yjs observers, Qt signal/slot and QObject lifetimes, Android coroutine/Flow and lifecycle cancellation, shell listeners, timers, stale responses, and navigation races.
- **Validate Type Safety** — Detect `any`, `as any`, unvalidated assertions,
  missing return type contracts.
- **Audit Rust Backend & Core Architecture** — Unchecked `.unwrap()`, unhandled `Result` propagation,
  SQL injection via string formatting, raw SQL or business logic implemented outside `core/synapse-core`,
  panic paths in IPC handlers.
- **Design Diagnostic Logging** — High-resolution contextual log checkpoints to
  trace async flows and confirm bug mitigation at runtime.

---

## 2. Four-Phase Audit Protocol

### Phase 1: Scope & Dependency Mapping

1. Identify all files belonging to the target module.
2. Map public contracts (interfaces, types, exports) and consumer modules.
3. Check existing automated tests and their coverage.
4. Identify the target client boundaries (browser/IndexedDB, Tauri IPC, Qt invokables/FFI, Android UniFFI and OS APIs, WebView shell bridge) and only the sync points implemented by that target.

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

#### Native Qt and Android

- **Qt 6 / QML / C++**: Check QML-exposed invokables for validation and lifetime safety, QObject ownership, signal disconnection, asynchronous callback freshness, controller thread affinity, bridge error propagation, and native file/path handling.
- **Android / Kotlin / Compose**: Check lifecycle-aware Flow collection, coroutine cancellation, ViewModel state restoration, recomposition stability, system Back and predictive Back handling, `WindowInsets`/IME behavior, document-provider URI grant persistence, permission timing, and UniFFI error/nullability conversion.
- **Shared domain contract**: Verify equivalent actions and payload meanings across Tauri, `bridge-qt`, and UniFFI; verify Core owns shared rules and native clients do not imitate missing capabilities.

#### Backend (Rust / Tauri)

6. **Panic Safety**:
   - `.unwrap()`, `.expect()`, or `vec[i]` on potentially invalid data in IPC handlers?
   - All `Result<T, E>` values properly propagated?

7. **SQL Safety & Core Centralization**:
   - 100% parameterized queries (`params![]`, `?`)? Any `format!()` in SQL?
   - Are queries, migrations, and domain calculations encapsulated in `core/synapse-core` as the Single Source of Truth (SSOT), or improperly duplicated inside C++ controllers, Tauri commands, or Android Kotlin ViewModels?
   - **Core & Bridge Anti-Monolith Check**: Are any files in `core/synapse-core/` or `bridges/` exceeding 250–300 lines? Any monolithic single-file domain that must be split into atomic submodules (`models.rs`, `calculations.rs`/`logic.rs`, repository files, `mod.rs`, `tests.rs`)?

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
- **Location**: `apps/web-react/src/path/to/file.ts#L12-L34`
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
| `npm run test -- --reporter=verbose` | Detailed test failure output | Full traces for failing tests |

---

## 4. Non-Regression & Feature Preservation

During audits and mitigation planning:

- **DO NOT** suggest removing features or oversimplifying business logic.
- If a feature has bugs or is monolithic, the mitigation must **harden, modularize,
  and repair** the implementation, preserving 100% of intended behavior.
