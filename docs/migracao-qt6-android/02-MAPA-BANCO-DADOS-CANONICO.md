# SQLite Schema and Migration Ownership

**Status:** The schema evolves through application migrations. This document intentionally does not publish a fixed table count, row count, database size, or personal machine path.

## Sources of Truth

- New/default schema: `core/synapse-core/src/db/mod.rs`.
- Shared Rust migrations: `core/synapse-core/src/db/migrations.rs`.
- Tauri-specific migrations: `apps/web-react/src-tauri/src/db_migrations.rs`.
- Qt query and write paths: `apps/desktop-qt/src/controllers/` and `apps/desktop-qt/src/synapse_controller.cpp`.

Inspect these files and the active database's `sqlite_master` when determining the current schema. Do not assume every client applies identical migrations or uses the same database file.

## Data Handling Rules

- Use bound parameters for values and transactions for multi-table migrations.
- Respect each entity's soft-delete semantics; not every table uses the same columns or lifecycle.
- Do not hardcode a user-specific SQLite location or reuse a personal database in a guide.
- Before changing a schema, trace React, Tauri, Qt, Android, backup, and sync consumers.
- Encryption coverage is not equivalent to a table having a module key. See the [native encryption audit](../security/native-encryption-audit.md) for plaintext fields and asset migration scope.

For application-owned database paths and build configuration, see [the repository layout guide](../architecture/repository-layout.md) and [setup guide](../guides/setup-and-build.md).
