# 🔄 Synapse Synchronization & Zero-Lock Autosave Engine

## 1. Architectural Overview

Synapse is built upon an **Offline-First, Zero-Lock, Multiplatform Synchronization Architecture** that ensures total data integrity and instant responsiveness across:
- **Desktop (Tauri v2 / Rust)**: Local SQLite storage with WAL (Write-Ahead Logging) and RFC3339 UTC timestamps.
- **Web (PWA / Browser)**: Local IndexedDB (`idb`) with transactional persistence and Web Crypto Subtle API.
- **Mobile (Android Companion / WebView)**: Adaptive dynamic viewports, safe-area management, and lifecycle flush listeners.
- **Cloud Signaling Relay (Firebase Firestore)**: Blind, encrypted relay facilitating cross-device synchronization signals without ever accessing plaintext user records.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 UI THREAD (REACT 19)                            │
│  Editor Typing Keystroke (0ms perceived latency, zero component re-renders)    │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                        AUTOSAVE & STORAGE ADAPTER LAYER                         │
│  • PageView Memoization Bailout (prevents root tree re-render on save)          │
│  • In-Memory History Throttling (bypasses full table scans during edits)        │
│  • SQLite / IndexedDB Local Write (<5ms)                                        │
│  • Dispatches 'app-sync-trigger' with targeted table metadata                   │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                        USE-SYNC ENGINE (MUTEX & DEBOUNCE)                       │
│  • 3-Second Keystroke Debouncer                                                 │
│  • Dirty Tables Collector: Set<string> (e.g. ['pages'])                         │
│  • isSyncing Mutex + FIFO Pending Push Queue (hasPendingPush)                   │
│  • Decoupled Heavy Media (PDF Drive sync runs only on Full Sync)                │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                        CLOUD PUSH & REAL-TIME RELAY                             │
│  • pushAllToCloud: selective push for dirty tables only                         │
│  • Client-Side E2EE Encryption with Module Master Keys                          │
│  • Firestore Batch Write + Device ID Signal Broadcast                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Zero-Locking Autosave Pipeline

The user typing in the editor must never experience micro-stutters, key latency, or frame drops. The autosave pipeline addresses this through four core layers:

### 2.1. UI Render Boundary Bailout (`PageView.tsx`)
Previously, autosaving invoked `setLoadedData({ pageId: page.id, data })` on every save, forcing React to remount or re-render `PageView`, `PageHeader`, `PageCover`, and `Editor`.
- **Optimization**: `PageView` now inspects previous loaded state:
  ```ts
  setLoadedData((prev) => {
    if (prev && prev.pageId === page.id) {
      return prev; // Preserves object identity; bails out of entire component tree re-render
    }
    return { pageId: page.id, data };
  });
  ```
- **Outcome**: Keystroke saves produce zero React virtual DOM re-renders in the surrounding container.

### 2.2. In-Memory Page History Throttling (`notes.ts` & `cmd_notes.rs`)
To support historical versioning without ballooning storage or freezing threads, note revisions are captured only after a 60-second threshold since the last snapshot:
- **IndexedDB**: An in-memory cache map (`lastPageHistoryTime = new Map<string, number>()`) tracks the last snapshot timestamp per page. This bypasses expensive `getAllFromIndex('page_history', 'page_id', pageId)` database scans on every 2-second autosave keystroke.
- **SQLite (Tauri / Rust)**: Uses `(strftime('%s', 'now') - strftime('%s', MAX(created_at))) > 60` with composite index `idx_page_history_page_created` to execute in sub-millisecond time.

### 2.3. Targeted Dirty-Table Pushes
Rather than scanning all 35 tables across 14 modules whenever a single character is typed, the sync trigger pipeline passes the specific modified table:
```ts
window.dispatchEvent(new CustomEvent('app-sync-trigger', { detail: { table: 'pages' } }));
```
- In `useSync.ts`, a `dirtyTables = new Set<string>()` accumulates touched tables.
- `pushAllToCloud(masterKey, tablesToPush)` iterates **only** over modules associated with the dirty tables, reducing Firestore check operations from 35 queries down to 1.

