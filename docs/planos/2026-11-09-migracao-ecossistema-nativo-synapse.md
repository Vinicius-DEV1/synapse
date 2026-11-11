# Native Ecosystem Migration Roadmap

**Last reviewed:** 2026-11-10
**Status:** Active work; no blanket feature-parity, security, or performance completion is claimed.

This roadmap replaces the original checked-off plan as the current work sequence. Current verified status lives in the [documentation status index](../documentation-status.md), [native desktop parity matrix](../native-desktop-parity.md), and [native encryption audit](../security/native-encryption-audit.md).

## Product Targets

| Target | Role |
| --- | --- |
| `apps/web-react/` | React web client and Tauri v2 hybrid desktop shell; functional and visual reference |
| `apps/desktop-qt/` | Fully native Qt Quick/QML desktop client |
| `apps/mobile-android/` | Kotlin and Jetpack Compose native Android client |
| `apps/mobile-webview/` | Expo shell hosting the React web app |
| `core/synapse-core/` | Shared Rust database, crypto, FSRS, and media capabilities currently implemented |
| `bridges/` | Qt C ABI, Android UniFFI, and selected WebAssembly bindings |

The Rust core does not yet own every module's business logic or persistence. App controllers and adapters remain responsible for platform-specific behavior.

## Priority Order

| Priority | Module area | Current status | Acceptance focus |
| --- | --- | --- | --- |
| 1 | Notes/editor | Partial | Preserve TipTap document semantics, rich-text editing, widgets, shortcuts, history, and error recovery |
| 2 | Library and reader | Partial | Match PDF/EPUB navigation, TOC, annotations, search, progress, metadata, and media handling |
| 3 | Video and media | Partial | Match import, streaming, subtitles, tracks, seeking, progress, dialogs, and cleanup |
| 4 | Anki, questions, finance, habits, calendar, culture, focus, files, vault, notifications, trash, settings, home | Partial by module | Use the live matrix for individual React-to-Qt comparisons |
| 5 | Diagrams and AI practice | Last, per the accepted priority order | Complete remaining parity only after the higher-priority modules |
| Separate review | Native Android | Not certified by the Qt matrix | Build and compare each Compose module against the same functional acceptance gates |

## Security Work

The Qt vault now migrates referenced media in the managed `files/`, `library/`, and `videos/` directories during initial setup. A persistent journal allows unlock to resume interrupted file replacement. Setup refuses to proceed when a referenced local asset exists outside its managed directory.

Critical work remains open:

- Sensitive business records in finance, calendar, habits, culture, Anki, questions, focus, notifications, tutor, and library annotation/cache tables remain plaintext at rest.
- Some titles, paths, progress fields, and other metadata remain visible.
- External assets and cross-client recovery of the Qt media migration journal are not covered.
- Fixed-salt compatibility, legacy key fallback, and complete residual-memory/WAL cleanup remain open.

Do not claim repository-wide E2EE until the audit gates are closed for each client and entity. The current source of truth is the [native encryption audit](../security/native-encryption-audit.md).

## Verification and Completion Rules

A module is complete only after:

1. Every React entry point and user action has a native equivalent, including shortcuts, loading/error states, confirmations, and recovery.
2. Data reads, writes, soft-delete, restore, export, and migration preserve the same behavior and data semantics.
3. Layout and interactions are compared at matched viewport, scale factor, theme, locale, and representative data.
4. Focused automated or documented manual verification passes for the target app.
5. Remaining gaps are removed from the parity matrix only after evidence is recorded.

Qt build and focused test commands are in the [setup and build guide](../guides/setup-and-build.md) and [testing guide](../TESTES.md). Do not reuse historical test totals or old completion checkboxes as release evidence.
