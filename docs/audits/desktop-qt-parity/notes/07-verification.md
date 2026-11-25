# Caderno Verification Plan

## Current pass boundary

The source audit and follow-up fixes were built and format-checked as noted below. Tests, QML lint, screenshots, accessibility checks and benchmarks were not run. Do not treat prior test counts or earlier parity-document entries as verification for this worktree. The scenarios below remain the implementation acceptance plan; run them only when authorized by the task and repository instructions.

## Checks completed in this pass

| Check | Result | Scope and limits |
| --- | --- | --- |
| `cargo check --manifest-path core/synapse-core/Cargo.toml` | Passed | Core library compiles in the dev profile. |
| `cargo build --manifest-path bridges/bridge-qt/Cargo.toml` | Passed | Debug Qt bridge library exports the updated Notes FFI. |
| `cargo build --release --manifest-path bridges/bridge-qt/Cargo.toml` | Passed | Release Qt bridge library used by the configured desktop build. |
| `cmake --build apps/desktop-qt/build --target synapse-desktop -j2` | Passed after rebuilding the release bridge and moving the Notes width adapter | Builds and links the desktop application. The configured target does not parse/load QML or execute the application. |
| Focused `rustfmt --edition 2021 --config skip_children=true --check` across changed Notes Core and Qt bridge Rust files | Passed | Every changed Rust file in the Notes Core and Qt bridge modules was formatted and checked. Repository-wide `cargo fmt --check` reports formatting differences in unrelated modules and is not used as a Notes result. |
| QML JavaScript helper syntax | Passed | `node --check` parsed the three Notes script modules after removing QML `.pragma`/`.import` directives. This checks JavaScript syntax only, not QML integration or Qt-engine behavior. |
| Slash catalog source crosswalk | Passed | A focused source extraction compared all 31 React command IDs, titles, subtitles and keyword arrays with Qt; all 31 matched, with Qt-only Mermaid as the single additional command. This does not validate action behavior or UI rendering. |
| `git diff --check` | Passed | No whitespace errors in the diff at the time of the check. |
| Tests, `qmllint`, visual and interaction checks | Not run | The existing Qt slash-menu test expectation was updated from the Qt-only `assistente` alias to React's `prompt` alias, but the test was not executed. No `qmllint`, `qmlformat`, or QML runtime executable was found on `PATH`; UI acceptance remains open. |

## Focused source and Core checks

1. Review the current `core/synapse-core` Notes module and run the focused Notes Core tests from the active Cargo workspace; capture the exact command and result.
2. Build the Qt Notes bridge and desktop targets with the repository's documented `cmake` configuration.
3. Run the focused Qt Notes native/QML test targets only; do not run the global application test sweep for iteration.
4. Run `qmllint` on every changed Notes QML file, including newly moved/subdirectory files and `qmldir` registrations.
5. Run `git diff --check` and inspect changed paths for accidental React layout/behavior modifications or unrelated modules.

Use `docs/guides/setup-and-build.md`, `docs/guides/testing-and-quality.md`, and the active CMake targets as the authoritative current commands. Names of test targets can change; verify them from `apps/desktop-qt/CMakeLists.txt` instead of copying historical totals.

## Required interaction scenarios

- Open, edit, save, close, reopen and cross-client round-trip a note containing every block type.
- Insert every slash command at start/middle/end of text and inside nested toggle, collection, blockquote-toggle and column content; verify query handling, cursor, undo and error behavior.
- Edit one of several blocks while changing another; verify the active cursor/selection remains stable and only intended content changes.
- Create two tables in one slice, filter each independently, save while filtering, clear filters, and confirm all hidden rows and the inactive table remain unchanged.
- Drop one and multiple non-image files, including paths with spaces and non-ASCII characters; verify encrypted import, canonical IDs, order, failure, lock and cancellation.
- Place supplementary Unicode and combining marks before widget insertion boundaries; check split text and insertion positions.
- Apply/clear text and background block colors, save, reload and round-trip through React.
- Resize existing columns, drop a block into the column group, undo and confirm widths/attributes/content.
- Exercise image import, clipboard, batch drop, resize, caption, alignment, crop, undo, locked key and unsupported format paths.
- Exercise history, restore, save conflict, autosave failure, page/tab switch, app close, encrypted page lock/unlock and recovered backup.

## Visual and accessibility comparison

Capture React and Qt at identical viewport dimensions, device pixel ratio, font installation, zoom, theme, page data and editor state. Compare page width (React desktop reading column is 928 px), cover offset, typography, line height, colors, icon shape, border radius, spacing, selection, hover, focus, menus, toolbars, widget heights and modal placement. Keep screenshots with scenario names and viewport metadata in the review record; do not add screenshots to the product unless the repo’s artifact convention calls for it.

Run keyboard-only and screen-reader review for the slash menu, page references, task lists, table controls, image actions, dialogs, delete confirmation, link preview and each widget whose controls are not ordinary text fields. Verify accessible label, role, current value/state, focus order, Escape behavior and focus restoration.

## Performance review

Record cold start, editor-ready, keystroke latency, frame pacing while scrolling, Core parse/serialize time, autosave time and peak memory for a defined set of small/medium/large notes. Include block count, table rows/columns, image dimensions, Qt/build version and hardware. Profile before introducing virtualization or incremental editing, then repeat the same workload.

## Evidence record template

For every checklist group, record:

- Source commit and worktree state.
- Exact command or manual scenario.
- Platform, tool versions, viewport and test data.
- Pass/fail result and relevant logs/screenshots.
- Known limitation and linked bug ID.
- Reviewer and date.
