use rusqlite::{Connection, OpenFlags};
use std::ops::Deref;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Condvar, Mutex, MutexGuard};

const DEFAULT_READ_POOL_SIZE: usize = 4;

struct DbInner {
    writer: Mutex<Option<Connection>>,
    readers: Mutex<Vec<Connection>>,
    readers_available: Condvar,
    closed: AtomicBool,
    keys: Mutex<Option<crate::cmd_auth::UnlockedKeys>>,
}

/// Shared database state managing a dedicated WAL writer connection,
/// a pool of read-only WAL connections for concurrent reads, and unlocked module keys.
#[derive(Clone)]
pub struct DbState {
    inner: Arc<DbInner>,
}

/// RAII guard returning a read-only SQLite connection back to the pool on drop.
pub struct ReadConnGuard {
    inner: Arc<DbInner>,
    conn: Option<Connection>,
}

impl ReadConnGuard {
    pub fn conn(&self) -> &Connection {
        self.conn
            .as_ref()
            .expect("ReadConnGuard connection must remain present until Drop")
    }
}

impl Deref for ReadConnGuard {
    type Target = Connection;

    fn deref(&self) -> &Self::Target {
        self.conn()
    }
}

impl Drop for ReadConnGuard {
    fn drop(&mut self) {
        if let Some(conn) = self.conn.take() {
            if self.inner.closed.load(Ordering::Acquire) {
                drop(conn);
                return;
            }
            if let Ok(mut readers) = self.inner.readers.lock() {
                readers.push(conn);
                self.inner.readers_available.notify_one();
            }
        }
    }
}

impl DbState {
    /// Initializes the dedicated writer connection and a pool of read-only WAL connections.
    pub fn open(db_path: PathBuf) -> Result<Self, String> {
        let writer = init_db(&db_path)?;
        let mut readers = Vec::with_capacity(DEFAULT_READ_POOL_SIZE);
        for _ in 0..DEFAULT_READ_POOL_SIZE {
            readers.push(open_read_conn(&db_path)?);
        }

        Ok(Self {
            inner: Arc::new(DbInner {
                writer: Mutex::new(Some(writer)),
                readers: Mutex::new(readers),
                readers_available: Condvar::new(),
                closed: AtomicBool::new(false),
                keys: Mutex::new(None),
            }),
        })
    }

    pub fn lock_conn(&self) -> Result<MutexGuard<'_, Option<Connection>>, String> {
        self.inner
            .writer
            .lock()
            .map_err(|error| format!("Database connection lock poisoned: {error}"))
    }

    pub fn lock_keys(
        &self,
    ) -> Result<MutexGuard<'_, Option<crate::cmd_auth::UnlockedKeys>>, String> {
        self.inner
            .keys
            .lock()
            .map_err(|error| format!("Keys lock poisoned: {error}"))
    }

    pub fn clone_keys(&self) -> Result<Option<crate::cmd_auth::UnlockedKeys>, String> {
        let guard = self.lock_keys()?;
        Ok(guard.clone())
    }

    /// Acquires a read-only SQLite connection from the WAL read pool.
    /// Blocks the current worker thread until a reader is available.
    pub fn acquire_reader(&self) -> Result<ReadConnGuard, String> {
        let mut readers = self
            .inner
            .readers
            .lock()
            .map_err(|error| format!("Database read pool lock poisoned: {error}"))?;

        loop {
            if self.inner.closed.load(Ordering::Acquire) {
                return Err("Banco não inicializado".to_string());
            }
            if let Some(conn) = readers.pop() {
                return Ok(ReadConnGuard {
                    inner: Arc::clone(&self.inner),
                    conn: Some(conn),
                });
            }
            readers = self
                .inner
                .readers_available
                .wait(readers)
                .map_err(|error| format!("Database read pool condvar poisoned: {error}"))?;
        }
    }

    /// Drops all writer and reader connections and clears unlocked keys (used before local wipe).
    pub fn close_all(&self) -> Result<(), String> {
        self.inner.closed.store(true, Ordering::Release);
        {
            let mut writer = self.lock_conn()?;
            *writer = None;
        }
        {
            let mut readers = self
                .inner
                .readers
                .lock()
                .map_err(|error| format!("Database read pool lock poisoned: {error}"))?;
            readers.clear();
            self.inner.readers_available.notify_all();
        }
        {
            let mut keys = self.lock_keys()?;
            *keys = None;
        }
        Ok(())
    }

    /// Executes a read-only closure on a pooled WAL reader inside `tokio::task::spawn_blocking`.
    pub async fn read<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&Connection) -> Result<R, String> + Send + 'static,
        R: Send + 'static,
    {
        let state = self.clone();
        run_blocking(move || {
            let reader = state.acquire_reader()?;
            f(reader.conn())
        })
        .await
    }

    /// Executes a read-only closure with a cloned snapshot of unlocked keys inside `spawn_blocking`.
    pub async fn read_with_keys<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&Connection, Option<crate::cmd_auth::UnlockedKeys>) -> Result<R, String>
            + Send
            + 'static,
        R: Send + 'static,
    {
        let keys = self.clone_keys()?;
        let state = self.clone();
        run_blocking(move || {
            let reader = state.acquire_reader()?;
            f(reader.conn(), keys)
        })
        .await
    }

    /// Executes a write closure on the dedicated SQLite writer connection inside `spawn_blocking`.
    pub async fn write<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&mut Connection) -> Result<R, String> + Send + 'static,
        R: Send + 'static,
    {
        let state = self.clone();
        run_blocking(move || {
            let mut guard = state.lock_conn()?;
            let conn = guard
                .as_mut()
                .ok_or_else(|| "Banco não inicializado".to_string())?;
            f(conn)
        })
        .await
    }

    /// Executes a write closure with a cloned snapshot of unlocked keys inside `spawn_blocking`.
    pub async fn write_with_keys<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&mut Connection, Option<crate::cmd_auth::UnlockedKeys>) -> Result<R, String>
            + Send
            + 'static,
        R: Send + 'static,
    {
        let keys = self.clone_keys()?;
        let state = self.clone();
        run_blocking(move || {
            let mut guard = state.lock_conn()?;
            let conn = guard
                .as_mut()
                .ok_or_else(|| "Banco não inicializado".to_string())?;
            f(conn, keys)
        })
        .await
    }
}

