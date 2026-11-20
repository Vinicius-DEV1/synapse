# Potential Bug Audit — 2026-11-19

## Scope

This second-pass review focused on React/Firestore synchronization of collaborative pages: timestamp equality, edits made while a pull is in progress, Yjs merge behavior, and propagation of merged states. It supplements the targeted findings in the [2026-11-18 audit](./potential-bug-audit-2026-11-18.md); it is not a line-by-line review of every application or module.

## Finding and Resolution

### SYNC-07 — Equal-time or in-flight page edits could bypass Yjs convergence

- **Severity:** High
- **Category:** Data integrity, concurrency, sync checkpoints
- **Locations:** `apps/web-react/src/services/sync/sync-pull.ts`, `apps/web-react/src/services/sync/sync-pull-merge.ts`
- **Root cause:** The pull filter dropped page documents whose local and cloud timestamps matched before decrypting them, even though SQLite's `CURRENT_TIMESTAMP` has second-level precision. The merge routine also used the local row captured before decryption instead of the fresh row read immediately before upsert. When it did produce a merged CRDT state, the local-newer race guard could discard it; equal source timestamps also left the manifest unchanged, so another device could miss the merged state after the short query overlap expired.
- **Resolution:** Queried page documents now enter Yjs merge even when their timestamps match. Merge preparation uses the fresh local row, preserves the union when a local edit is newer, and advances `updated_at` beyond the local and cloud timestamps whenever the CRDT state differs from cloud. This makes the merged page eligible for push and causes the sync manifest to advertise the new revision.
- **Parity:** Changes are internal to the existing sync flow; they do not change UI or navigation behavior. Non-page conflict handling is unchanged.

## Verification Checklist

- [x] Regression test verifies equal-timestamp local and cloud page states are merged.
- [x] Regression tests verify the fresh local Yjs state survives a pull race and the merged revision advances `updated_at`.
- [x] Run the complete sync-service test directory.
- [x] Run TypeScript typecheck and targeted ESLint.
- [x] Run `git diff --check`.
- [x] Rebuild the Web target after this fix.
- [x] Rebuild the Tauri Debian package after this fix.

## Evidence

- `npm run test -- src/services/sync` — 79 tests passed across 14 files.
- `npm run typecheck` — passed.
- `npx eslint src/services/sync/sync-pull.ts src/services/sync/sync-pull.test.ts src/services/sync/sync-pull-merge.ts src/services/sync/sync-pull-merge.test.ts` — passed.
- `git diff --check` — passed.
- `npm run build:web` — passed; Vite emitted advisory chunk-size and dependency `eval` warnings.
- `npm run tauri -- build --bundles deb` — passed; the generated package is `target/release/bundle/deb/Caderno_1.0.0_amd64.deb` (amd64, 93,973,234 bytes; SHA-256 `3348a5dfc6f68fd62e30454f41c253c0343253b5cdb3b9647191256825b279e8`). The build emitted the previously known bundle-identifier and deprecated `STATIC_VCRUNTIME` warnings, plus existing dependency transform warnings.

## Remaining Risk and Limits

- The current timestamp-based last-write-wins policy cannot distinguish different edits to a non-page record that have identical timestamps. This audit did not add a version field, conflict archive, or schema migration for those tables; they need a separate compatibility design before claiming collision-free sync for all entities.
- This review covers the React sync path only. It does not certify installed Tauri/WebView behavior, native Qt/Android sync, or every repository module.
- Production Firestore data was not scanned or modified for this fix. The earlier scoped reconciliation evidence remains in the [Firebase integrity audit](./firebase-sync-integrity-2026-11-17/README.md).
