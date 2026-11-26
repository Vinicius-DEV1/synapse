# Native Qt Desktop

`apps/desktop-qt/` is the native desktop target. It uses Qt 6 Quick/QML for presentation, focused C++ controllers for UI orchestration, Rust domain APIs through `bridges/bridge-qt/`, and `core/synapse-core/` for shared domain and SQLite persistence.

## Source boundaries

| Layer | Location | Responsibility |
| --- | --- | --- |
| QML presentation | `apps/desktop-qt/qml/` | Shell, routes, widgets, dialogs, menus and design tokens |
| C++ orchestration | `apps/desktop-qt/src/controllers/` | `Q_PROPERTY`, signals, lifecycle and typed bridge coordination |
| Qt bridge | `bridges/bridge-qt/` | Typed C ABI/domain adapters between C++ and Rust Core |
| Shared domain and storage | `core/synapse-core/` | Domain rules, SQLite schema, migrations and repositories |
| Native media | Qt/MPV integration under `apps/desktop-qt/` | Native media rendering and playback controls |

Keep C++ controllers thin. QML and controllers must not assemble SQL or independently implement canonical business rules. Keep UI work native Qt Quick; do not embed a browser engine as the application shell or editor.

## UI parity workflow

React Web is the user-visible reference for shared product flows. Compare each Qt view with its React counterpart at matching viewport dimensions and scale. Include dialog and modal inventory, not just primary screens: creation, edit, selection, confirmation, error, empty, loading and destructive-action dialogs all count. For each one, compare dimensions, anchoring, overlay opacity, spacing, typography, icons, scrolling, tab/section structure, button order, keyboard shortcuts, focus entry/restore, Escape behavior and resize behavior.

For the Notes/Caderno editor, inspect rich text, block widgets, nested containers, tables, columns, slash commands, drag/drop, undo, save conflicts, history, bundle/file flows and cross-client HTML round trips. Preserve editor state, cursor, selection, stable IDs and unknown supported attributes. The detailed active Notes comparison and acceptance checklist live outside `docs/`; this guide records the stable architecture and verification boundaries.

## Native lifecycle and performance

Prefer Qt signals and property bindings over polling. Disconnect observers and stop timers when delegates close or are destroyed. Use bounded, lazy model loading for large data sets and keep expensive parsing or storage work outside UI event handlers. Use native media and OS integration where available.

## Build and verification

Configure and build with the Qt/CMake commands in [Setup and build](../guides/setup-and-build.md). Use focused QML lint, Core/bridge tests and Qt CTest targets for changed behavior. A successful build proves compilation, not visual or runtime parity.