### 2.4. Decoupled Media Synchronization
Large document files (PDFs, EPUBs, video media) are synchronized with Google Drive E2EE storage. Running `syncPdfsToCloud` inside the 3-second text autosave debounce caused severe network locking.
- **Resolution**: `syncPdfsToCloud` is decoupled from `doPushOnlySync` and runs exclusively during `doFullSync` (startup, window refocus, manual sync, and network reconnection). Fast text edits complete in under 100ms.

---

## 3. Concurrency, Mutex Coordination, and Queueing

To prevent concurrent execution, race conditions, and wasted cloud quotas, `useSync` implements a stateful mutex with FIFO queueing:

### 3.1. Mutex States & Operations
- `isSyncing = true`: Active during full sync, push-only sync, or real-time pull.
- `hasPendingSignal = true`: If a remote device sends a Firebase real-time sync signal while local sync is active, the signal is preserved and executed as soon as the mutex is released.
- `hasPendingPush = true`: If the user makes an edit while a sync operation is in flight, the push is queued rather than dropped.
- `checkPendingOperations()`: Invoked in the `finally` block of every sync operation:
  ```ts
  const checkPendingOperations = () => {
    if (isClosed || isSyncing) return;
    if (hasPendingSignal) {
      hasPendingSignal = false;
      executeRealTimePull();
    } else if (hasPendingPush) {
      hasPendingPush = false;
      doPushOnlySync();
    }
  };
  ```

---

## 4. Cross-Platform Consistency & Timestamp Standards

### 4.1. Strict RFC3339 UTC Formatting
All timestamp fields (`created_at`, `updated_at`, `deleted_at`) must follow RFC3339 UTC formatting:
`YYYY-MM-DDTHH:MM:SS.sssZ`
- Both Rust (`chrono::Utc::now().to_rfc3339()`) and Web (`new Date().toISOString()`) strictly adhere to UTC.
- Prevents 3-hour timezone shifts when comparing timestamps between local databases and cloud storage.

### 4.2. Per-Table Last-Sync Tracking & Clock Skew Leeway
- Timestamps are stored per table (`lastPush_${table}`, `lastPull_${table}`) to prevent edits in one module from artificially suppressing synchronization in other modules.
- A 5,000ms (5-second) clock skew buffer is subtracted from the cutoff timestamp when querying rows, ensuring no record is missed due to minor device clock variations.

---

## 5. Security & Blind Cloud Relay

1. **Two-Tier Keychain Architecture**:
   - Master Password derives the Master Key via PBKDF2 with HMAC-SHA256 (600,000 iterations).
   - Module-specific keys (`notes`, `vault`, `finance`, etc.) encrypt database rows locally using AES-256-GCM before writing to the cloud relay.
2. **Blind Firestore Relay**:
   - Firebase Firestore receives only encrypted payloads:
     ```json
     {
       "encryptedData": "...",
       "iv": "...",
       "table": "pages",
       "updatedAt": "2026-10-25T12:00:00.000Z",
       "deviceId": "client-uuid"
     }
     ```
   - Cloud operators and database administrators cannot read note titles, content, transaction amounts, or vault credentials.
3. **Multi-Tenant Workspace Scoped Synchronization**:
   - When a user operates within a collaborative workspace (`activeWorkspaceId`), the sync engine routes mutations to scoped paths:
     ```ts
     // Push & Pull Scoping
     const targetCollection = workspaceId
       ? collection(db, 'workspaces', workspaceId, table)
       : collection(db, table);
     ```
   - Real-time signaling binds dynamically to the active workspace:
     - Root singleton signal: `config/sync_signal` (single-user legacy).
     - Workspace signal: `workspaces/{workspaceId}/config/sync_signal` (collaborative multi-tenant).
   - Switching workspaces in the UI unbinds the previous listener, resets local caches, and subscribes to the new workspace signal instantly with zero data cross-talk.

---

## 6. Mobile Lifecycle & Network Self-Healing

1. **Android WebView Lifecycle Flush**:
   - Mobile operating systems frequently suspend background processes when switching tabs or locking the screen.
   - Synapse listens to `visibilitychange` (`document.visibilityState === 'hidden'`) and `pagehide` to immediately flush any pending 3-second debounced pushes before process suspension.
2. **Network Reconnection Recovery**:
   - Listens to the window `online` event to automatically trigger a full multi-table synchronization when internet connectivity is restored.
