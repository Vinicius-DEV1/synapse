# UX and Verification

## Localization

Static inventory found 783 qsTr call sites and more than 1,000 candidate literal label/placeholder lines. No maintained Qt Linguist TS/QM catalogs or extraction/update workflow was found outside generated build files. This indicates an incomplete localization pipeline; it is not a runtime translation test.

- [ ] Define supported locales and fallback.
- [ ] Extract QML labels, tooltips, accessible names, errors, notifications, and placeholders.
- [ ] Add catalogs and reproducible extraction/compile commands.
- [ ] Verify date, number, currency, plural, and shortcut formatting.
- [ ] Review translated text expansion and missing-translation fallback.

## Accessibility and keyboard

A static scan found 146 Accessible.name assignments; that does not prove coverage or correct focus behavior.

- [ ] Audit each control’s accessible name, role, state, and value.
- [ ] Verify keyboard-only use of dialogs, popups, menus, tables, media, and editor actions.
- [ ] Check Tab order and focus restoration after dismissing dialogs.
- [ ] Verify Escape/dismiss does not lose edits or navigate unexpectedly.
- [ ] Test focus indication, text scaling, contrast, and screen reader announcements.
- [ ] Add names to icon-only controls and announcements to status/progress.
- [ ] Check global shortcut conflicts while typing or while dialogs are open.
- [ ] Compare React shortcut/help inventory to actual Qt shortcuts.

## Visual and lifecycle acceptance

- [ ] Capture React and Qt screenshots with identical fixture data, theme, locale, window size, and scale factor.
- [ ] Compare hierarchy, geometry, scrolling, wrapping, truncation, empty states, and modal placement.
- [ ] Test minimum window size, resize, DPI changes, maximized and fullscreen states.
- [ ] Verify dialogs and dense layouts do not clip actions.
- [ ] Verify video fullscreen restores sidebar/tab state and window geometry.
- [ ] Record accepted native platform differences.
- [ ] Test loading/success/empty/error/offline/permission-denied/partial-failure states.
- [ ] Verify progress reflects actual work, not timers.
- [ ] Exercise cancellation, double-submit, rapid switching, app shutdown, and cleanup.
- [ ] Verify settings survive restart and all destructive actions are confirmed/recoverable.
- [ ] Test malformed, unknown, encrypted, and React-authored records without destructive normalization.

## Performance and stability

No performance profiling was run. The parity tracker lists startup, memory, scrolling, file import, and media playback as measurements needed before claiming performance parity.

- [ ] Record cold/warm startup time and peak/idle memory for representative datasets.
- [ ] Measure large Notes, Library, Anki, Files, and Video list scrolling and search responsiveness.
- [ ] Measure import/export and media startup/seek behavior for representative file sizes.
- [ ] Inspect main-thread blocking, synchronous I/O, repeated full reloads, and unbounded list rendering.
- [ ] Compare results with React under the same hardware, data, cache, and workload.
- [ ] Define and record acceptable budgets and regressions rather than relying on subjective smoothness.

## Help guides

- [ ] Map each primary React module and editor extension to an in-app Qt guide or explicit shared guide.
- [ ] Ensure help only describes implemented behavior and current shortcuts.
- [ ] Explain provider failures, account/sync limitations, backup/restore, and supported file types.
- [ ] Remove stale instructions for unavailable or simulated capabilities.
- [ ] Localize help with the rest of the UI.

## Audit method and inventory snapshot

The audit inspected module roots, selected Qt QML/controller/bridge/Core paths, selected React references, settings/auth/sync/workspace/sharing/AI/media/calendar/diagram flows, test inventory, file sizes, and current parity/security docs.

Approximate source inventory, excluding generated build files where applicable:

| Item | Count / observation |
| --- | --- |
| Qt QML files | 398 |
| Qt QML feature directories | 22 |
| Qt src files | 136 |
| Qt test source files | 65 |
| Qt test module directories | 19 |
| React component source files | 939 |
| React src files | 1,365 |
| QML files above 300 lines | 38 |
| C++ source/header above 300 lines | 11 |
| Test files above 300 lines | 13 |
| qsTr call sites | 783 |
| Candidate direct label/placeholder literal lines | 1,062+ |
| Accessible.name assignments | 146 |
| Configured CTest suites listed by ctest -N | 3 |

File totals are context only and do not measure parity.

Representative commands used:

- find apps/desktop-qt/qml -type f | wc -l
- find apps/desktop-qt/src -type f | wc -l
- find apps/desktop-qt/tests -type f | wc -l
- find apps/web-react/src/components -type f
- rg -n 'executeSql|executeQuery|synapse_db_|SELECT |UPDATE |INSERT |DELETE ' apps/desktop-qt/src
- rg -n 'Timer|Math.random|mock|generateSampleQuestions|recordingStopped' apps/desktop-qt/qml
- rg -n 'recurrence|reminders' core/synapse-core/src/domain/calendar bridges/bridge-qt/src apps/desktop-qt
- rg -n 'qsTr[(]' apps/desktop-qt/qml
- rg -F -n 'Accessible.name' apps/desktop-qt/qml
- ctest --test-dir apps/desktop-qt/build -N

The CTest command only enumerated suites.

## Not run

- CMake configure/build or clean-machine build.
- Startup, memory, large-list, database-scale, import, or media performance profiling.
- CTest, C++/QML tests, QML lint, or React tests.
- Manual launch, accessibility tooling, screenshot comparison, service requests, account/sync tests, microphone capture, or device/hardware testing.
- Migration tests on disposable databases.
- Packaging/install/upgrade tests on supported operating systems.

No build health, test pass, runtime reliability, or visual parity is claimed.

## Documentation conflicts

- The [prior detailed parity matrix](./native-desktop-parity-matrix-working.md) marks broad rows Complete and claims generic SQL was removed, while current source still has mock flows and generic SQL entry points.
- Its “13 core modules” statement enumerates 14 names.
- Historical build/test outputs may be useful context but must be rerun before reuse.
- [module-structure.md](../../docs/architecture/module-structure.md) is the route inventory and says a route does not prove parity.
- [encryption-coverage.md](../../docs/security/encryption-coverage.md) remains encryption authority.

## Limits

Static inspection can show that a path uses a Timer or that an API omits a field, but cannot prove every alternate path or runtime behavior. Treat all broad claims without current acceptance evidence as Unverified. Translation/accessibility counts are candidate inventories requiring review.

