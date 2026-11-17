# React Sync and Autosave Architecture Notes

> **Scope:** This document preserves React/Web sync and autosave design notes, including historical performance claims. It does not certify Qt or Android sync parity, zero-lock behavior, repository-wide E2EE, or that every implementation detail still matches the current code. Verify paths and contracts before changing the sync system.

> **Verification status (2026-11-17):** The scoped web client and replacement rules are deployed to the four Hosting sites configured in `firebase.json`. Production anonymous root reads are denied. Firebase Auth providers are enabled, but the project currently has zero Auth users; the [Firebase sync integrity audit](../audits/firebase-sync-integrity-2026-11-17/README.md) tracks account creation, legacy-root reconciliation, decrypted parity, and native-client rollout. Do not treat the table inventory below as a successful-sync guarantee.

## 1. Architectural Overview

The React/Web client is designed around offline-first persistence and asynchronous synchronization. Actual behavior and encryption coverage depend on the specific adapter and entity:
- **Desktop (Tauri v2 / Rust)**: Local SQLite storage with WAL (Write-Ahead Logging) and RFC3339 UTC timestamps.
- **Web (PWA / Browser)**: Local IndexedDB (`idb`) with transactional persistence and Web Crypto Subtle API.
- **Mobile (Android Companion / WebView)**: Adaptive dynamic viewports, safe-area management, and lifecycle flush listeners.
- **Cloud Signaling (Firebase Firestore)**: Configured sync and signal flows use Firebase; encryption and plaintext exposure depend on the entity and adapter being used.

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
│  • Client-Side Encryption for Supported Entity Flows                           │
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
Large document files (PDFs, EPUBs, and video media) use separate Google Drive encryption/sync flows where implemented. Running `syncPdfsToCloud` inside the 3-second text autosave debounce caused severe network locking in the implementation described by this snapshot.
- **Resolution**: `syncPdfsToCloud` is decoupled from `doPushOnlySync` and runs exclusively during `doFullSync` (startup, window refocus, manual sync, and network reconnection). Fast text edits complete in under 100ms.

### 2.5. Native Engine-Level Push Filtering (`cmd_sync.rs` & `sync-push.ts`)
Previously, push synchronization loaded entire tables into JavaScript memory (`SELECT *`) and performed timestamp filtering in the JS main thread via `.filter(r => r.updated_at > cutoff)`. On vaults with thousands of pages, this caused high IPC serialization overhead, RAM spikes, and Garbage Collection stutter.
- **SQLite Engine Filtering**: The Rust backend command `sync_get_modified_rows` accepts an optional `since` parameter and delegates filtering directly to SQLite's C-engine:
  ```sql
  SELECT * FROM {table} WHERE CAST(strftime('%s', updated_at) AS INTEGER) > ?
  ```
- **IndexedDB Querying**: `web/sync.ts` queries indexed timestamp keys or filters rows efficiently via `parseDateSafe` to handle both ISO and SQLite space-separated timestamps.
- **Result**: Zero excess IPC transfer and immediate $O(K)$ row retrieval where $K$ is the number of dirty records, eliminating GC pauses entirely.

### 2.6. Decoupled Sync Status & Leaf Toast Isolation (`SyncCoordinator.ts` & `useSyncStatus.ts`)
Previously, `syncStatus` was tracked as state inside the root `App.tsx` component. Every synchronization cycle (`idle` → `syncing` → `idle`) triggered an application-wide virtual DOM re-render of sidebars, navigation tabs, editor containers, and floating panels.
- **External Store Coordinator**: A centralized `SyncCoordinator` singleton now manages sync states and dispatches atomic transitions outside of React's component tree.
- **Selective Leaf Subscriptions**: UI indicators (e.g. `SyncStatusToast.tsx`) subscribe directly using `useSyncExternalStore`:
  ```ts
  export function useSyncStatus(): SyncStatus {
    return useSyncExternalStore(
      SyncCoordinator.subscribe,
      SyncCoordinator.getSnapshot,
      SyncCoordinator.getServerSnapshot
    );
  }
  ```
- **Result**: During active background sync or autosave cycles, the main application root, editor, and navigation elements experience **zero virtual DOM re-renders**.

### 2.7. Reducer State Memoization & Identity Preservation (`commands.ts`)
High-frequency page updates and title synchronizations can reallocate entire page lists if action reducers create new objects indiscriminately.
- **Bailout on Unchanged Fields**: The `UPDATE_PAGE` and `SET_PAGES` action handlers compare target fields (`shallowEqual` and property checks) before returning a new state reference.
- **Result**: If an incoming save payload contains data identical to the active store state, the previous object reference is preserved, preventing downstream selector triggers and component re-evaluations.

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
- Timestamps are stored per account/workspace and table to prevent one identity's checkpoint from skipping data in another scope or module.
- A 5,000ms (5-second) clock skew buffer is subtracted from the cutoff timestamp when querying rows, ensuring no record is missed due to minor device clock variations.

