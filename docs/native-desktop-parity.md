# Native Desktop Parity

React Web is the functional and visual reference for shared product workflows. The native Qt app is a separate Qt Quick application that should match the supported React behavior while using native controls and shared Rust domain operations.

## Current status

Native Qt parity is **partial**. Module presence or a successful build does not establish full feature equivalence. The Notes/Caderno editor has a native block-based implementation backed by the shared Notes AST, Qt Quick widgets and typed bridge APIs. Its core architecture is established, while a number of modal, editor interaction, visual, persistence, accessibility and React round-trip acceptance checks remain open. A focused production test exposed and fixed the page-reference popover's 0×0 geometry; Qt now keeps it within React's 288×320 px bounds and dismisses clicks outside the menu within the editor. The Notes guide now documents current editing/page controls and keyboard actions, with focused QML coverage; translated-catalog runtime and matched-viewport review remain open. Matched-viewport appearance, edge placement, focus/accessibility and dismissal outside the editor remain unverified; see the [Notes guide](./modules/notes.md) and active [Notes parity audit](../audits/desktop-qt-parity/notes/README.md).

The stable client boundaries are documented in [Native Qt Desktop](./platforms/desktop-qt.md), [React Web and Tauri](./platforms/react-web-tauri.md), and [Shared Core and Bridges](./platforms/shared-core-and-bridges.md). Notes-specific architecture and current limits are consolidated in [Notes](./modules/notes.md). Active parity inventories and unresolved findings are kept outside `docs/` until their acceptance is complete.

## Parity acceptance standard

For a feature to be described as matching React, verify all of the following for its supported scope:

1. **Entry points and navigation:** route, toolbar, context menu, keyboard shortcut, deep link, and widget entry points.
2. **Interaction lifecycle:** create, view, edit, cancel, confirm, undo, retry, restore, and failure recovery.
3. **Dialog completeness:** each React modal and nested dialog exists in Qt where applicable, with matching purpose, content, hierarchy, layout, controls, labels and result.
4. **Visual behavior:** compare the same viewport and scale for dimensions, alignment, spacing, typography, colors, icons, backdrop, shadows, hover/focus/pressed states, scrolling and resizing.
5. **Keyboard and accessibility:** focus entry/return, Escape and outside-click behavior, shortcuts, tab order, labels, screen-reader semantics and non-mouse alternatives.
6. **Data behavior:** Core-backed persistence, validation, loading/empty/error states, conflict handling, local Trash/restore and cross-client serialization where supported.
7. **Runtime quality:** native responsiveness, bounded resource use, clean lifecycle teardown and no UI blocking during storage or media operations.

## Evidence policy

Keep a capability marked partial or unverified until runtime interaction, persistence, failure behavior, accessibility and same-viewport visuals have evidence. Build and lint results establish compilation and static validity only. Detailed comparison logs belong with active implementation work; this document records the durable acceptance standard and current overall status.
