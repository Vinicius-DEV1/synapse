# Documentation Ownership and Current Status

**Last reviewed:** 2026-11-13

This page identifies the current sources of truth. Older reports and migration plans may contain estimates, test totals, file paths, or completion checkboxes that have not been revalidated. Do not use those records as proof of current implementation status.

## Current Sources of Truth

| Topic | Current document | What it governs |
| --- | --- | --- |
| Repository and app ownership | [Repository layout](./architecture/repository-layout.md) | Product directories, build owners, and shared-code boundaries |
| Cross-app module inventory | [Module structure](./architecture/module-structure.md) | Canonical module IDs, source locations, and current route presence per client |
| Qt desktop feature parity | [Native desktop parity matrix](./native-desktop-parity.md) | Verified Qt coverage and remaining React parity gaps |
| Qt vault and encryption coverage | [Native encryption audit](./security/native-encryption-audit.md) | Implemented protection, test evidence, and open encryption risks |
| Build and setup commands | [Setup and build guide](./guides/setup-and-build.md) | Current build commands and prerequisites |
| System architecture | [Architecture overview](./architecture/overview.md) | Runtime responsibilities and platform boundaries |
| Engineering rules | [Root AGENTS.md](../AGENTS.md) and app-level `AGENTS.md` files | Required code, testing, documentation, and ownership rules |
| Skill specifications | [Engineering skills index](../.agents/skills/README.md) | Agent playbooks; specifications are not implementation evidence |

## Verified Project Status

- The repository contains React Web/Tauri, native Qt desktop, native Kotlin/Compose Android, and an Expo/WebView Android shell. The root npm workspace delegates to `apps/web-react/`; other app targets keep their own build systems.
- Qt desktop feature parity is still partial. Use the parity matrix for per-module gaps; a present screen does not mean the module passed the acceptance gates.
- Native vault protection is partial. The Qt setup now migrates referenced media inside managed directories and can recover an interrupted media migration. Sensitive business-data fields in several SQLite modules remain plaintext, and the security audit must remain open.
- The React client remains the visual and functional reference for native parity. Native Android parity has not been independently certified by the Qt matrix.

## Current Roadmap

The [native ecosystem migration roadmap](./planos/2026-11-09-migracao-ecossistema-nativo-synapse.md) was refreshed on 2026-11-10. It records the accepted order of work, but acceptance and completion evidence still come from the parity matrix and security audit.

## Historical Reports and Proposals

The following documents are retained as plans, reports, or technical snapshots. Their statements and checkboxes are historical unless a current source of truth above confirms them:

- [`migracao-qt6-android/`](./migracao-qt6-android/)
- [`AUDITORIA.md`](./AUDITORIA.md), [`CONFERENCIA.md`](./CONFERENCIA.md), [`REVISAO.md`](./REVISAO.md)
- [`DESEMPENHO.md`](./DESEMPENHO.md), [`ROLAGEM.md`](./ROLAGEM.md), [`TESTES.md`](./TESTES.md)
- [`architecture/multiuser-workspace-analysis.md`](./architecture/multiuser-workspace-analysis.md) and [`architecture/multiuser-workspace-action-plan.md`](./architecture/multiuser-workspace-action-plan.md)

Historical reports may document findings that were fixed or superseded. Confirm each finding against current source before acting on it. Do not copy old machine-specific database paths, performance numbers, test counts, or completion claims into current documentation.

## Documentation Update Rules

1. Write technical documentation in English. Keep `README.pt-BR.md` as the localized Portuguese README.
2. Use paths relative to the Markdown file for repository links. Do not add machine-specific `file://` links or personal database locations.
3. Update the relevant source-of-truth document in the same change as a feature, migration, or security change.
4. Use `Partial`, `Missing`, or `Unverified` when acceptance evidence is incomplete. Avoid `100%`, `Production`, or fixed test totals unless reproducible current evidence supports the claim.
5. Validate links, commands, paths, and code references against the checked-out repository before reporting completion.
