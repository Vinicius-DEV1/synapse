---
name: module-bug-audit
description: >-
  Thoroughly audits a specified module or directory for bugs, race conditions,
  memory leaks, and integration flaws, generating a complete mitigation plan
  with a mandatory second-pass review loop and detailed diagnostic logging strategies.
---

# Skill: Deep Module Bug Audit & Mitigation Plan

Activate this skill when the user requests an inspection, bug audit, or deep scan of a specific module, component, or directory in the **Caderno** project.

---

## 1. Objectives

Perform a thorough, multi-stage inspection on the specified module to:
- **Identify Logical Bugs & Edge Cases**: Null/undefined inputs, boundary conditions, malformed data, async race conditions.
- **Audit Platform Integrations**: Tauri (Rust backend) vs Web/Browser compatibility, IndexedDB/Firestore sync flaws, unhandled IPC failures.
- **Inspect Reactivity & Lifecycle**: Unmounted state updates, memory leaks in subscriptions/listeners, infinite re-render loops, TipTap/Yjs desynchronization.
- **Validate Type Safety & Data Integrity**: Unsafe type casts (`as any`), unhandled optional properties, missing return type validations.
- **Formulate Deep Diagnostic Logging**: Design high-resolution, contextual log checkpoints that trace asynchronous flows, isolate root causes, and confirm bug resolution during runtime.

---

## 2. Four-Phase Audit Protocol

### Phase 1: Scope & Dependency Mapping
1. Identify all files belonging to the target module (e.g., `src/services/storage/`, `src/components/editor-extensions/`, etc.).
2. Map public contracts (interfaces, types, exports) and consumer modules (where this module is imported/consumed).
3. Check existing automated tests for the module or its direct dependencies.

### Phase 2: First Pass - Line-by-Line Deep Scan
Examine all module files across critical vectors:
- **Async Flow & State Management**:
  - Unhandled `async/await` without structured `try/catch`?
  - Operations executing after component unmount or under high network latency?
  - React stale closure risks in hooks and callbacks?
- **Hybrid Multiplatform Support (Tauri vs Web)**:
  - Do native Tauri calls (`@tauri-apps/api`, fs/dialog plugins) have resilient fallbacks for web environments?
  - Do path resolvers (canonical paths, file URLs) properly handle special characters, whitespace, and OS differences (Windows/Linux/macOS)?
- **Persistence & Synchronization**:
  - Risk of corrupted data in IndexedDB, Firestore, or TipTap ProseMirror document models?
  - Are mutations and storage writes atomic and resilient to sudden disconnections or disk errors?

### Phase 3: Second Pass - Cross-Review Loop
> [!IMPORTANT]
> **MANDATORY:** Before finalizing the report, perform a second review loop focused on:
1. **Cascade Impact**: If this module fails, how do parent components and consumers behave? Does the app crash (blank screen) or degrade gracefully?
2. **Non-Obvious Extremes**: Extremely large files/datasets, abrupt disconnections during saves, rapid tab switching, concurrent Yjs document edits.
3. **Complementary Findings**: Re-read complex segments with the question: *"What breaks if the sequence of async events arrives in reverse order?"*. Add newly discovered findings to the report.

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
- If a feature has bugs, the mitigation must **harden and repair the implementation**, preserving 100% of its intended behavior and user capabilities.
