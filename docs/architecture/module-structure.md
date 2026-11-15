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

**Inventory date:** 2026-11-11.

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
| Calendar | Route | Route | Route | Hosts React app |
| Culture | Route | Route | Route | Hosts React app |
| Finance | Route | Route | Route | Hosts React app |
| Focus | Route | Route | Route | Hosts React app |
| Habits | Editor widget/API; no standalone `Tab` or `ViewFactory` route | Editor widget/modal; no standalone sidebar route | Route | Hosts React app; no separate shell route |
| Vault | Route | Route | Route | Hosts React app |
| Files | Route | Route | No route found | Hosts React app |
| Practice | Route | No route found | No route found | Hosts React app |
| Trash | Route | Route | Route | Hosts React app |
| Settings | Route | Route | No route found | Hosts React app |
| Notifications | Global overlay | Global overlay | No native route found | Hosts React app |
| Workspaces | Switcher and management modals | No workspace management route found | No route found | Hosts React app |
| Authentication and cloud sync | Auth and sync flows | No equivalent shell flow found | No equivalent shell flow found | Hosts React app |
| AI assistant sidebar and sharing | Global overlays/actions | No equivalent flow found | No equivalent flow found | Hosts React app |

React and Qt desktop do not include `habits` as a standalone sidebar navigation route. Both expose habit APIs, in-note editor widgets (`HabitWidget`), and habit selection/heatmap modals (`HabitSelectModal`, `HabitHeatmapModal`); Android exposes a standalone Habits screen. Keep this scope difference explicit when tracking parity.

## Source locations by client

| Concern | React and Tauri | Native Qt desktop | Native Android | Android WebView shell |
| --- | --- | --- | --- | --- |
| Module presentation | `apps/web-react/src/components/<module>/` | `apps/desktop-qt/qml/<module>/` | `apps/mobile-android/app/src/main/java/com/synapse/features/<module>/ui/` | No product modules; embeds the React app |
| Module orchestration | Shared hooks in `apps/web-react/src/hooks/`, or focused hooks colocated under a module | Feature controllers in `apps/desktop-qt/src/controllers/<module>/` | Add ViewModels under the same `features/<module>/` package when a screen needs state orchestration | Shell lifecycle in `App.tsx` |
| Domain and persistence | Canonical domain logic and SQLite repositories in `core/synapse-core/` (Tauri commands delegate directly); Web browser uses `src/services/<module>/` with `bridge-wasm` | Thin C++ controllers delegate persistence and domain calculations to `core/synapse-core/` via `bridges/bridge-qt/` | ViewModels delegate domain and persistence to `core/synapse-core/` via `bridges/bridge-uniffi/` | No domain or product persistence layer |
| Platform boundaries | `apps/web-react/src/api/{contracts,web,tauri}/` | `bridges/bridge-qt/` | `bridges/bridge-uniffi/` | `src/config/` and `src/utils/` for shell-to-web bridge behavior |
| Module tests | Beside the implementation as `*.test.ts(x)` | `apps/desktop-qt/tests/<module>/` | `app/src/test/` or `app/src/androidTest/`, grouped by module | Beside shell logic when tests are introduced |

The React app intentionally keeps its top-level `components/`, `hooks/`, `store/`, `services/`, and `api/` layers. Match a module's name across those layer directories instead of putting platform I/O inside a view. Shared UI belongs in `components/ui/`; shared platform code belongs in `api/` or `services/`.

Qt keeps QML in a feature-first tree and groups thin C++ controllers under the same module ID. Controllers expose `Q_PROPERTY` and signals to QML while delegating SQLite queries and domain calculations to `core/synapse-core/` via `bridges/bridge-qt/`. `src/synapse_controller.*`, `src/main.cpp`, media integration, and platform helpers remain at the shared app level because they compose or serve multiple modules.

Android Compose groups feature screens under `features/<module>/ui/`. Add `domain/`, `data/`, or `viewmodel/` only when the module owns that responsibility; do not create empty placeholder packages. Theme, core bindings, and media primitives stay shared.

The Expo WebView project is a host shell, not a second copy of the React product. Keep its navigation bridge, safe-area integration, and native capabilities in the shell; implement product features in the React app or in the fully native Android app.

## Migration rules

1. Preserve public behavior, routes, database identifiers, IPC contracts, keyboard shortcuts, and visual output while reorganizing paths.
2. Move one cohesive module at a time and update imports, build manifests, generated-resource lists, and test paths in that same change.
3. Keep cross-platform business rules in `core/synapse-core/` only when their contracts are platform-neutral. Keep framework-specific presentation in the owning app.
4. Avoid compatibility wrapper trees after a module move. Update import sites and leave one source of truth.
5. Update this guide and the owning app's `AGENTS.md` whenever a module's canonical location changes.
