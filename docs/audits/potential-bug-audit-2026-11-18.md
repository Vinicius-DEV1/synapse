# Potential Bug Audit — 2026-11-18

## Scope

This review prioritized the React/Tauri Firebase synchronization lifecycle, local Tauri access to encrypted media streams, and Qt note-reference editing. It also checked benchmark cleanup and the edited paths for lifecycle cleanup, unsafe origin-prefix checks, malformed sync error handling, and regressions introduced by the fixes.

This was a targeted audit, not a line-by-line review of every client and module. Static repository scans and the checks below provide evidence for the reviewed paths only; they do not prove that the whole project is free of bugs.

## Findings and Resolutions

### SYNC-01 — Timed-out operations could overlap later Firestore work

The timeout wrapper rejected its caller while the underlying pull or push continued. The hook released its local mutex at that point, so a queued signal or edit could start another write while the first operation was still active. A fail-fast `Promise.all` had the same problem when its sibling task continued after the first rejection.

**Resolution:** Sync work now enters a shared serial queue. Timeouts clear their timer when settled, prevent timed-out queued work from starting, and keep the hook mutex held until an already-started operation settles. Full-sync push and PDF work use `Promise.allSettled`, so the lock covers both tasks.

### SYNC-02 — Late or previous-scope syncs could update the wrong UI lifecycle

A pull that completed after unmount could call `loadPages`, and an operation from a previous effect could overlap a new workspace's operation.

**Resolution:** The serialized queue spans effect lifetimes, queued work checks cancellation before it begins, and post-unmount completion handlers suppress UI updates. Late successful pulls refresh pages only while their owning effect remains active.

### SYNC-03 — Local stream CORS and media permission checks trusted origin prefixes

Prefix checks accepted lookalike hosts such as `http://localhost.attacker.example:35174`. The stream server could reflect that origin while serving local content, and the Linux WebKit media permission gate used the same weak check.

**Resolution:** CORS now reflects only exact configured app origins. URL-based permission checks parse the URL and validate the scheme, hostname, port, and absence of URL credentials. Regression tests cover spoofed hosts, unexpected ports, and credential-based URL confusion.

### SYNC-04 — Malformed sync errors could break error reporting

Quota/error handlers assumed that unknown error values had string `message` and `code` properties.

**Resolution:** Error reporting now narrows unknown values at runtime and builds a stable event payload without assuming Firebase-shaped errors.

### SYNC-05 — Initial sync re-uploaded the full local dataset and tripped its own burn guard

The observed account contained about 5,000 scoped documents. The per-minute guard stopped the initial pull at 5,000 reads, and after that threshold was raised the full push still encrypted and resent rows already downloaded from Firestore. A five-minute timeout was not enough to finish that redundant work.

**Resolution:** The initial pull now builds a per-table plan from cloud IDs and timestamps, local-only rows, local-newer conflicts, tombstones, and CRDT merges. It refreshes each local table at pull completion to include edits made during the pull. The initial push fetches only planned IDs and records successful checkpoints even for tables with no local delta. The guard now allows 10,000 reads and 8,000 writes per minute before stopping runaway work; full-push timeout is 300 seconds. Failed table writes keep their checkpoints open for retry.

### SYNC-06 — Cloud timestamp objects and tombstones were not consistently ordered

Timestamp comparison accepted only strings and numbers, while Firestore can return Timestamp objects. Several pull paths also preferred `updatedAt` over a newer `deletedAt`, and local conflict resolution ignored a newer local tombstone when `updated_at` was older.

**Resolution:** Shared timestamp helpers now read Firestore `seconds`, compare the newest update/create/deletion timestamp, and use that value consistently in pull filtering, conflict handling, and the initial push plan. Regression coverage confirms a newer local tombstone is preserved.

### QT-01 — Description write failures were reported as successful page saves

The note preview saved title/content, then ignored the boolean returned by `updatePageDescription` and swallowed thrown errors. It exited edit mode and displayed “Saved” even when the description was not persisted.

