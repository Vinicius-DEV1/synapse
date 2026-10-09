---
name: full-module-review
description: >-
  Orchestrates a comprehensive, multi-dimensional review of a module or directory,
  combining bug audits, architecture analysis, type safety, performance profiling,
  security inspection, and design compliance into a single unified report with a
  prioritized remediation plan.
---

# Full Module Review — Comprehensive Quality Orchestrator

> Activate when the user requests a **complete review**, **general audit**, or
> **health check** of a specific module, feature directory, or the entire application.
> This skill orchestrates all quality dimensions into a single structured pass.

> [!IMPORTANT]
> This is an **orchestrator skill** — it coordinates analysis and report format. For
> deep-dive execution in specific dimensions, it references:
> - **Bugs & Race Conditions**: `module-bug-audit`
> - **Architecture & Refactoring**: `code-quality-refactoring`
> - **Type Safety**: `type-safety-hardening`
> - **Security**: `security-audit`
> - **Cryptography**: `cryptography-vault`
> - **Visual Design**: `design-system` + `immersive-minimalist-ux`

---

## 1. Constraints

> [!CAUTION]
> 1. **Diagnostic-First** — Identify and report issues. Do NOT apply fixes unless
>    the user explicitly authorizes execution after reviewing the report.
> 2. **100% Parity** — All proposed remediations must guarantee functional and visual
>    parity.
> 3. **Severity-Driven** — Rank findings by actual impact. A single critical race
>    condition outranks 20 minor style nits.

---

## 2. The Six Review Dimensions

### 🐛 Dimension 1: Correctness & Bugs
*Reference: `module-bug-audit`*
- Logical bugs, null/undefined dereferencing, boundary errors
- Async race conditions, stale closures, unmounted state updates
- Error handling gaps (silent `catch {}`, untyped errors, missing fallbacks)
- Multiplatform compatibility (Tauri IPC vs Web/IndexedDB fallbacks)

### 🏗️ Dimension 2: Architecture & SOLID Compliance
*Reference: `code-quality-refactoring` + `AGENTS.md` §3*
- SRP violations: God components (> 300 lines), mixed presentation/orchestration/I/O
- OCP violations: Hardcoded switch/case instead of registries/strategies
- DIP violations: UI components importing platform drivers directly
- Prop drilling depth (> 2 levels)

### 🔒 Dimension 3: Type Safety
*Reference: `type-safety-hardening` + `AGENTS.md` §4.1*
- `any`, `as any`, `as unknown as T` usage count
- Missing return types on exported functions
- Unvalidated external data (IPC, IndexedDB, API responses)
- Missing discriminated unions and exhaustiveness checks

### ⚡ Dimension 4: Performance & Resource Management
*Reference: `AGENTS.md` §9*
- Unnecessary re-renders (useState for CSS-driven states, missing React.memo)
- Missing virtualization for large lists
- Missing code-splitting for heavy dependencies
- Memory leaks (uncleaned listeners, timers, observers, AbortControllers)
- O(n²) algorithms where O(n) or O(1) is possible

### 🛡️ Dimension 5: Security
*Reference: `security-audit`*
- Unsanitized HTML rendering without DOMPurify
- Hardcoded secrets or API keys
- Path traversal vulnerabilities
- Injection vectors (SQL, command, XSS)

### 🎨 Dimension 6: Design & UX Compliance
*Reference: `design-system` + `immersive-minimalist-ux`*
- Correct use of `brand-*` tokens (not arbitrary grays)
- Correct canvas colors (`bg-dark-bg`, not flat `zinc-950` in main UI)
- Whisper-thin borders, hover-revealed secondary actions
- Keyboard accessibility, immersive full-canvas for focus modes

---

## 3. Review Protocol

### Phase 1: Scope & Inventory

1. Identify all files in the target module/directory.
2. Catalog: Total lines, file count, export surface, consumer modules, test coverage.
3. If module has > 20 files, prioritize: entry points → hooks → services → utilities → sub-components.

### Phase 2: Six-Dimension Scan

For each file, perform a single read-through evaluating all 6 dimensions simultaneously:

