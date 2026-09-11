---
name: full-module-review
description: >-
  Orchestrates a comprehensive, multi-dimensional review of a module or directory,
  combining bug audits, architecture analysis, type safety, performance profiling,
  security inspection, and design compliance into a single unified report with
  prioritized remediation plan.
---

# Skill: Full Module Review — Comprehensive Quality Orchestrator

Activate this skill when the user requests a **complete review**, **general audit**, or **health check** of a specific module, feature directory, or the entire application module-by-module. This skill orchestrates all quality dimensions into a single structured pass.

> [!IMPORTANT]
> This is an **orchestrator skill** — it coordinates the analysis protocol and report format. For deep-dive execution in specific dimensions, it references specialized skills:
> - **Bugs & Race Conditions**: `module-bug-audit`
> - **Architecture & Refactoring**: `code-quality-refactoring`
> - **Type Safety**: `type-safety-hardening`
> - **Security**: `security-audit`
> - **Cryptography**: `caderno-cryptography-vault`
> - **Visual Design**: `caderno-design-system` + `immersive-minimalist-ux`

---

## 1. Inviolable Constraints

> [!CAUTION]
> 1. **Diagnostic-First**: This skill **identifies and reports** issues. It does NOT apply fixes unless the user explicitly authorizes execution after reviewing the report.
> 2. **100% Parity**: All proposed remediations must guarantee functional and visual parity.
> 3. **Severity-Driven Prioritization**: Findings must be ranked by actual impact, not quantity. A single critical race condition outranks 20 minor style nits.

---

## 2. The Six Review Dimensions

Every module is evaluated across these 6 orthogonal quality dimensions:

### Dimension 1: Correctness & Bugs 🐛
*Source: `module-bug-audit` skill protocol*
- Logical bugs, null/undefined dereferencing, boundary errors
- Async race conditions, stale closures, unmounted state updates
- Error handling gaps (silent `catch {}`, untyped errors, missing fallbacks)
- Multiplatform compatibility (Tauri IPC vs Web/IndexedDB fallbacks)

### Dimension 2: Architecture & SOLID Compliance 🏗️
*Source: `code-quality-refactoring` skill + `AGENTS.md` §3*
- SRP violations: God components (> 300 lines), mixed presentation/orchestration/I/O
- OCP violations: Hardcoded switch/case instead of registries/strategies
- DIP violations: UI components importing platform drivers directly
- ISP violations: Fat interfaces forcing unused method dependencies
- Prop drilling depth (> 2 levels)

### Dimension 3: Type Safety 🔒
*Source: `type-safety-hardening` skill + `AGENTS.md` §4.1*
- `any`, `as any`, `as unknown as T` usage count
- Missing return types on exported functions
- Unvalidated external data (IPC, IndexedDB, API responses)
- Missing discriminated unions for multi-state payloads
- Missing exhaustiveness checks in switch statements

### Dimension 4: Performance & Resource Management ⚡
*Source: `AGENTS.md` §9*
- Unnecessary re-renders (useState for CSS-driven states, missing React.memo)
- Missing virtualization for large lists
- Missing code-splitting for heavy dependencies
- Layout thrashing (unguarded getBoundingClientRect in loops)
- Memory leaks (uncleaned listeners, timers, observers, AbortControllers)
- Missing `loading="lazy"` / `decoding="async"` on media
- O(n²) algorithms where O(n) or O(1) is possible

### Dimension 5: Security 🛡️
*Source: `security-audit` skill*
- Unsanitized HTML rendering (dangerouslySetInnerHTML without DOMPurify)
- Hardcoded secrets, API keys, or OAuth credentials
- Path traversal vulnerabilities in file operations
- Injection vectors (SQL, command, XSS)
- Cryptographic misuse (if module touches encryption)

### Dimension 6: Design & UX Compliance 🎨
*Source: `caderno-design-system` + `immersive-minimalist-ux` skills*
- Correct use of `brand-*` tokens (not arbitrary grays)
- Correct canvas colors (`bg-dark-bg`, `bg-dark-card`, not flat `zinc-950`)
- Whisper-thin borders (`border-white/5` to `border-white/[0.08]`)
- Hover-revealed secondary actions (`opacity-0 group-hover:opacity-100`)
- Keyboard accessibility for interactive elements
- Immersive full-canvas mounting for focus modes (not floating modals)

---

## 3. Review Protocol

### Phase 1: Scope & Inventory

1. **Identify all files** in the target module/directory.
2. **Catalog**: Total lines, file count, export surface, consumer modules, existing test coverage.
3. **Triage**: If the module has > 20 files, prioritize by: entry points first → hooks → services → utilities → sub-components.

### Phase 2: Six-Dimension Scan