/// Runs a blocking CPU/FS/SQLite closure on Tokio's blocking thread pool.
pub async fn run_blocking<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce() -> Result<R, String> + Send + 'static,
    R: Send + 'static,
{
    tokio::task::spawn_blocking(f)
        .await
        .map_err(|error| format!("Blocking task join error: {error}"))?
}

pub fn init_db(db_path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(db_path)
        .map_err(|error| format!("Failed to open SQLite database: {error}"))?;
    synapse_core::db::initialize_connection(&conn)?;
    Ok(conn)
}

fn open_read_conn(db_path: &Path) -> Result<Connection, String> {
    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX;
    let conn = Connection::open_with_flags(db_path, flags)
        .map_err(|error| format!("Failed to open read-only SQLite connection: {error}"))?;
    synapse_core::db::configure_read_connection(&conn)?;
    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Barrier;

    fn temp_db_path(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "caderno_db_pool_test_{}_{}",
            name,
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir_all(&dir).expect("create temp test dir");
        dir.join("test.sqlite")
    }

    #[tokio::test]
    async fn read_pool_serves_concurrent_reads_and_sees_committed_writes() {
        let db_path = temp_db_path("concurrent");
        let state = DbState::open(db_path.clone()).expect("open DbState");

        state
            .write(|conn| {
                conn.execute(
                    "INSERT INTO pages (id, title) VALUES ('p1', 'Hello WAL')",
                    [],
                )
                .map_err(|e| e.to_string())?;
                Ok(())
            })
            .await
            .expect("insert page");

        // Verify reader cannot write (PRAGMA query_only + SQLITE_OPEN_READ_ONLY)
        let write_on_reader = state
            .read(|conn| {
                conn.execute("INSERT INTO pages (id, title) VALUES ('p2', 'Fail')", [])
                    .map_err(|e| e.to_string())
            })
            .await;
        assert!(write_on_reader.is_err());

        // Run parallel reads exceeding pool size to verify condvar wake-up and return-to-pool
        let barrier = Arc::new(Barrier::new(DEFAULT_READ_POOL_SIZE));
        let mut handles = Vec::new();
        for idx in 0..(DEFAULT_READ_POOL_SIZE * 2) {
            let st = state.clone();
            let bar = Arc::clone(&barrier);
            handles.push(tokio::spawn(async move {
                st.read(move |conn| {
                    if idx < DEFAULT_READ_POOL_SIZE {
                        bar.wait();
                    }
                    let title: String = conn
                        .query_row("SELECT title FROM pages WHERE id = 'p1'", [], |r| r.get(0))
                        .map_err(|e| e.to_string())?;
                    Ok(title)
                })
                .await
            }));
        }

        for h in handles {
            let title = h.await.expect("join").expect("read");
            assert_eq!(title, "Hello WAL");
        }

        // Verify close_all releases connections and fails subsequent reads cleanly
        state.close_all().expect("close_all");
        assert!(state.read(|_| Ok(())).await.is_err());

        if let Some(parent) = db_path.parent() {
            let _ = std::fs::remove_dir_all(parent);
        }
    }
}
