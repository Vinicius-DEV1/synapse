#!/usr/bin/env python3
"""Apply the current SQLite migration to a temporary backup and verify existing data."""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
from typing import Any


def quote_identifier(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def value_digest(value: Any) -> bytes:
    digest = hashlib.sha256()
    if value is None:
        digest.update(b"N")
    elif isinstance(value, bytes):
        digest.update(b"B")
        digest.update(len(value).to_bytes(8, "big"))
        digest.update(value)
    elif isinstance(value, str):
        encoded = value.encode("utf-8")
        digest.update(b"S")
        digest.update(len(encoded).to_bytes(8, "big"))
        digest.update(encoded)
    elif isinstance(value, int):
        digest.update(b"I" + str(value).encode())
    elif isinstance(value, float):
        digest.update(b"F" + value.hex().encode())
    else:
        raise TypeError(f"Unsupported SQLite value type: {type(value).__name__}")
    return digest.digest()


def table_names(connection: sqlite3.Connection) -> list[str]:
    return [
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
    ]


def table_columns(
    connection: sqlite3.Connection, table: str
) -> tuple[list[str], list[str]]:
    info = list(connection.execute(f"PRAGMA table_info({quote_identifier(table)})"))
    columns = [row[1] for row in info]
    primary_key = [row[1] for row in sorted((row for row in info if row[5]), key=lambda row: row[5])]
    return columns, primary_key


def capture_tables(
    connection: sqlite3.Connection, tables: list[str]
) -> dict[str, tuple[list[str], list[str], dict[tuple[Any, ...], tuple[bytes, ...]], Counter, int]]:
    captured = {}
    for table in tables:
        columns, primary_key = table_columns(connection, table)
        select_columns = ", ".join(quote_identifier(column) for column in columns)
        order_columns = primary_key or ["rowid"]
        order_by = ", ".join(quote_identifier(column) for column in order_columns)
        sql = (
            f"SELECT {select_columns} FROM {quote_identifier(table)} ORDER BY {order_by}"
        )
        keyed_rows: dict[tuple[Any, ...], tuple[bytes, ...]] = {}
        unkeyed_rows: Counter = Counter()
        count = 0
        key_indexes = [columns.index(column) for column in primary_key]
        for row in connection.execute(sql):
            count += 1
            digests = tuple(value_digest(value) for value in row)
            if primary_key:
                key = tuple(row[index] for index in key_indexes)
                keyed_rows[key] = digests
            else:
                unkeyed_rows[digests] += 1
        captured[table] = (columns, primary_key, keyed_rows, unkeyed_rows, count)
    return captured


def transaction_accounts(connection: sqlite3.Connection) -> dict[Any, Any] | None:
    if "transactions" not in table_names(connection):
        return None
    columns, _ = table_columns(connection, "transactions")
    if "id" not in columns or "account_id" not in columns:
        return None
    return dict(connection.execute("SELECT id, account_id FROM transactions"))


def verify_transaction_account_changes(
    before: dict[Any, Any] | None, after: dict[Any, Any] | None
) -> int:
    if before is None:
        return 0
    if after is None:
        raise AssertionError("The migration removed existing transaction columns.")
    changes = 0
    for transaction_id, old_account in before.items():
        if transaction_id not in after:
            raise AssertionError("A pre-existing transaction ID is missing after migration.")
        new_account = after[transaction_id]
        if old_account == new_account:
            continue
        if old_account is None and new_account == "default-wallet":
            changes += 1
            continue
        raise AssertionError("An unexpected transactions.account_id value changed.")
    return changes


def run_migration(repo: Path, database_copy: Path, temporary_directory: Path) -> str:
    core_path = repo / "core/synapse-core"
    cargo_target = repo / "core/synapse-core/target"
    manifest = temporary_directory / "Cargo.toml"
    manifest.write_text(
        "[package]\nname=\"migration_check\"\nversion=\"0.1.0\"\nedition=\"2021\"\n"
        "[dependencies]\nsynapse-core={path="
        + json.dumps(str(core_path))
        + "}\nrusqlite={version=\"0.31\",features=[\"bundled\"]}\n",
        encoding="utf-8",
    )
    source = temporary_directory / "src"
    source.mkdir()
    (source / "main.rs").write_text(
        """use rusqlite::Connection;
use std::env;
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = env::args().nth(1).ok_or("missing isolated database path")?;
    let conn = Connection::open(path)?;
    synapse_core::db::initialize_connection(&conn).map_err(std::io::Error::other)?;
    let quick: String = conn.query_row("PRAGMA quick_check", [], |row| row.get(0))?;
    let foreign_keys: i64 = conn.query_row(
        "SELECT COUNT(*) FROM pragma_foreign_key_check", [], |row| row.get(0)
    )?;
    let tables: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        [], |row| row.get(0)
    )?;
    println!("migration=ok quick_check={quick} foreign_key_violations={foreign_keys} tables={tables}");
    if quick != "ok" || foreign_keys != 0 {
        return Err("integrity validation failed".into());
    }
    Ok(())
}
""",
        encoding="utf-8",
    )
    environment = dict(os.environ)
    environment["CARGO_TARGET_DIR"] = str(cargo_target)
    result = subprocess.run(
        ["cargo", "run", "--quiet", "--manifest-path", str(manifest), "--", str(database_copy)],
        cwd=temporary_directory,
        env=environment,
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    if result.returncode:
        raise RuntimeError(f"Isolated Rust migration failed:\n{result.stderr[-4000:]}")
    return result.stdout.strip()


def verify_copy(
    database_copy: Path,
    before_tables: list[str],
    before_snapshot: dict,
    before_accounts: dict[Any, Any] | None,
    active_accounts: int | None,
    old_account_ids: set[Any],
) -> tuple[int, int, bool, list[str]]:
    after = sqlite3.connect(database_copy)
    after_tables = table_names(after)
    missing_tables = sorted(set(before_tables) - set(after_tables))
    if missing_tables:
        raise AssertionError(f"Existing tables disappeared: {missing_tables}")
    after_snapshot = capture_tables(after, before_tables)
    account_changes = verify_transaction_account_changes(
        before_accounts, transaction_accounts(after)
    )

    seeded_default_account = False
    if "finance_accounts" in before_tables:
        new_ids = {row[0] for row in after.execute("SELECT id FROM finance_accounts")}
        seeded_default_account = (
            active_accounts == 0 and "default-wallet" not in old_account_ids
        )
        expected_extra = {"default-wallet"} if seeded_default_account else set()
        if new_ids - old_account_ids != expected_extra:
            raise AssertionError("Unexpected finance account IDs were added during migration.")

    preserved_rows = 0
    for table, old in before_snapshot.items():
        old_columns, old_primary, old_keyed, old_unkeyed, old_count = old
        new_columns, new_primary, new_keyed, new_unkeyed, new_count = after_snapshot[table]
        if old_columns != new_columns[: len(old_columns)]:
            raise AssertionError(f"Existing column order changed for {table}.")
        if old_primary != new_primary:
            raise AssertionError(f"Existing primary key changed for {table}.")
        if old_primary:
            missing = set(old_keyed) - set(new_keyed)
            if missing:
                raise AssertionError(f"Existing rows disappeared from {table}: {len(missing)}")
            extra = set(new_keyed) - set(old_keyed)
            if table == "finance_accounts":
                extra_ids = {key[0] for key in extra}
                allowed = {"default-wallet"} if seeded_default_account else set()
                if extra_ids != allowed:
                    raise AssertionError("Unexpected finance account records were added.")
            elif extra:
                raise AssertionError(f"Unexpected records were added to {table}: {len(extra)}")
            for key, old_hashes in old_keyed.items():
                new_hashes = new_keyed[key]
                if len(old_hashes) != len(new_hashes):
                    raise AssertionError(f"Existing column count changed for {table}.")
                for index, (old_hash, new_hash) in enumerate(zip(old_hashes, new_hashes)):
                    if old_hash == new_hash:
                        continue
                    if table == "transactions" and old_columns[index] == "account_id":
                        continue
                    raise AssertionError(
                        f"Unexpected existing value changed in {table}.{old_columns[index]}."
                    )
            preserved_rows += old_count
        else:
            if old_unkeyed != new_unkeyed:
                raise AssertionError(f"Rows changed in unkeyed table {table}.")
            preserved_rows += old_count
        if new_count < old_count:
            raise AssertionError(f"Row count decreased in {table}.")

    added_tables = sorted(set(after_tables) - set(before_tables))
    after.close()
    return preserved_rows, account_changes, seeded_default_account, added_tables


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True, type=Path, help="SQLite database to back up and verify")
    args = parser.parse_args()
    source = args.database.expanduser().resolve(strict=True)
    if not source.is_file():
        raise SystemExit("The source database path must be a regular file.")
    repo = Path(__file__).resolve().parents[3]

    with tempfile.TemporaryDirectory(prefix="synapse-migration-audit-") as temporary:
        temporary_directory = Path(temporary)
        database_copy = temporary_directory / "database-copy.sqlite"
        source_connection = sqlite3.connect(f"{source.as_uri()}?mode=ro", uri=True, timeout=30)
        source_connection.execute("PRAGMA query_only=ON")
        backup = sqlite3.connect(database_copy)
        source_connection.backup(backup)
        source_connection.close()

        before_tables = table_names(backup)
        before_snapshot = capture_tables(backup, before_tables)
        before_accounts = transaction_accounts(backup)
        active_accounts = None
        if "finance_accounts" in before_tables:
            active_accounts = backup.execute(
                "SELECT COUNT(*) FROM finance_accounts WHERE deleted_at IS NULL"
            ).fetchone()[0]
        old_account_ids = set()
        if "finance_accounts" in before_tables:
            old_account_ids = {row[0] for row in backup.execute("SELECT id FROM finance_accounts")}
        print(run_migration(repo, database_copy, temporary_directory))
        preserved_rows, account_changes, seeded, new_tables = verify_copy(
            database_copy,
            before_tables,
            before_snapshot,
            before_accounts,
            active_accounts,
            old_account_ids,
        )
        print(
            f"existing_tables_preserved={len(before_tables)} "
            f"existing_rows_preserved={preserved_rows} "
            f"added_tables={','.join(new_tables) or 'none'} "
            f"account_id_defaults={account_changes} seeded_default_account={str(seeded).lower()}"
        )
        backup.close()


if __name__ == "__main__":
    main()
