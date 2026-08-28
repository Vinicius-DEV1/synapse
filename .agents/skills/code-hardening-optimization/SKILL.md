---
name: code-hardening-optimization
description: >-
  Optimizes, cleans, reorganizes, and hardens code and directory structures for
  maximum efficiency, readability, and resilience, strictly preserving all existing
  features, functionality, and visual UI/design.
---

# Skill: Code Hardening, Refactoring & Structural Optimization

Activate this skill when the user requests performance improvements, refactoring of confusing code, reorganization/standardization of disorganized files, error resilience, or code hardening in the **Caderno** project.

---

## 1. Fundamental & Inviolable Rules

> [!CAUTION]
> ### STRICT CONSTRAINTS
> 1. **DO NOT SIMPLIFY / DO NOT REMOVE FEATURES**:
>    - Under no circumstances should you remove any features, options, shortcuts, edge-case handling, or existing user capabilities.
>    - Observable application behavior must remain identical or superior (faster/more resilient), never degraded or stripped down.
> 2. **DO NOT ALTER VISUAL DESIGN OR LAYOUT**:
>    - Modifying UI layouts, colors, spacing, Tailwind/CSS classes, icons, or visual presentation without explicit user instruction is strictly prohibited.
>    - The focus of this skill is **strictly under the hood** (internal logic, resilience, efficiency, and clean architecture).

---

## 2. Optimization Pillars

### 2.1. Hardening & Fault Tolerance
- **Defensive Handling**: Add robust guards for `null`, `undefined`, empty collections, and malformed payloads.
- **Strict Typing**: Replace `any` or loose casts with precise types, discriminated unions, and type guards.
- **Multiplatform Resilience**: Ensure native Tauri APIs and Web APIs (IndexedDB, storage) fail gracefully with proper fallbacks and actionable logging.
- **Leak Prevention & Cleanup**: Guarantee cancellation of pending requests (`AbortController`), unregister event listeners, timers, and Yjs observers upon component unmount.

### 2.2. Efficiency & Performance
- **React Rendering Optimization**:
  - Prevent wasteful function and object recreation across renders using stable references (`useCallback`, `useMemo`) where appropriate.
  - Isolate volatile high-frequency state to avoid re-rendering entire component subtrees.
- **Async I/O Efficiency**:
  - Run independent operations concurrently using `Promise.all` instead of unneeded sequential `await`s.
  - Minimize repetitive reads/writes to disk and IndexedDB within loops.
- **Data Structures & Algorithms**:
  - Optimize repetitive lookups and transformations (e.g., utilize `Map` / `Set` for $O(1)$ lookups in large collections of notes, tags, or editor blocks).

### 2.3. Clean Code, Structural Refactoring & File Organization
- **Refactoring Confusing & Tangled Code**:
  - Untangle complex, hard-to-read, or disorganized code into clean, modular, single-responsibility functions and components.
  - Simplify overly nested logic while preserving every single edge-case and business rule.
- **File Organization & Directory Standardization**:
  - Reorganize loose, stray, or cluttered files into coherent, well-structured directories (e.g., grouping related subcomponents, helpers, adapters, or types).
  - Standardize file naming conventions and ensure all import paths and barrel exports are meticulously updated so nothing breaks.
- **DRY (Don't Repeat Yourself)**: Extract repeated logic into shared utility functions or custom hooks while maintaining exact contract parity.
- **Clarity & Organization**:
  - Keep functions focused and modular.
  - **English-Only Comments**: All added or edited comments must be in concise English, explaining the *rationale* behind complex mechanisms.
  - **Obsolete Comment Cleanup**: Actively remove outdated comments, legacy notes, and dead commented-out code.

---

## 3. Optimization Workflow

### Step 1: Pre-Audit & Bottleneck Identification
- Inspect target files to identify performance bottlenecks, code duplication, and type/error handling vulnerabilities.
- Outline expected improvements (e.g., eliminated re-renders, reduced memory footprint, tighter type safety).

### Step 2: Formal Implementation Plan Generation
- **Mandatory Planning Artifact**: Before modifying any source files or running destructive commands, create the formal `implementation_plan.md` artifact.
- Document proposed directory structures, new/modified files, strict parity guarantees, and verification steps for user review and approval.

### Step 3: Careful Refactoring & Execution
- Implement modifications while strictly maintaining public signatures, contracts, and design tokens.
- Maintain absolute aesthetic and functional fidelity.

### Step 4: Non-Regression Verification
- Validate TypeScript types and run automated test suites (`npm test` / `vitest`).
- Confirm zero side effects on consuming components.

---

## 4. Delivery Checklist

Before marking the task as complete, verify:
- [ ] Are all original features and edge cases preserved and functioning?
- [ ] Are visual elements, Tailwind classes, and layouts completely intact?
- [ ] Is the code measurably cleaner, more robust, or more performant?
- [ ] Are file structures standardized, organized, and all import paths properly resolved?
- [ ] Are comments strictly in English and free of outdated/stale notes?
- [ ] Does Tauri/Web compatibility remain fully functional?
