# Firebase Sync Integrity Audit

**Audit date:** 2026-11-17
**Status:** Local schema repair, account-scoped sync, safer migration, and replacement Firestore rules are prepared in the repository. Firebase reconciliation, production rule deployment, and legacy-share reissue remain open. The replacement rules passed the local Firebase Emulator Suite tests.

## Executive Summary

The audit did not find a basis to claim that every local row is synchronized or that every encrypted field round-trips without loss. ID-only reconciliation found 126 local rows without a matching document in the queried Firestore root collections across 11 tables. It also found 11 root-only document IDs that cannot safely be assigned to this account because these collections are unscoped.

The live Firestore rules permitted anonymous aggregate reads during the audit. The repository rules contained a catch-all rule granting public read and write access; the local rules now remove that grant and scope user/workspace access. No document payloads were downloaded, no remote data was changed, and the replacement rules were not deployed.

The audit also found that earlier direct-share documents stored the raw share key in public Firestore metadata. New share records use key-protection version 2, with owner keys wrapped by the master key and visitor keys protected by a password or sent in the URL fragment. Legacy shares need to be recreated after the new rules are deployed.

The active local SQLite database passed `quick_check` and `foreign_key_check`. Three expected sync tables were missing; they were created using the current migration source after a verified rollback snapshot was created outside the repository. A pre/post fingerprint comparison found no changes to existing rows or columns.

## Audit Artifacts

- [Findings and evidence](./findings.md)
- [Resolution checklist](./resolution-checklist.md)
- [Legacy cleanup inventory](./legacy-cleanup-inventory.md)

## Scope and Method

- Inspected the active Tauri SQLite database selected by the app's configured identifier. A separate older database copy was not treated as active.
- Checked database integrity, foreign-key consistency, table presence, key synced columns, and preservation of all pre-existing columns and row values across the migration.
- Queried aggregate document counts for the 50 client-side sync collections and checked whether local row IDs had matching root documents. The checks did not fetch `encryptedData` or decrypted row content.
- Excluded `config` from ID matching because some local IDs contain `/`, which cannot be used as a Firestore document ID. The sync source now encodes invalid document IDs for new writes.
- Read the repository Firestore rules and verified that unauthenticated aggregate reads against live root collections succeeded. No write probe was made.
- Reviewed the Web sync path, Tauri sync commands, local migration source, legacy migration code, and sync tests.
- Replaced flat-root client sync with authenticated per-user or role-checked workspace paths and scoped local checkpoints.
- Replaced the root-copy migrator with a local database to authenticated workspace migration; old root documents remain unassigned.
- Reviewed the local rules for workspace self-enrollment, user profile privacy, public shares, access requests, logs, and trusted devices.
- Compared all 50 client sync table names across the web allowlist, Firestore rules, Rust allowlist, IndexedDB schema, and active SQLite schema. The table names exist in each current source; optional timestamp-column differences are handled explicitly by the sync mapper.

## Verification Evidence

- Active database before migration: 52 tables; `quick_check=ok`; zero foreign-key violations.
- Active database after migration: 55 tables; `quick_check=ok`; zero foreign-key violations.
- New empty tables: `shared_page_keys`, `culture_disliked_items`, `culture_ignored_items`.
- Pre-existing row and column values matched the rollback snapshot after migration.
- Targeted Web sync and migration tests passed during the follow-up fix pass; final post-edit totals are recorded in the current verification section of [findings](./findings.md).
- Rust sync-command tests passed with `cargo test --manifest-path Cargo.toml cmd_sync::tests -- --nocapture` from `apps/web-react/src-tauri/`.
- `npm run typecheck` passed with no errors.
- Firebase Emulator Suite rules tests passed locally for anonymous isolation, cross-user query/read/write/delete denial, workspace roles, invitation acceptance, and versioned public shares.

## Limits

Firestore rows are encrypted. This audit did not unlock the app's master key or compare decrypted field values, so matching document IDs do not prove content equality. Workspace subcollections were not enumerated because an authenticated membership list was unavailable. Root collections also lack account ownership boundaries, so root-only documents may belong to another user. The follow-up code now refuses to read those roots; it does not recover 11 root-only IDs or prove ownership for the 126 missing local IDs. Emulator tests validate local rules behavior only. Rules have not been deployed, and production data has not been repaired.

The code changes in this repository are not deployed to Firebase or to another app installation. Existing per-table checkpoints may already have advanced past failed rows; a safe backfill needs to follow account/workspace scoping and ownership filtering.
