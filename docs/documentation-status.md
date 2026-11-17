# Documentation Ownership and Current Status

**Last reviewed:** 2026-11-17

This page identifies the current sources of truth. Older reports and migration plans may contain estimates, test totals, file paths, or completion checkboxes that have not been revalidated. Do not use those records as proof of current implementation status.

## Current Sources of Truth

| Topic | Current document | What it governs |
| --- | --- | --- |
| Repository and app ownership | [Repository layout](./architecture/repository-layout.md) | Product directories, build owners, and shared-code boundaries |
| Cross-app module inventory | [Module structure](./architecture/module-structure.md) | Canonical module IDs, source locations, and current route presence per client |
| Qt desktop feature parity | [Native desktop parity matrix](./native-desktop-parity.md) | Verified Qt coverage and remaining React parity gaps |
| Synchronization engine | [Sync Engine Architecture](./architecture/sync-engine.md) | Cloud synchronization, E2EE batch encryption, and table sync inventory |
| Firebase integrity audit | [Firebase sync integrity audit](./audits/firebase-sync-integrity-2026-11-17/README.md) | Current local schema, Firestore ID reconciliation, security findings, and resolution checklist |
| Qt vault and encryption coverage | [Native encryption audit](./security/native-encryption-audit.md) | Implemented protection, test evidence, and open encryption risks |
| Build and setup commands | [Setup and build guide](./guides/setup-and-build.md) | Current build commands and prerequisites |
| System architecture | [Architecture overview](./architecture/overview.md) | Runtime responsibilities and platform boundaries |
| Engineering rules | [Root AGENTS.md](../AGENTS.md) and app-level `AGENTS.md` files | Required code, testing, documentation, and ownership rules |
| Skill specifications | [Engineering skills index](../.agents/skills/README.md) | Agent playbooks; specifications are not implementation evidence |

## Verified Project Status

- The repository contains React Web/Tauri, native Qt desktop, native Kotlin/Compose Android, and an Expo/WebView Android shell. The root npm workspace delegates to `apps/web-react/`; other app targets keep their own build systems.
- Qt desktop feature parity: The React client remains the single source of truth for UX and feature parity. The habits feature is strictly an editor extension (`/habito` slash command and interactive widget) in both React and Qt, rather than a standalone top-level route.
- Cloud Synchronization: **Unverified / incomplete.** The active local database was integrity-checked and its three missing sync tables were created. All 50 client sync table names were compared across Web, Firestore rules, Rust, IndexedDB, and active SQLite; optional timestamp-column differences are explicitly handled. Local code scopes cloud rows by Firebase user or workspace, rejects unscoped sync, and replaces the unsafe root-copy migration. Replacement Firestore rules pass local Emulator Suite tests but are not deployed. The old root-only records and decrypted field parity still require an authenticated reconciliation. See the [audit and resolution checklist](./audits/firebase-sync-integrity-2026-11-17/README.md).
- Native vault protection is partial. The Qt setup now migrates referenced media inside managed directories and can recover an interrupted media migration. Sensitive business-data fields in several SQLite modules remain plaintext, and the security audit must remain open.
- The unified architecture establishes `core/synapse-core/` as the Single Source of Truth for domain models, SQLite repositories, and business calculations across all native clients, eliminating duplicated raw SQL queries in `desktop-qt` and `web-react/src-tauri`.

## Documentation Update Rules

1. Write technical documentation in English. Keep `README.pt-BR.md` as the localized Portuguese README.
2. Use paths relative to the Markdown file for repository links. Do not add machine-specific `file://` links or personal database locations.
3. Update the relevant source-of-truth document in the same change as a feature, migration, or security change.
4. Use `Partial`, `Missing`, or `Unverified` when acceptance evidence is incomplete. Avoid `100%`, `Production`, or fixed test totals unless reproducible current evidence supports the claim.
5. Validate links, commands, paths, and code references against the checked-out repository before reporting completion.