**Resolution:** Description persistence is now required and checked. On failure, the UI refreshes the current page version, keeps the user's edits available for retry, reports that only the other fields were saved, and refreshes the parent list. Malformed page-reference links and unsupported benchmark observers now log contextual warnings instead of disappearing silently.

The preview body now lives in `NotesPageReferencePreviewBody.qml`; the preview orchestration file and both page-reference test files remain below 300 lines. This extraction preserves the existing controls, bindings, and layout.

### BENCH-01 — Heap benchmark could mistake uncollected garbage for retained memory

The benchmark measured its final heap without enabling or requiring forced garbage collection, and it silently swallowed collection errors. Its initial 17.7 MB delta was therefore not reliable evidence of a leak.

**Resolution:** The benchmark command now enables Node.js GC explicitly, collection errors are no longer swallowed, and the output records whether forced GC was available. The rerun reported 15.91 KB after 50 synthetic allocation/release cycles. This remains a harness measurement, not proof that the application has no memory leaks.

## Changed Areas

- `apps/web-react/src/hooks/useSync.ts`
- `apps/web-react/src/hooks/sync/`
- `apps/web-react/src/services/sync/sync-monitor.ts`
- `apps/web-react/src/services/sync/sync-pull.ts`
- `apps/web-react/src/services/sync/sync-pull-documents.ts`
- `apps/web-react/src/services/sync/sync-pull-merge.ts`
- `apps/web-react/src/services/sync/sync-push.ts`
- `apps/web-react/src/services/sync/sync-push-plan.ts`
- `apps/web-react/src/services/sync/sync-utils.ts`
- `apps/web-react/src/services/sync/sync-operation-queue.ts`
- `apps/web-react/src/hooks/useSync.test.ts`
- `apps/web-react/src/hooks/useSync.concurrency.test.ts`
- `apps/web-react/scripts/benchmark.mjs`
- `apps/web-react/scripts/benchmark-scroll.mjs`
- `apps/web-react/package.json` (benchmark command)
- `apps/desktop-qt/qml/notes/NotesPageReferencePreview.qml`
- `apps/desktop-qt/qml/notes/NotesPageReferencePreviewBody.qml`
- `apps/desktop-qt/tests/notes/native_notes_page_reference_qml_test.cpp`
- `apps/desktop-qt/tests/notes/native_notes_page_reference_slash_qml_test.cpp`
- `apps/desktop-qt/tests/notes/native_rich_qml_test.cpp`
- `apps/desktop-qt/CMakeLists.txt`
- `apps/web-react/src-tauri/src/protocol_encrypted_utils.rs`
- `apps/web-react/src-tauri/src/cmd_stream.rs`
- `apps/web-react/src-tauri/src/cmd_stream_tests.rs`
- `apps/web-react/src-tauri/src/lib.rs`

The sync hook was decomposed into operation-queue, timeout-lifecycle, error, status, and event-binding modules. Its production file is now below the repository's 300-line target. Concurrency tests are separate from the existing hook behavior tests.

## Verification Checklist

- [x] Re-run the sync hook behavior and concurrency tests.
- [x] Run targeted Rust unit tests for encrypted protocol origins and stream CORS.
- [x] Check formatting for the new Rust test module and edited protocol utility.
- [x] Run `git diff --check`.
- [x] Confirm the TypeScript typecheck after the cleanup edit.
- [x] Verify initial push planning, empty-table checkpoints, Firestore Timestamp parsing, and local tombstone conflict behavior.
- [x] Run Web, Tauri Debian package, performance budget, and benchmark gates.
- [x] Complete one fresh authenticated React Web pull from the deployed Hosting bundle without tripping the emergency stop.
- [x] Build and run the targeted Qt notes QML test suite.
- [x] Scan reviewed frontend, Qt, core, bridge, and Android paths for empty catch blocks.
- [x] Review the final diff and prepare atomic commit scopes for sync, Tauri origins, Qt note saves, benchmark reliability, and audit documentation.

