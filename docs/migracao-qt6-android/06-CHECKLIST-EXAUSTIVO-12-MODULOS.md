# Native Module Acceptance Checklist

**Status:** This page replaces the old checked-off migration list. Previous checkboxes did not establish full functional or visual parity. The live Qt module status is maintained in the [native desktop parity matrix](../native-desktop-parity.md).

## Acceptance Gates

A module can be marked complete only after reviewing all of the following against the React reference:

- Every entry point, control, shortcut, keyboard flow, modal, empty state, loading state, and error state.
- CRUD and restoration behavior, including soft-delete, history, and destructive-action confirmation.
- Data migration, encryption coverage, lock behavior, and failure recovery.
- Visual comparison at matched viewport, scale factor, theme, locale, and representative data.
- A native build plus focused automated or documented manual checks.

## Current High-Level Qt Status

| Module area | Status |
| --- | --- |
| Notes/editor | Partial |
| Library/reader | Partial |
| Video/media | Partial |
| Anki/FSRS | Partial |
| Questions | Partial |
| Finance, habits, calendar, culture, focus, files, vault, diagrams, trash, settings, notifications | Partial; see the module matrix for individual gaps |
| Practice/AI tutor | Missing from the native Qt shell |
| Authentication, cloud sync, and sharing shell flows | Missing or not verified in the native Qt shell |

The native Android app is a separate client and is not certified by this Qt checklist. See the [documentation status index](../documentation-status.md) for current source-of-truth documents.
