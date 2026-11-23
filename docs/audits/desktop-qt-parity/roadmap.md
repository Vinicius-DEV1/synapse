# Implementation Roadmap

This order separates product gaps from architecture and release acceptance. Work in small module scopes and preserve existing native behavior.

## Phase 0 — Establish a trustworthy baseline

- [x] DESK-PAR-001: reconcile parity tracker claims against source and add evidence.
- [x] Assign criteria to every Confirmed gap and Unverified row in [feature matrix](feature-matrix.md).
- [x] Replace misleading success/demo states with unavailable/demo labels until services exist.
- [x] Establish clean build, focused CTest, QML lint, and disposable database commands.
- [x] Capture React/Qt fixtures for Calendar, Notes/extensions, Diagrams, Video, and Anki.

**Exit gate:** Every advertised flow maps to real behavior or an explicit limitation. No UI reports completion without a successful operation.

## Phase 1 — Define cross-client data and security contracts

- [x] DESK-PAR-021: define entity-level Qt encryption and recovery gates using the current encryption audit.
- [x] DESK-PAR-004 and DESK-PAR-003: decide account/sync scope and design identity, key lifecycle, conflict, retry, offline, and acknowledgement contracts.
- [x] DESK-PAR-014: collect diagram fixtures and define interoperable snapshot behavior before changing stored data.
- [x] DESK-PAR-019: define Notes serialization, unknown-node preservation, and live collaboration scope.
- [x] DESK-PAR-005 and DESK-PAR-006: define workspace scoping, role enforcement, and share-link semantics.
- [x] Version migrations, make them reversible, and test on copies of real-shaped databases.

**Exit gate:** Cross-client data/security behavior has written contracts, fixtures, and rollback plans before UI advertises parity.

## Phase 2 — Close high-impact native gaps

- [x] DESK-PAR-002: wire Calendar reminders/recurrence through QML, typed controller, bridge, Core, and notifications.
- [x] DESK-PAR-013: implement Anki audio capture, card attachment, and playback.
- [x] DESK-PAR-008: implement real Practice microphone capture and measured state.
- [x] DESK-PAR-007 and DESK-PAR-009: replace canned Practice/sidebar/question-generation responses with validated provider calls.
- [x] DESK-PAR-010 and DESK-PAR-011: implement Library lookup/enrichment and Files document analysis or explicitly scope unavailable actions.
- [x] DESK-PAR-012: connect YouTube download and truthful upload progress/metadata.
- [x] DESK-PAR-023 through DESK-PAR-029: repair Focus lifecycle/alarm/history-range behavior, notification scheduling, Files audio playback, Culture provider search, diagram import/export, and Anki AI generation.
- [x] DESK-PAR-031 and DESK-PAR-032: replace synthetic Habits analytics and make Vault breach lookup asynchronous, cancellable, and revision-safe.
- [x] DESK-PAR-033: replace Finance loan demo state with typed Core loan/payment/pending/recurrence flows and atomic reconciliation.
- [x] DESK-PAR-034: implement portable, visible PDF/EPUB annotations and reader-location navigation.
- [x] DESK-PAR-035: replace or accurately label the Home weather placeholder; implement a privacy-safe provider only if this is a supported feature.
- [x] DESK-PAR-036: complete the Library visual/interaction comparison and close the approved reader layout/control deltas with screenshot evidence.
- [x] DESK-PAR-037: make the primary Qt book-details surface information- and visually-equivalent to the approved React/native contract.
- [x] DESK-PAR-038: align the Library shell hierarchy and bind Qt grid breakpoints to live available width, with resize/DPI screenshot evidence.
- [x] DESK-PAR-039: implement React-equivalent Library offline download/cache eviction state and card/menu affordances.
- [x] DESK-PAR-005 and DESK-PAR-006: persist workspace/sharing with backend authorization.
- [x] DESK-PAR-015: implement agreed settings breadth, persistence, and safe backup restore.

**Exit gate:** Each flow has success, failure, cancellation, retry, persistence, and cross-client acceptance.

## Phase 3 — Architecture and maintainability

- [x] DESK-PAR-017: remove generic SQL from QML and feature controllers; document narrow infrastructure/migration exceptions.
- [ ] DESK-PAR-018: decompose global controller and largest files in tested steps.
- [ ] Add typed bridge contracts and focused tests for new operations.
- [ ] Keep canonical domain logic in synapse-core and QML presentation-only.
- [ ] Add static inventory for orphaned QML signals, methods, and unused mock surfaces.
- [ ] Update Qt app guidance and parity docs when boundaries change.

**Exit gate:** No new domain logic or generic SQL enters QML/controllers; remaining exceptions are owned and tested.

## Phase 4 — Release-quality UX and distribution

- [ ] DESK-PAR-016: establish translation catalogs and supported locale checks.
- [ ] DESK-PAR-020: map matrix requirements to tests/manual cases.
- [ ] Complete accessibility and shortcut acceptance from [UX and verification](ux-and-verification.md).
- [ ] Complete matched-window screenshots and document native differences.
- [ ] Run startup, memory, large-list, import, and media performance checks from [UX and verification](ux-and-verification.md).
- [ ] DESK-PAR-022: verify clean-machine dependencies, packaging, fallback, upgrade, and uninstall.
- [ ] Update help guides and this audit as behavior changes.
- [ ] Attach exact current build/test command results before checking completion.

**Exit gate:** Supported builds, localization, accessibility, tests, and packaging have reproducible evidence.

## Done definition for every gap

- [ ] React behavior and data contract are recorded.
- [ ] QML → controller → typed bridge → Core/platform integration is complete.
- [ ] Failure, cancel, offline, recovery, and destructive paths are handled.
- [ ] Focused tests cover domain and integration behavior.
- [ ] Manual acceptance ran on supported Qt platforms.
- [ ] Shared records round-trip with React where applicable.
- [ ] Source-of-truth docs and this audit contain current evidence.

