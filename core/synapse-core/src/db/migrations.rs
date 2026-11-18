mod columns;
mod indexes;
mod quiz;

use rusqlite::Connection;

pub use quiz::migrate_quiz_schema;

#[cfg(test)]
mod tests;

// Released migration numbers are explicit in `apply_versioned_migration`; append, never renumber.
const CURRENT_SCHEMA_VERSION: i64 = 1;

/// Applies all pending schema changes atomically and records the applied version.
pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    let transaction = conn
        .unchecked_transaction()
        .map_err(|error| format!("Failed to start SQLite schema migration: {error}"))?;

    transaction
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS vault_asset_migrations (
                id TEXT PRIMARY KEY,
                target_path TEXT NOT NULL,
                staged_path TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
        )
        .map_err(|error| format!("Failed to create migration metadata tables: {error}"))?;

    let current_version: i64 = transaction
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .map_err(|error| format!("Failed to read SQLite schema version: {error}"))?;

    if current_version < 0 {
        return Err(format!("Database has invalid SQLite schema version {current_version}."));
    }
    if current_version > CURRENT_SCHEMA_VERSION {
        return Err(format!(
            "Database schema version {current_version} is newer than supported version {CURRENT_SCHEMA_VERSION}."
        ));
    }

    for version in (current_version + 1)..=CURRENT_SCHEMA_VERSION {
        apply_versioned_migration(&transaction, version)?;
        transaction
            .execute(
                "INSERT INTO schema_migrations (version) VALUES (?1)",
                [version],
            )
            .map_err(|error| format!("Failed to record SQLite schema version {version}: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Failed to commit SQLite schema migration: {error}"))
}

fn apply_versioned_migration(conn: &Connection, version: i64) -> Result<(), String> {
    match version {
        1 => apply_initial_schema(conn),
        _ => Err(format!("SQLite schema migration {version} is not registered.")),
    }
}

fn apply_initial_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(super::schema::TABLES_SQL)
        .map_err(|error| format!("Failed to create canonical SQLite tables: {error}"))?;
    columns::apply(conn)?;
    quiz::migrate_quiz_schema(conn)?;
    seed_finance_account(conn)?;
    conn.execute_batch(indexes::INDEXES_SQL)
        .map_err(|error| format!("Failed to create SQLite indexes: {error}"))?;
    Ok(())
}

fn seed_finance_account(conn: &Connection) -> Result<(), String> {
    let active_accounts: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM finance_accounts WHERE deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|error| format!("Failed to check finance accounts during migration: {error}"))?;

    if active_accounts == 0 {
        conn.execute(
            "INSERT INTO finance_accounts (id, name, color, icon, initial_balance)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            (
                "default-wallet",
                "Carteira Principal",
                "#10b981",
                "wallet",
                0.0_f64,
            ),
        )
        .map_err(|error| format!("Failed to seed the default finance account: {error}"))?;
    }

    conn.execute(
        "UPDATE transactions SET account_id = ?1 WHERE account_id IS NULL",
        ["default-wallet"],
    )
    .map_err(|error| format!("Failed to link legacy transactions to a finance account: {error}"))?;
    Ok(())
}

pub(super) fn add_column_if_missing(
    conn: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<bool, String> {
    let mut statement = conn
        .prepare("SELECT name FROM pragma_table_info(?1)")
        .map_err(|error| format!("Failed to inspect SQLite table {table}: {error}"))?;
    let columns = statement
        .query_map([table], |row| row.get::<_, String>(0))
        .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())
        .map_err(|error| format!("Failed to read columns for SQLite table {table}: {error}"))?;

    if columns.iter().any(|name| name == column) {
        return Ok(false);
    }

    let table_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
            [table],
            |row| row.get(0),
        )
        .map_err(|error| format!("Failed to verify SQLite table {table}: {error}"))?;
    if !table_exists {
        return Err(format!(
            "Cannot add {table}.{column}: the table does not exist."
        ));
    }

    let sql = format!(
        "ALTER TABLE {} ADD COLUMN {} {definition}",
        quote_identifier(table),
        quote_identifier(column)
    );
    conn.execute(&sql, [])
        .map_err(|error| format!("Failed to add SQLite column {table}.{column}: {error}"))?;
    Ok(true)
}

fn quote_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('\"', "\"\""))
}