For each file in scope, perform a single read-through evaluating all 6 dimensions simultaneously. Record findings as you go — do NOT re-read the same file multiple times.

**Scan order per file:**
1. Check imports and dependencies (architecture, code-splitting, platform coupling)
2. Check type signatures (any, missing returns, loose interfaces)
3. Check function/component body (bugs, race conditions, performance)
4. Check JSX/rendering (design compliance, accessibility)
5. Check cleanup (useEffect returns, AbortControllers, listener teardown)
6. Check error handling (catch blocks, fallbacks, error boundaries)

### Phase 3: Cross-Module Impact Analysis

> [!IMPORTANT]
> **MANDATORY**: After the per-file scan, evaluate cross-cutting concerns:
> - If this module fails/throws, do consumer modules degrade gracefully?
> - Are there circular dependencies or tight coupling chains?
> - Does modifying this module require synchronized changes in other modules?
> - Under extreme conditions (10,000+ items, network loss mid-save, rapid tab switching), what breaks first?

### Phase 4: Unified Report Generation

Format all findings into a single structured report (see §4).

---

## 4. Report Template

```markdown
# Full Module Review: [Module Name]

**Path**: `src/components/<module>/` (or equivalent)
**Files Reviewed**: [N] files, [M] total lines
**Test Coverage**: [existing test files, if any]
**Review Date**: [YYYY-MM-DD]

---

## Executive Summary

[2-3 sentences: overall health assessment, most critical findings, recommended priority]

**Health Score**: [A / B / C / D / F] per dimension:
| Dimension | Score | Critical | High | Medium | Low |
|-----------|-------|----------|------|--------|-----|
| 🐛 Correctness | | | | | |
| 🏗️ Architecture | | | | | |
| 🔒 Type Safety | | | | | |
| ⚡ Performance | | | | | |
| 🛡️ Security | | | | | |
| 🎨 Design/UX | | | | | |

---

## Findings

### [FIND-01] [Descriptive Title]
- **Dimension**: 🐛 Correctness | 🏗️ Architecture | 🔒 Types | ⚡ Perf | 🛡️ Security | 🎨 Design
- **Severity**: Critical | High | Medium | Low
- **Location**: [file.ts:L12-L34](file:///path/to/file.ts#L12-L34)
- **Description**: What the issue is and why it matters.
- **Risk Scenario**: When and how this causes user-visible impact.
- **Proposed Fix**: Concrete remediation preserving 100% parity.
- **Fix Effort**: Trivial (< 15min) | Moderate (15min–1h) | Complex (1h+)

[Repeat for each finding, ordered by severity DESC]

---

## Remediation Roadmap

### Priority 1 — Critical (Fix Immediately)
1. [FIND-XX] — [one-line summary]

### Priority 2 — High (Fix This Sprint)
1. [FIND-XX] — [one-line summary]

### Priority 3 — Medium (Schedule)
1. [FIND-XX] — [one-line summary]

### Priority 4 — Low (Opportunistic)
1. [FIND-XX] — [one-line summary]

---

## Verification Plan

- [ ] Targeted tests: `npx vitest run <paths>`
- [ ] Type check: `npx tsc -b --noEmit`
- [ ] Visual regression: Manual review of Tailwind class preservation
```

---

## 5. App-Wide Review Mode

When reviewing the **entire application** module-by-module:

### Execution Order
Review modules in dependency order (infrastructure → domain → orchestration → presentation):

1. **Infrastructure Layer First**: `src/api/`, `src/services/storage/`, `src/services/crypto.ts`
2. **Domain Services**: `src/services/`, `src/utils/`
3. **State Management**: `src/store/`, shared hooks in `src/hooks/`
4. **Feature Modules** (alphabetical or by user priority):
   - `src/components/anki/`
   - `src/components/editor/` + `src/components/editor-extensions/`
   - `src/components/files/`
   - `src/components/questions/`
   - `src/components/vault/`
   - `src/components/settings/`
   - [... other feature directories]
5. **Shell & Layout**: `src/components/layout/`, `App.tsx`, routing

### Progress Tracking
After each module review, update the task list with:
- [x] Module name — Health: [A-F] — Criticals: [N] — Fixes applied: [N/total]

### Consolidated Summary
After all modules are reviewed, produce a **cross-module health dashboard**:

```markdown
# App-Wide Health Dashboard

| Module | 🐛 | 🏗️ | 🔒 | ⚡ | 🛡️ | 🎨 | Critical | Action |
|--------|-----|------|-----|-----|------|-----|----------|--------|
| api/ | A | B | A | A | B | — | 0 | Monitor |
| editor/ | C | D | C | B | A | B | 3 | Refactor |
| anki/ | B | B | C | C | A | A | 1 | Harden |
| ... | | | | | | | | |
```
