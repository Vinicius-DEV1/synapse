# Synapse Module Catalog

This catalog identifies product modules and their React and native source locations. It is not a completion checklist. Native Qt gaps are maintained in the [parity matrix](../native-desktop-parity.md); local encryption coverage is maintained in the [native encryption audit](../security/native-encryption-audit.md).

## Canonical Module IDs

| Module ID | Responsibility | React Web/Tauri presentation | Qt presentation |
| --- | --- | --- | --- |
| `notes` | Notes, editor, page history | `apps/web-react/src/components/notes/` and editor/page-view areas | `apps/desktop-qt/qml/notes/` |
| `library` | Book catalog and reader | `apps/web-react/src/components/library/` | `apps/desktop-qt/qml/library/` |
| `video` | Video library and playback | `apps/web-react/src/components/video/` | `apps/desktop-qt/qml/video/` |
| `questions` | Question sets and study sessions | `apps/web-react/src/components/questions/` | `apps/desktop-qt/qml/questions/` |
| `practice` | AI and oral practice | `apps/web-react/src/components/practice/` | No native Qt route is currently identified |
| `anki` | Flashcards and spaced repetition | `apps/web-react/src/components/anki/` | `apps/desktop-qt/qml/anki/` |
| `diagrams` | Diagrams and whiteboards | `apps/web-react/src/components/diagrams/` | `apps/desktop-qt/qml/diagrams/` |
| `files` | File browser and document tools | `apps/web-react/src/components/files/` | `apps/desktop-qt/qml/files/` |
| `calendar` | Calendar and events | `apps/web-react/src/components/calendar/` | `apps/desktop-qt/qml/calendar/` |
| `culture` | Media and culture tracking | `apps/web-react/src/components/culture/` | `apps/desktop-qt/qml/culture/` |
| `finance` | Transactions and financial planning | `apps/web-react/src/components/finance/` | `apps/desktop-qt/qml/finance/` |
| `focus` | Focus timer and history | `apps/web-react/src/components/focus/` | `apps/desktop-qt/qml/focus/` |
| `habits` | Habit tracking | `apps/web-react/src/components/habits/` | `apps/desktop-qt/qml/habits/` |
| `home` | Dashboard and navigation | `apps/web-react/src/components/home/` | `apps/desktop-qt/qml/home/` |
| `settings` | Application preferences and security | `apps/web-react/src/components/settings/` | `apps/desktop-qt/qml/settings/` |
| `trash` | Deleted-item recovery | `apps/web-react/src/components/trash/` | `apps/desktop-qt/qml/trash/` |
| `vault` | Credential management | `apps/web-react/src/components/vault/` | `apps/desktop-qt/qml/vault/` |
| `notifications` | Notification center and reminders | `apps/web-react/src/components/notifications/` | `apps/desktop-qt/qml/notifications/` |

The Kotlin/Compose client groups screens under `apps/mobile-android/app/src/main/java/com/synapse/features/<module>/ui/`. The Expo shell at `apps/mobile-webview/` hosts React and must not become a second product-module implementation.

## Architecture and Persistence

- React keeps presentation, orchestration, services, and platform APIs in its existing layer roots under `apps/web-react/src/`.
- Qt keeps QML in `apps/desktop-qt/qml/<module>/` and feature controllers in `apps/desktop-qt/src/controllers/<module>/`.
- Android-specific presentation and lifecycle logic stays in the Android app. Platform-neutral Rust capabilities belong in `core/synapse-core/` when the relevant contracts are implemented.
- Database tables, crypto keys, and storage adapters are product-specific concerns. A module name or keychain entry alone does not prove that the module's data is encrypted.
- The canonical module naming and path rules are documented in [the cross-application module structure guide](../architecture/module-structure.md).

## Module References

- [Notes](./notes.md)
- [Vault](./vault.md)
- [Anki and FSRS](./anki-fsrs.md)
- [ENC1 media protocol](../protocols/enc1-streaming.md)
- [Native desktop parity](../native-desktop-parity.md)
- [Native encryption coverage](../security/native-encryption-audit.md)
