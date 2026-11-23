# Native Android and React Parity Audit

**Status:** In progress; Android is not at feature parity with React.
**Last inventory checkpoint:** 2026-11-22.
**Latest completeness review:** 2026-11-22; see the [current verification record](./verification.md).
**Scope:** Native Kotlin/Jetpack Compose Android (`apps/mobile-android/`) against React Web/Tauri (`apps/web-react/`), with shared Rust Core/UniFFI ownership.

This folder is the living implementation queue for the native Android parity effort. Checklists describe observed source capability separately from build, test, device, security, and cross-client acceptance. Revalidate each item against the current worktree before changing its status.

## Start Here

| Document | Purpose |
| --- | --- |
| [Feature matrix](./feature-matrix.md) | Route coverage, React-to-Android capability comparison, module-level gaps, and feature checklist |
| [Core and React remediation](./core-and-react.md) | Architecture evidence, shared Core/UniFFI work, and remaining React/Tauri Core delegation |
| [Security and integrations](./security-and-integrations.md) | Account identity, encryption, cloud sync, Vault, and external integration gates |
| [UX and acceptance](./ux-and-acceptance.md) | Guides, accessibility, Android lifecycle/back behavior, localization, and device acceptance |
| [Review findings](./review-findings.md) | Detailed findings with evidence, risk, and remediation notes |
| [Verification record](./verification.md) | Implementation checkpoint, commands, and explicit verification limits |

## Current Handoff Snapshot

- Android has all 18 canonical top-level route IDs, but feature depth remains incomplete across multiple modules and global React capabilities.
- Many local Android flows now delegate through typed UniFFI operations to `core/synapse-core/`; this does not establish cloud sync or at-rest encryption.
- The Android Vault remains intentionally non-persistent until a safe key lifecycle and encrypted Core contract exist. Rich/collaborative Notes and unsupported Tldraw documents remain protected from unsafe writes.
- The initial compile attempt used the discovered Android Studio JDK 25.0.3, which the pinned Gradle 8.9 wrapper rejected. The current `:app:compileDebugKotlin` then passed with JDK 17.0.21.1 and the installed Android SDK, building all three native ABIs and compiling the Trash guide. Instrumentation and device acceptance remain open; binding generation warned that `ktlint` is unavailable.
- The worktree was clean at this review checkpoint. Inspect `git status --short` again before implementation because later user changes must be preserved.

### Priority Order

1. **P0 — Shared boundary and data safety:** finish the `WEB-CORE-*` remediation and avoid introducing Android SQL or duplicate domain calculations. Keep protected data writes disabled until their shared Core and key contracts are safe.
2. **P1 — Identity, encryption, and sync:** design and verify Android account authentication, key ownership, lock/unlock and memory cleanup, migration, atomic encrypted operations, account-scoped synchronization, and recovery.
3. **P1 — Missing module flows:** use the feature matrix to implement the highest-impact missing React flows in bounded vertical slices.
4. **P2 — UX and acceptance:** finish help, localize direct Compose strings, review keyboard/accessibility and back handling, verify process recreation, and record per-device acceptance.

## How Future Agents Should Use This Queue

Use one bounded module or shared contract per implementation pass. Before changing it, read the root and Android `AGENTS.md`, inspect the React flow and its current error/empty/destructive states, then inspect the existing Core repository and UniFFI API. Prefer vertical slices that connect the canonical Core operation through UniFFI, a module-owned Android repository/ViewModel, Compose UI, and localized strings.

Avoid parallel edits to shared chokepoints such as Core migrations, `bridges/bridge-uniffi/src/lib.rs`, Gradle native packaging, or app routing. Coordinate these contract changes with module work and update the checklist only after checking the current source. Mark source work complete separately from compile, test, and device acceptance. Do not mark a row complete because a route or guide renders; record the exact command and exercised runtime path.

For each completed slice, update the module row, relevant phase checkboxes, verification record, documentation status, Android guidance, and security/module guide if affected. Keep user-visible strings out of Compose literals and add English defaults plus matching Brazilian Portuguese resources. Preserve the open limitations instead of claiming cross-device parity from local SQLite behavior.

### Checklist Status Meaning

- `[x]` means the described source capability is present in the current working tree.
- `[ ]` means the capability is missing, incomplete, or awaiting its stated acceptance gate.
- Build, test, device, sync, migration, and security acceptance remain separate checkboxes. The latest verification record must state which were actually run.
