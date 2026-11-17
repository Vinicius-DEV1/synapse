# Firebase Sync Integrity Audit

**Audit date:** 2026-11-17
**Status:** The scoped web client, replacement Firestore rules, and Auth providers were deployed to the configured Firebase project on 2026-11-17. Anonymous reads from the old root collections now return `403 PERMISSION_DENIED`. Data reconciliation remains open: Firebase Auth currently has zero users, so the main account has no UID to scope legacy data to. Legacy-share reissue also remains open.

## Executive Summary

The audit did not find a basis to claim that every local row is synchronized or that every encrypted field round-trips without loss. ID-only reconciliation found 126 local rows without a matching document in the queried Firestore root collections across 11 tables. It also found 11 root-only document IDs. The user confirmed that this project has one account and authorized linking the legacy records to it; Firebase Auth has no account yet, so a UID is still needed before the copy can be made.

The old live Firestore rules permitted anonymous aggregate reads. The new scoped rules are deployed; a live anonymous read now returns `403 PERMISSION_DENIED`. The previous production ruleset was retained in Firebase and its source snapshot was saved outside the repository for rollback. No Firestore documents were changed.

The audit also found that earlier direct-share documents stored the raw share key in public Firestore metadata. New share records use key-protection version 2, with owner keys wrapped by the master key and visitor keys protected by a password or sent in the URL fragment. Existing version 1 shares are blocked by the new rules and need to be recreated.

Firebase Authentication now enables the email/password and anonymous providers. The four Hosting sites configured in `firebase.json` serve the built client, and the production Auth config allows those site domains. No Auth account was created during deployment.

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
- After deployment, verified that the active Firestore ruleset matches the repository source and an anonymous read of `page_history` returns `403 PERMISSION_DENIED`.
- Confirmed the active Auth config enables email/password and anonymous sign-in, and that the configured Hosting domains are authorized. Firebase Auth returned zero users.
- Published `dist-web` to the four Hosting sites configured in `firebase.json` and verified each site serves the exact built `index.html` and `share-viewer.html`.
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
- `npm run build:web` passed. Vite reported existing large-chunk warnings and a direct `eval` warning in `onnxruntime-web`.
- Production deployment: active Firestore ruleset `8ec4f826-21af-42cc-a67b-5d139c9aebe5`; previous ruleset `4dbee571-c0f9-4add-9f32-f6a1faa53e6f` remains available for rollback. Hosting URLs: `https://synapse-dev.web.app`, `https://synapsedev.web.app`, `https://synapse-web.web.app`, and `https://fourth-cirrus-468923-h7.web.app`.

## Limits

Firestore rows are encrypted. This audit did not unlock the app's master key or compare decrypted field values, so matching document IDs do not prove content equality. Workspace subcollections were not enumerated because no signed-in Firebase user exists. The user has explicitly confirmed sole ownership of the legacy project data, but no account UID is available yet. The new rules block anonymous root access; no root documents were copied, deleted, or decrypted.

The updated web client and Firebase configuration are deployed to the configured Hosting sites. Other Firebase Hosting sites not listed in `firebase.json` were not changed. Existing per-table checkpoints may already have advanced past failed rows; complete reconciliation still requires the main Firebase Auth account to be created or signed in, the local vault to be unlocked, and a reviewed copy of legacy root documents into that UID's scoped path. Installed desktop/native binaries were not rebuilt by the Hosting deployment.