## Verification Evidence

From `apps/web-react/`:

```sh
npm run test -- src/hooks/useSync.test.ts src/hooks/useSync.concurrency.test.ts
npm run typecheck
npx eslint src/hooks/useSync.ts src/hooks/useSync.test.ts src/hooks/useSync.concurrency.test.ts src/hooks/sync/sync-error-utils.ts src/hooks/sync/sync-event-bindings.ts src/hooks/sync/sync-status.ts src/hooks/sync/sync-timeout-lifecycle.ts src/services/sync/sync-operation-queue.ts scripts/benchmark.mjs
npx eslint scripts/benchmark-scroll.mjs
npm run build
npm run build:web
npm run tauri -- build --bundles deb
npm run check:budgets
npm run benchmark
```

From the repository root:

```sh
cargo test --manifest-path apps/web-react/src-tauri/Cargo.toml --lib protocol_encrypted_utils::tests
cargo test --manifest-path apps/web-react/src-tauri/Cargo.toml --lib cmd_stream::tests
rustfmt --edition 2021 --config skip_children=true --check apps/web-react/src-tauri/src/cmd_stream_tests.rs apps/web-react/src-tauri/src/protocol_encrypted_utils.rs
git diff --check
rg -n -U --pcre2 'catch\s*(?:\([^)]*\))?\s*\{\s*\}' apps/web-react/src apps/web-react/scripts apps/desktop-qt/qml apps/desktop-qt/src apps/desktop-qt/tests core bridges apps/mobile-android
cmake --build apps/desktop-qt/build --target synapse-notes-rich-qml-tests -j2
QT_QPA_PLATFORM=offscreen ctest --test-dir apps/desktop-qt/build -R '^native-notes-rich-qml$' --output-on-failure
```

The focused sync run passed 77 tests across 11 files; TypeScript typecheck and targeted ESLint passed. Web, Tauri frontend, and the Debian package builds succeeded; the generated package is `target/release/bundle/deb/Caderno_1.0.0_amd64.deb` (amd64, 93,973,040 bytes). The performance budget gate passed all seven budgets. The latest Hosting release completed for all four configured sites. A fresh browser profile signed into the React Web app and completed its pull and full sync: app telemetry recorded 5,030 reads and 5 writes, the app emitted `caderno-sync-complete` and `caderno-sync-success`, and neither a sync error nor the emergency stop was recorded. The temporary browser profile and Auth export were removed afterward. This is one application-flow acceptance run; it is not a second full Firestore parity scan.

Earlier focused results remain valid: the Rust runs passed 6 protocol tests and 2 stream tests; the Qt notes QML suite passed including the description-failure regression; forced-GC benchmark measured 15.91 KB after 50 synthetic cycles; and the empty-catch scan returned no matches in the reviewed source scopes.

Builds still report existing warnings: some JS chunks exceed Vite's generic 500 KB advisory threshold (the largest app chunk remains below the configured budget gate), `onnxruntime-web` contains a direct `eval`, the bundle identifier ends in `.app`, and Tauri reports deprecated `STATIC_VCRUNTIME` configuration. These warnings did not fail the builds and require separate compatibility or dependency review before changing.

## Audit Limits

- No full repository test suite, Qt production build, or Android build was run for this focused bug audit.
- The full Rust crate formatting check is not claimed; unrelated pre-existing formatting differences exist outside the edited Rust utility/test files.
- This report makes no claim that every possible bug in every application client has been found.
- This audit deployed Hosting and completed one authenticated application sync. It did not redeploy Firestore rules, run another full parity scan, or delete source-root documents, archives, rollback snapshots, or legacy shares.
- React Web sign-in and sync are verified. Installed Tauri/WebView acceptance and native Qt/Android account-key migration remain outside this audit's completed scope.