### 4.3. Cross-Platform Timestamp Normalization & Resilient Device Tracking
Differences in date formatting between SQLite native strings (`YYYY-MM-DD HH:MM:SS`) and ECMAScript ISO strings (`YYYY-MM-DDTHH:MM:SS.sssZ`) can lead to lexicographical comparison bugs in web and mobile runtimes.
- **Robust Epoch Conversion**: `cmd_sync.rs` compares Unix epoch seconds using SQLite's `CAST(strftime('%s', updated_at) AS INTEGER) > ?`, insulating synchronization from date string formatting differences.
- **`parseDateSafe` Fallback**: In `web/sync.ts`, date values are normalized through a resilient parser that handles both ISO 8601 and space-separated SQLite dates across Safari, Chrome, and Android WebViews.
- **Resilient Device Identification**: `getDeviceId()` wraps `localStorage` access in structured exception handling, generating a fallback session UUID in restricted or incognito WebView contexts where storage access may throw `SecurityError`.

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
3. **Account and Workspace Scoped Synchronization**:
   - Sync requires a non-anonymous Firebase UID. Local-only app sessions do not send data to Firestore.
   - When a workspace is active, the sync engine uses member-controlled paths:
     ```ts
     const targetCollection = workspaceId
       ? collection(db, 'workspaces', workspaceId, table)
       : collection(db, 'users', userId, 'sync', 'data', table);
     ```
   - Without a workspace, records live in the authenticated account's private subcollection. User config documents hold the account's sync signal and manifest; workspace config holds the workspace equivalents.
   - Checkpoints and deletion backfill flags are scoped by the same UID/workspace key. The first sync into a new scope performs a full table scan.
   - The local account-evolution migration copies local records into the authenticated user's personal workspace. It never reads unscoped root collections. Historical root documents remain unreconciled until an ownership-aware process is run.

---

## 6. Mobile Lifecycle & Network Self-Healing

1. **Android WebView Lifecycle Flush**:
   - Mobile operating systems frequently suspend background processes when switching tabs or locking the screen.
   - Synapse listens to `visibilitychange` (`document.visibilityState === 'hidden'`) and `pagehide` to immediately flush any pending 3-second debounced pushes before process suspension.
2. **Network Reconnection Recovery**:
   - Listens to the window `online` event to automatically trigger a full multi-table synchronization when internet connectivity is restored.

---

## 7. Constant-Time Binary Transformations & Base64 Acceleration (`binary.ts`)

During file uploads, encrypted video streaming, and attachment synchronization, large chunks of `Uint8Array` data are frequently translated to and from base64 strings.
- **Precomputed Lookup Tables**: Rather than invoking naive string concatenation or regex parsing on large buffers, `binary.ts` initializes static $O(1)$ byte lookup tables (`b64ToByte` and `byteToB64`).
- **Chunked String Conversion**: Prevents maximum call stack exhaustion (`RangeError: Maximum call stack size exceeded`) by chunking array buffers when calling `String.fromCharCode.apply`.
- **Zero UI Stutter**: Media encoding and decoding operations complete at wire speed on the main thread or within worker pipelines without dropping UI frames.

---

## 8. Intended Sync Table Inventory & Tombstone Propagation

The table list below is the current client-side sync allowlist. It documents intended participation, not proof of complete cloud persistence, field parity, or account ownership. The audit checklist tracks reconciliation separately.

| Module | Synchronized Tables | Primary Key | Soft Delete Tombstone |
| --- | --- | --- | --- |
| `core` | `config`, `ai_prompts` | `id` | `deleted_at` |
| `notes` | `pages`, `page_history` | `id` | `deleted_at` |
| `finance` | `transactions`, `wishlist`, `finance_accounts` | `id` | `deleted_at` |
| `library` | `library_books`, `library_highlights`, `library_bookmarks`, `library_collections`, `library_book_collections`, `library_reading_sessions` | `id` | `deleted_at` |
| `culture` | `culture_items`, `culture_episodes`, `culture_disliked_items`, `culture_ignored_items` | `id` | `deleted_at` |
| `video` | `videos`, `video_words`, `youtube_watched`, `youtube_summaries` | `id` | `deleted_at` |
| `calendar` | `calendar_events` | `id` | `deleted_at` |
| `vault` | `vault_groups`, `vault_items`, `vault_password_history` | `id` | `deleted_at` |
| `practice` | `tutor_sessions`, `tutor_messages`, `tutor_memories` | `id` | `deleted_at` |
| `focus` | `focus_sessions`, `alarms`, `lofis`, `activity_logs` | `id` | `deleted_at` |
| `anki` | `anki_decks`, `anki_notes`, `anki_cards`, `anki_srs_state`, `anki_reviews`, `anki_deck_settings` | `id` | `deleted_at` |
| `files` | `files`, `file_folders`, `file_page_links` | `id` | `deleted_at` |
| `diagrams` | `diagrams` | `id` | `deleted_at` |
| `quiz` | `quiz_batteries`, `quiz_questions`, `quiz_attempts`, `quiz_page_links` | `id` | `deleted_at` |
| `habits` | `habits`, `habit_logs` | `id` | `deleted_at` |
| `notifications` | `notifications` | `id` | `deleted_at` |
| `sharing` | `shared_page_keys` | `id` (`shareId`) | `deleted_at` |

### 8.1. Tombstone Deletion Model
Destructive operations (e.g. untoggling habit days, removing culture dislike/ignore signals, revoking shares, dismissing notifications) stamp `deleted_at = new Date().toISOString()` and `updated_at = new Date().toISOString()`. This ensures deletions replicate across all devices via the Firestore relay instead of hard-deleting locally and being resurrected by remote pulls.
