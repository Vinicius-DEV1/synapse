# Cross-Application Module Structure

Synapse ships several clients with different UI and build frameworks. Their source trees should use the same module vocabulary and keep each module's code easy to locate, while respecting the architecture required by each framework.

## Canonical module IDs

Use these IDs when adding or documenting module code:

| Module ID | User-facing responsibility | Existing naming aliases |
| --- | --- | --- |
| `notes` | Caderno pages, editor, and page view | `editor` in older React and Qt paths |
| `library` | Book collection and reading | `library` |
| `video` | Local video library and player | `video-player` in the older React path |
| `questions` | Question batteries, quizzes, and review sessions | `quiz` in API names, route keys, and Kotlin symbols |
| `practice` | AI interview and oral practice | `practice` |
| `anki` | Flashcards and spaced repetition | `anki` |
| `diagrams` | Diagrams and whiteboards | `diagrams` |
| `files` | File browser and document tools | `files` |
| `calendar` | Calendar and events | `calendar` |
| `culture` | Books, films, series, and culture tracking | `culture` |
| `finance` | Transactions and financial planning | `finance` |
| `focus` | Focus timer and focus history | `focus` |
| `habits` | Habit tracking | `habits` |
| `home` | Home dashboard | `home` |
| `settings` | Application settings | `settings` |
| `trash` | Deleted item recovery | `trash` |
| `vault` | Encrypted credentials and assets | `vault` |
| `notifications` | Notification center | `notifications` |

Keep persisted route keys, database identifiers, and public API names stable during folder moves. For example, the Qt route key `quiz` remains valid although its source directory is `questions`.

## Verified Navigation Coverage

**Inventory date:** 2026-11-22.

This inventory records whether a client has a top-level route or overlay entry point. A route does not certify feature parity; the Qt feature comparison remains in the [native desktop parity matrix](../native-desktop-parity.md).

| Module or cross-cutting area | React/Tauri | Qt desktop | Android Compose | Android WebView shell |
| --- | --- | --- | --- | --- |
| Home | Route | Route | Route | Hosts React app |
| Notes | Route | Route | Route | Hosts React app |
| Questions (`quiz`) | Route | Route | Route | Hosts React app |
| Library | Route | Route | Route | Hosts React app |
| Video | Route | Route | Route | Hosts React app |
| Flashcards (`anki`) | Route | Route | Route | Hosts React app |
| Diagrams | Route | Route | Route | Hosts React app |
| Calendar | Route | Route | Native Core-backed event/task list and CRUD, month navigation, selected-day filtering, linked-page and notification deep links, date-range validation, recurring series creation/deletion, reminder offsets, and local Android alarm scheduling/restoration; cross-device sync and encryption remain open | Hosts React app |
| Culture | Route | Route | Native catalog with typed Core-backed create/edit/progress/goals/soft-delete and episode checklist; catalog APIs and sync are open | Hosts React app |
| Finance | Route | Route | Native Compose route with typed core-backed SQLite persistence; no Firebase sync | Hosts React app |
| Focus | Route | Route | Native Core-backed completed-session statistics/history and alarm records; timer state persists locally across navigation/process recreation; SAF-selected Lofi audio plays locally through Media3. Exact-time delivery, global/background playback, device acceptance, sync, and encryption remain open | Hosts React app |
| Habits | Editor widget/API; no standalone `Tab` or `ViewFactory` route | Editor widget/modal; no standalone sidebar route | Native route with typed Core persistence, check-ins, and shared streak metrics | Hosts React app; no separate shell route |
| Vault | Route | Route | Route | Hosts React app |
| Files | Route | Route | Native Core-backed browser with nested folders, recent/Drive metadata, SAF import, move/rename/duplicate, current-list filters, and bounded global file/folder search; Drive sync, bulk actions, export, app-native preview, page links, and encryption are open | Hosts React app |
| Practice | Route | No route found | Native Core-backed session history, transcript, notes, and memory management; AI provider/voice flows are open | Hosts React app |
| Trash | Route | Route | Route | Hosts React app |
| Settings | Route | Route | Native route with locally persisted note text size, spellcheck, Anki flip animation, and study sound preferences; other React settings are open | Hosts React app |
| Notifications | Global overlay | Global overlay | Native route with typed Core-backed list/read/delete and atomic 15-minute snooze; permission-aware system alerts and Core-backed Calendar reminders restore on reboot/app restart and open linked Notes or Calendar events; cross-device reminder sync and encryption remain open | Hosts React app |
| Workspaces | Switcher and management modals | No workspace management route found | No route found | Hosts React app |
| Authentication and cloud sync | Auth and sync flows | No equivalent shell flow found | No equivalent shell flow found | Hosts React app |
| AI assistant sidebar and sharing | Global overlays/actions | No equivalent flow found | No equivalent flow found | Hosts React app |

