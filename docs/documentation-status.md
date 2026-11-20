# Documentation Ownership and Current Status

**Last reviewed:** 2026-11-19

This page identifies the current sources of truth. Older reports and migration plans may contain estimates, test totals, file paths, or completion checkboxes that have not been revalidated. Do not use those records as proof of current implementation status.

## Current Sources of Truth

| Topic | Current document | What it governs |
| --- | --- | --- |
| Repository and app ownership | [Repository layout](./architecture/repository-layout.md) | Product directories, build owners, and shared-code boundaries |
| Cross-app module inventory | [Module structure](./architecture/module-structure.md) | Canonical module IDs, source locations, and current route presence per client |
| Qt desktop feature parity | [Native desktop parity matrix](./native-desktop-parity.md) | Verified Qt coverage and remaining React parity gaps |
| Synchronization engine | [Sync Engine Architecture](./architecture/sync-engine.md) | Cloud synchronization, E2EE batch encryption, and table sync inventory |
| Firebase integrity audit | [Firebase sync integrity audit](./audits/firebase-sync-integrity-2026-11-17/README.md) | Current local schema, Firestore ID reconciliation, security findings, and resolution checklist |
| Potential bug audits | [Native Android audit (2026-11-19)](./audits/potential-bug-audit-android-2026-11-19.md), [sync audit (2026-11-19)](./audits/potential-bug-audit-2026-11-19.md), [prior audit (2026-11-18)](./audits/potential-bug-audit-2026-11-18.md) | Targeted Android ABI and lifecycle findings, sync concurrency, local-origin checks, native note persistence, benchmark findings, and verification evidence |
| Qt vault and encryption coverage | [Native encryption audit](./security/native-encryption-audit.md) | Implemented protection, test evidence, and open encryption risks |
| Cloud account key migration | [Cloud account encryption migration](./security/cloud-account-encryption-migration.md) | React/Tauri/WebView migration flow, client coverage, quota footprint, and safe legacy-removal gates |
| Repository hygiene and safe cleanup | [Repository hygiene audit](./maintenance/repository-hygiene-audit-2026-11-18.md) | Tracked/untracked inventory, generated-file cleanup, intentionally retained compatibility files, and deletion gates |
| Build and setup commands | [Setup and build guide](./guides/setup-and-build.md) | Current build commands and prerequisites |
| System architecture | [Architecture overview](./architecture/overview.md) | Runtime responsibilities and platform boundaries |
| Engineering rules | [Root AGENTS.md](../AGENTS.md) and app-level `AGENTS.md` files | Required code, testing, documentation, and ownership rules |
| Skill specifications | [Engineering skills index](../.agents/skills/README.md) | Agent playbooks; specifications are not implementation evidence |

## Verified Project Status

- The repository contains React Web/Tauri, native Qt desktop, native Kotlin/Compose Android, and an Expo/WebView Android shell. The root npm workspace delegates to `apps/web-react/`; other app targets keep their own build systems.
- Qt desktop feature parity: The React client remains the single source of truth for UX and feature parity. The habits feature is strictly an editor extension (`/habito` slash command and interactive widget) in both React and Qt, rather than a standalone top-level route.
- Cloud Synchronization: scoped reconciliation and authenticated decrypted readback are complete according to the [Firebase audit](./audits/firebase-sync-integrity-2026-11-17/README.md). The report records 5,005 scoped sync documents verified, zero missing or remote-only IDs, and 9,398 reads for the parity pass. A fresh React Web account sign-in and full sync pull also completed after the latest Hosting release (5,030 app-recorded reads, 5 writes, no sync error or emergency stop). Firestore rules remain deployed. Source-root documents, archives, and rollback snapshots remain preserved pending separate retention and cleanup gates; native and installed-client migration checks remain open.
- Runtime hardening: the 2026-11-18 and 2026-11-19 [potential bug audits](./audits/potential-bug-audit-2026-11-18.md), [sync review](./audits/potential-bug-audit-2026-11-19.md), and [native Android review](./audits/potential-bug-audit-android-2026-11-19.md) record fixes for sync races, redundant initial uploads, cloud timestamp/tombstone ordering, equal-time Yjs convergence, local-origin trust checks, native note-save reporting, benchmark reliability, and Android video-reader cleanup. Web and Tauri Debian rebuilds passed after the Yjs fix. Android source hardening is unverified at build/runtime; the JNA/UniFFI ABI and missing native-library build remain open.
- Repository hygiene: the 2026-11-18 review found no untracked repository files or tracked build/database/log artifacts. Four closed Firebase CLI debug logs were removed, the unused Firebase Storage client initialization was removed, and the stale Auth/sync status above was corrected. See the [cleanup audit](./maintenance/repository-hygiene-audit-2026-11-18.md) for intentional compatibility files and remaining safe-deletion gates.
- Native vault protection is partial. The Qt setup now migrates referenced media inside managed directories and can recover an interrupted media migration. Sensitive business-data fields in several SQLite modules remain plaintext, and the security audit must remain open.
- React Web account sign-in and full sync were verified against the deployed build. The account migration code also supports Tauri and Expo WebView, but installed Tauri/WebView acceptance is still open. Qt and native Android remain on separate local credential flows; see the [account migration checklist](./security/cloud-account-encryption-migration.md).
- The unified architecture establishes `core/synapse-core/` as the Single Source of Truth for domain models, SQLite repositories, and business calculations across all native clients, eliminating duplicated raw SQL queries in `desktop-qt` and `web-react/src-tauri`.

## Documentation Update Rules

1. Write technical documentation in English. Keep `README.pt-BR.md` as the localized Portuguese README.
2. Use paths relative to the Markdown file for repository links. Do not add machine-specific `file://` links or personal database locations.
3. Update the relevant source-of-truth document in the same change as a feature, migration, or security change.
4. Use `Partial`, `Missing`, or `Unverified` when acceptance evidence is incomplete. Avoid `100%`, `Production`, or fixed test totals unless reproducible current evidence supports the claim.
5. Validate links, commands, paths, and code references against the checked-out repository before reporting completion.
