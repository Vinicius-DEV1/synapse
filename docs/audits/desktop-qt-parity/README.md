# Qt Desktop Parity Audit

**Audit date:** 2026-11-22

**Scope:** Native Qt/QML desktop compared with React/Tauri in apps/web-react

**Mode:** Read-only source and documentation audit. No implementation was changed; no build or test suite was run.

This folder is the handoff artifact for the next desktop parity implementation pass. It records concrete gaps found in source, areas requiring acceptance evidence, and an ordered checklist. A QML screen, controller, or matching directory is not proof of parity.

## Start here

1. Read the [feature matrix](feature-matrix.md) for status by product area.
2. Read [findings](findings.md) for evidence-backed gaps and priorities.
3. Read [architecture and core](architecture-and-core.md) before moving persistence or domain behavior.
4. Read [security and integrations](security-and-integrations.md) for accounts, sync, encryption, AI, sharing, media, and backups.
5. Read [UX and verification](ux-and-verification.md) for localization, accessibility, test inventory, and audit limits.
6. Read the [file review log](file-review-log.md) for files covered in the extended pass and the next review queue.
7. Use the domain checklists for [Focus and Notifications](focus-and-notifications.md), [Content and Media](content-and-media.md), [Library Reader](library-reader.md), [Library Visual Parity](library-visual-parity.md), [Vault and Habits](vault-and-habits.md), and [Finance](finance.md).
8. Implement from the sequenced [roadmap](roadmap.md), updating evidence as work progresses.

## Summary

Qt has broad, substantial native coverage. Notes, Library, Video, Finance, Culture, Questions, Anki, Calendar, and Practice include meaningful implementations. This audit does not mark an entire module absent when only specific workflows are incomplete.

The clearest confirmed parity gaps are:

- Qt cloud account and remote sync parity are absent. Settings reports sync success through a timer without invoking a sync service.
- Workspace and page-sharing surfaces are primarily presentation-only and lack persisted collaborative/access-control flows equivalent to React.
- Several AI surfaces return canned or templated content; microphone and Anki recording UIs are simulations rather than capture.
- Calendar reminder and recurrence controls are not wired through the Qt form/controller API although Core has corresponding operations.
- YouTube download and parts of video upload report simulated progress/results.
- Native diagram JSON is not demonstrated to round-trip React/Tldraw snapshots.
- Qt settings cover fewer preferences than React, and several visible settings appear local to QML components.
- Generic SQL remains exposed to QML and direct SQL remains in app controllers despite the parity tracker claiming full Core centralization.
- A Qt translation catalog workflow was not found. Accessibility and same-viewport visual acceptance still need systematic evidence.
- Notes has an extensive native editor, but live Yjs collaboration is not present and help content documents unsupported source-only structures.
- Focus alarms and snoozed notifications have no observed native delivery scheduler; Focus settings are local component values and range-specific history clearing deletes every session.
- Diagram import/export advertises Excalidraw/Tldraw/PNG interoperability that the current raw-shape serialization cannot provide.
- The Finance loan tab is seeded with demo loans and changes payment amounts only in QML while creating an unrelated expense; Core has typed loan/payment operations that Qt does not expose here.
- The Library reader persists highlights, but its PDF surface is an image without a highlight layer; EPUB highlights are likewise not rendered back into chapter content. The Home weather widget presents fixed values as current weather.
- Library visual parity remains substantially open in the reader: Qt is a single-page image/text surface with a compact toolbar, while React includes continuous PDF presentation, zoom/fit controls, contextual annotation panels, and richer EPUB reading controls. The book/collection browser needs screenshot-based comparison before it can be claimed visually equivalent.

See individual findings for locations, limitations, and acceptance criteria. These findings describe observed gaps; they do not claim every React behavior has been exhaustively exercised.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| **Confirmed gap** | Source evidence shows the flow is absent, mocked, not persisted, or not interoperable. |
| **Partial** | A real native flow exists, but a material React capability or integration is missing. |
| **Implemented; revalidate** | Native code appears meaningful; this audit did not prove full behavioral, error, or visual parity. |
| **Unverified** | Static inspection did not establish presence or absence. Keep open until acceptance evidence exists. |

## Update rules

- Compare the current React contract, native QML/controller, typed bridge, Core/service operation, and relevant tests before changing status.
- Check a box only after implementation exists and reproducible verification is recorded.
- Prefer focused tests plus manual acceptance notes with environment and data details. A passing build alone does not prove parity.
- Keep technical documentation in English, use relative links, and do not copy old test totals or “Complete” labels without revalidating them.
- For completed gaps, record the exact command/result, date, and change reference.

## Related sources

- [Cross-application module structure](../../architecture/module-structure.md)
- [Native desktop parity tracker](../../native-desktop-parity.md) — useful history, but broad claims conflict with current source; see [verification](ux-and-verification.md).
- [Native encryption audit](../../security/native-encryption-audit.md)
- [Setup and build guide](../../guides/setup-and-build.md)
- [Qt app guidance](../../../apps/desktop-qt/AGENTS.md)
- [Root engineering rules](../../../AGENTS.md)