React and Qt desktop do not include `habits` as a standalone sidebar navigation route. Both expose habit APIs, in-note editor widgets (`HabitWidget`), and habit selection/heatmap modals (`HabitSelectModal`, `HabitHeatmapModal`); Android exposes a standalone Habits screen. Keep this scope difference explicit when tracking parity.

## Source locations by client

| Concern | React and Tauri | Native Qt desktop | Native Android | Android WebView shell |
| --- | --- | --- | --- | --- |
| Module presentation | `apps/web-react/src/components/<module>/` | `apps/desktop-qt/qml/<module>/` | `apps/mobile-android/app/src/main/java/com/synapse/features/<module>/ui/` | No product modules; embeds the React app |
| Module orchestration | Shared hooks in `apps/web-react/src/hooks/`, or focused hooks colocated under a module | Feature controllers in `apps/desktop-qt/src/controllers/<module>/` | Add ViewModels under the same `features/<module>/` package when a screen needs state orchestration | Shell lifecycle in `App.tsx` |
| Domain and persistence | Core repositories own migrated shared operations; remaining Tauri commands with direct SQL are tracked in `WEB-CORE-*`; Web browser uses `src/services/<module>/` and `bridge-wasm` where available | Thin C++ controllers delegate persistence and domain calculations to `core/synapse-core/` via `bridges/bridge-qt/` | Documented ViewModels and repositories delegate to `core/synapse-core/` via `bridges/bridge-uniffi/`; platform-only lifecycle state stays in Android preferences | No domain or product persistence layer |
| Platform boundaries | `apps/web-react/src/api/{contracts,web,tauri}/` | `bridges/bridge-qt/` | `bridges/bridge-uniffi/` | `src/config/` and `src/utils/` for shell-to-web bridge behavior |
| Module tests | Beside the implementation as `*.test.ts(x)` | `apps/desktop-qt/tests/<module>/` | `app/src/test/` or `app/src/androidTest/`, grouped by module | Beside shell logic when tests are introduced |

The React app intentionally keeps its top-level `components/`, `hooks/`, `store/`, `services/`, and `api/` layers. Match a module's name across those layer directories instead of putting platform I/O inside a view. Shared UI belongs in `components/ui/`; shared platform code belongs in `api/` or `services/`.

Qt keeps QML in a feature-first tree and groups thin C++ controllers under the same module ID. Controllers expose `Q_PROPERTY` and signals to QML while delegating SQLite queries and domain calculations to `core/synapse-core/` via `bridges/bridge-qt/`. `src/synapse_controller.*`, `src/main.cpp`, media integration, and platform helpers remain at the shared app level because they compose or serve multiple modules.

Android Compose groups feature screens under `features/<module>/ui/`. Finance, Files, Calendar, Culture, Diagrams catalog, Video catalog/folders, Focus, Habits, Trash, Notifications, Practice, Anki, Questions, Library, and supported Notes flows use module-owned repositories/ViewModels with typed `synapse-core` operations through UniFFI and the shared Android database path. Focus timer lifecycle and Settings display/interaction preferences use Android preferences for platform-specific state. The Diagrams canvas remains transient until its document format can interoperate with React Tldraw snapshots. Video stores catalog metadata, folders, and progress in Core while streaming Android document URIs directly; encrypted and remote playback remain open. Account, cloud sync, full encryption, and other cross-client settings remain open. See the [native Android Finance guide](../modules/mobile-android-finance.md) for Finance's local-only and encryption limits and the [Android parity checklist](../audits/mobile-android-parity/README.md) for the current feature inventory and implementation queue. Add `domain/`, `data/`, or `viewmodel/` only when the feature owns that responsibility; do not create empty placeholder packages. Theme, core bindings, and media primitives stay shared.

The Expo WebView project is a host shell, not a second copy of the React product. Keep its navigation bridge, safe-area integration, and native capabilities in the shell; implement product features in the React app or in the fully native Android app.

## Migration rules

1. Preserve public behavior, routes, database identifiers, IPC contracts, keyboard shortcuts, and visual output while reorganizing paths.
2. Move one cohesive module at a time and update imports, build manifests, generated-resource lists, and test paths in that same change.
3. Keep cross-platform business rules in `core/synapse-core/` only when their contracts are platform-neutral. Keep framework-specific presentation in the owning app.
4. Avoid compatibility wrapper trees after a module move. Update import sites and leave one source of truth.
5. Update this guide and the owning app's `AGENTS.md` whenever a module's canonical location changes.
