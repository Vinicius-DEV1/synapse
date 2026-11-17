---
name: firebase-sync-integrity
description: Audit and reconcile Synapse local SQLite or IndexedDB rows with encrypted Firebase sync data, including account scoping, conflict handling, and safe legacy cleanup.
---

# Firebase Sync Integrity

Use this skill for a Firebase sync audit, account-scoped migration, full data
comparison, or cleanup of old Firestore collections. Read the current audit at
[`docs/audits/firebase-sync-integrity-2026-11-17/`](../../../docs/audits/firebase-sync-integrity-2026-11-17/)
and verify every recorded state against the live code and Firebase project.

## Required Checks

1. Identify the active local database from application configuration; do not
   assume the newest file or a build output is canonical. Check SQLite integrity,
   foreign keys, schema inventory, and migration status before using its rows.
2. Compare the Web table allowlist, Firestore rules, native allowlists, and active
   local schema. Treat an ID match as inventory evidence only; it does not prove
   payload equality or ownership.
3. For encrypted content, verify the intended account key envelope and password
   validator before decrypting. Keep credentials out of command arguments, logs,
   scripts committed to the repository, and generated reports.
4. Compare decrypted payload fields as well as IDs and timestamps. Distinguish
   absent nullable fields from absent non-null values, and detect conflicting
   values, tombstones, schema defaults, and large payloads.
5. Use the application's current conflict resolver for timestamps, tombstones,
   page history, and Yjs page state. Do not replace it with a blanket local-wins
   or cloud-wins rule. Check `sync-pull-merge.ts`, `sync-pull-documents.ts`, and
   `sync-payload.ts` before writing a migration adapter.
6. Read the current chunk format and limits from
   `apps/web-react/src/services/sync/sync-chunked-payload.ts`. Validate chunk
   count, order, authenticated context, and complete reassembly before accepting
   a payload. Keep chunk access under the same user/workspace rules as its parent.

## Before Any Cloud Write

- Establish the intended account or workspace from the user or authenticated
  application state. A single observed account is not, by itself, proof that
  every unscoped record belongs to it.
- Create and verify a restricted backup of source documents and a recoverable
  local database snapshot. Store sensitive backups outside the repository with
  owner-only permissions; record counts and cryptographic hashes, not plaintext.
- Re-run read-only inventory immediately before mutation. Verify the backup still
  matches the source and that destination IDs are either absent or already equal
  to the intended result.
- Require explicit user authorization before production writes. Use create-only
  preconditions for new IDs and update-time preconditions for existing rows.
  Write encrypted chunks first and the parent pointer last. Never delete source
  roots or orphan chunks as part of ordinary reconciliation.
- Make retries idempotent. On a partial run, accept only source-equivalent or
  already-resolved destinations; stop on any third state. Preserve any partial
  ciphertext fragments for later review rather than deleting them speculatively.

## Verification and Cleanup

- Verify every destination by reading it back, decrypting with the expected key,
  reconstructing chunks where present, and comparing canonical payloads and
  relevant metadata. Recheck root-source hashes and local database integrity.
- Verify authorization with the Firestore Emulator and perform only safe,
  scoped production checks. Anonymous root reads must remain denied.
- Keep local-only, source-only, conflicting, undecryptable, and unclassified
  records itemized in the audit artifact. Do not mark reconciliation complete
  while any payload, history, tombstone, or storage adapter remains unverified.
- Put legacy roots, stale database copies, obsolete migration code, old share
  documents, and orphan chunk generations in a Markdown cleanup inventory with
  evidence and a separate removal gate. Delete only after parity, restore, and
  explicit cleanup authorization are recorded.
- Record the exact commands, code commit, deployed rules/client version, row
  counts, decrypt totals, and remaining gates in English project documentation.
  Keep sensitive IDs, local machine paths, tokens, keys, and plaintext out of it.

## Focused Verification

Prefer focused sync tests, `npm run typecheck`, and the Firestore Emulator rules
suite. Use `npm run build:web` before web deployment. Avoid global test sweeps
unless the user requests them or a release gate requires them. Keep code changes
in atomic commits and document any production mutation separately from code
changes.