1. Check imports and dependencies (architecture, code-splitting, platform coupling)
2. Check type signatures (any, missing returns, loose interfaces)
3. Check function/component body (bugs, race conditions, performance)
4. Check JSX/rendering (design compliance, accessibility)
5. Check cleanup (useEffect returns, AbortControllers, listener teardown)
6. Check error handling (catch blocks, fallbacks, error boundaries)

### Phase 3: Cross-Module Impact Analysis

> [!IMPORTANT]
> **MANDATORY**: After the per-file scan, evaluate cross-cutting concerns:
> - If this module fails/throws, do consumers degrade gracefully?
> - Are there circular dependencies or tight coupling chains?
> - Does modifying this module require synchronized changes elsewhere?
> - Under extreme conditions (10,000+ items, network loss, rapid switching), what
>   breaks first?

### Phase 4: Report Generation

Format all findings using the template below.

---

## 4. Report Template

```markdown
# Full Module Review: [Module Name]

**Path**: `src/components/<module>/`
**Files Reviewed**: [N] files, [M] total lines
**Test Coverage**: [existing test files]
**Review Date**: [YYYY-MM-DD]

---

## Executive Summary

[2-3 sentences: overall health, most critical findings, recommended priority]

**Health Score**:
| Dimension         | Score | Critical | High | Medium | Low |
| :---------------- | :---- | :------- | :--- | :----- | :-- |
| 🐛 Correctness    |       |          |      |        |     |
| 🏗️ Architecture   |       |          |      |        |     |
| 🔒 Type Safety    |       |          |      |        |     |
| ⚡ Performance    |       |          |      |        |     |
| 🛡️ Security       |       |          |      |        |     |
| 🎨 Design/UX      |       |          |      |        |     |

---

## Findings

### [FIND-01] [Descriptive Title]
- **Dimension**: 🐛 | 🏗️ | 🔒 | ⚡ | 🛡️ | 🎨
- **Severity**: Critical | High | Medium | Low
- **Location**: [file.ts:L12-L34](file:///path/to/file.ts#L12-L34)
- **Description**: What the issue is and why it matters.
- **Risk Scenario**: When and how this causes user-visible impact.
- **Proposed Fix**: Concrete remediation preserving 100% parity.
- **Fix Effort**: Trivial (< 15min) | Moderate (15min–1h) | Complex (1h+)

---

## Remediation Roadmap

### Priority 1 — Critical (Fix Immediately)
### Priority 2 — High (Fix This Sprint)
### Priority 3 — Medium (Schedule)
### Priority 4 — Low (Opportunistic)

---

## Verification Plan
- [ ] Targeted tests: `npx vitest run <paths>`
- [ ] Type check: `npx tsc -b --noEmit`
- [ ] Visual regression: Tailwind class preservation review
```

---

## 5. App-Wide Review Mode

When reviewing the **entire application** module-by-module:

### Execution Order (dependency-first)

1. **Infrastructure**: `src/api/`, `src/services/storage/`, `src/services/crypto.ts`
2. **Domain Services**: `src/services/`, `src/utils/`
3. **State Management**: `src/store/`, shared hooks in `src/hooks/`
4. **Feature Modules** (alphabetical or by priority):
   - `src/components/anki/`, `src/components/editor/`, `src/components/files/`,
     `src/components/questions/`, `src/components/vault/`, `src/components/settings/`
5. **Shell & Layout**: `src/components/layout/`, `App.tsx`, routing

### Progress Tracking

After each module: `[x] Module — Health: [A-F] — Criticals: [N] — Fixes: [N/total]`

### Consolidated Dashboard

```markdown
| Module   | 🐛  | 🏗️  | 🔒  | ⚡  | 🛡️  | 🎨  | Critical | Action   |
| :------- | :-- | :-- | :-- | :-- | :-- | :-- | :------- | :------- |
| api/     | A   | B   | A   | A   | B   | —   | 0        | Monitor  |
| editor/  | C   | D   | C   | B   | A   | B   | 3        | Refactor |
| anki/    | B   | B   | C   | C   | A   | A   | 1        | Harden   |
```
