# Historical Multi-User Workspace Audit

> **Document status:** Historical analysis snapshot from 2026-11-17; not a current acceptance report. All present-tense descriptions below refer to that source snapshot and may be obsolete. Current authentication, synchronization, security, and cleanup status is maintained in the [documentation status index](../documentation-status.md), the [Firebase integrity audit](../audits/firebase-sync-integrity-2026-11-17/README.md), and the [cloud account migration checklist](../security/cloud-account-encryption-migration.md). Workspace implementation status is not certified; see the associated [proposal](./multiuser-workspace-action-plan.md).

---

## Executive Summary

This report preserves the original analysis for a proposed transition from a single-user repository to a multi-tenant workspace platform. Its observations, schemas, line references, and performance comments describe an earlier source snapshot and have not been revalidated against the current checkout.

---

## 1. General Project Structure & Technology Stack

### 1.1. Core Runtime Topology
Synapse executes as a unified cross-platform application across two primary target platforms from a single TypeScript/Rust monorepo:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                        CROSS-PLATFORM FRONTEND (REACT 19)                     │
│               TypeScript 6.0  •  Vite 8  •  TailwindCSS  •  TipTap v3         │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                      Environment Detection (`__TAURI__`)
                     ┌─────────────────┴─────────────────┐
                     ▼                                   ▼
       ┌───────────────────────────┐       ┌───────────────────────────┐
       │   DESKTOP (TAURI V2 / RUST)│       │      WEB PWA (BROWSER)    │
       ├───────────────────────────┤       ├───────────────────────────┤
       │ • Native SQLite (WAL mode)│       │ • IndexedDB (`idb` v8)    │
       │ • Tauri IPC Commands      │       │ • Web Crypto API (Subtle) │
       │ • Axum Streaming Server   │       │ • Service Worker (`sw.js`)│
       │ • Native FFmpeg / yt-dlp  │       │ • Firebase Firestore Sync │
       │ • `encrypted://` Protocol │       │ • Google Drive REST API   │
       └───────────────────────────┘       └───────────────────────────┘
```

### 1.2. Technology Stack & Key Dependencies
- **Frontend Core**: React 19 (`19.2.6`), ReactDOM (`19.2.6`), TypeScript 6 (`~6.0.2`), Vite 8 (`^8.0.12`).
- **Styling & Tokens**: TailwindCSS (`^3.4.19`), PostCSS, Lucide React (`^1.21.0`), Radix UI dropdown menus (`^2.1.19`), Floating UI (`^0.27.19`).
- **Editor & Rich Text**: TipTap v3 (`^3.27.1`), ProseMirror (`@tiptap/pm`), lowlight (`^3.3.0`), KaTeX / LaTeX renderer, DOMPurify (`^3.4.12`).
- **Collaboration & Concurrency**: Yjs (`^13.6.31`), `y-prosemirror` (`^1.3.7`), `@tiptap/y-tiptap` (`^3.0.8`), `y-protocols` (`^1.0.7`).
- **Cloud & Network Persistence**: Firebase SDK (`^12.15.0`) — strictly using `firebase/app`, `firebase/firestore`, and `firebase/storage`.
- **Local Persistence**: IndexedDB via `idb` (`^8.0.3`) for web/mobile; `rusqlite` (`0.32`) with WAL mode in Rust for desktop.
- **Cryptography**: Web Crypto API (`crypto.subtle`) in TypeScript; `aes-gcm` (`0.10`), `pbkdf2` (`0.12`), `sha2` (`0.10`) in Rust.
- **Testing Engine**: Vitest (`^4.1.10`), jsdom (`^30.0.1`), `@testing-library/react` (`^16.3.2`), `fake-indexeddb` (`^6.2.5`).

### 1.3. Four-Tier Architectural Layering
The project enforces strict separation of concerns across four tiers:
1. **Presentation Layer (`apps/web-react/src/components/`)**: Visual UI rendering, Tailwind styling, accessibility, and event forwarding. Contains zero raw Tauri `invoke()` calls or raw Firestore queries.
2. **Orchestration Layer (`apps/web-react/src/hooks/`, `apps/web-react/src/store/`)**: Global state management (`StoreProvider`, `useStore`, `FocusContext`, `TaskContext`), custom hooks (`useSync`, `useAppAuth`, `usePageActions`), memoization, and UI-to-service coordination.
3. **Domain & Business Layer (`apps/web-react/src/services/`, `apps/web-react/src/utils/`)**: Pure domain algorithms: FSRS spaced repetition scheduling (`apps/web-react/src/services/fsrs.ts`), diffing, PBKDF2/AES-GCM key derivation (`apps/web-react/src/services/crypto.ts`), OCR processing (`apps/web-react/src/services/library/ocr-service.ts`), and device fingerprinting (`apps/web-react/src/services/sharing/device-fingerprint.ts`).
4. **Infrastructure & Platform Layer (`apps/web-react/src/api/`, `apps/web-react/src/services/sync/`)**: Multiplatform abstraction layer (`window.api` typed in `apps/web-react/src/api/types.ts`). Routes calls dynamically to `tauriApi` (`apps/web-react/src/tauri-api.ts`) or `webApi` (`apps/web-react/src/services/web-api.ts`), ensuring 100% functional parity.

---

## 2. Firebase Services & Configuration

### 2.1. Firebase Database in Use
- **Cloud Firestore**: The **only** active Firebase database in the project.
  - Initialized in [`apps/web-react/src/services/firebase.ts:21-23`](../../apps/web-react/src/services/firebase.ts#L21-L23):
    ```ts
    export const db = initializeFirestore(app, {
      experimentalForceLongPolling: platform.platform === 'desktop'
    });
    ```
- **Realtime Database**: **NOT in use**. Not imported, configured, or referenced anywhere.

### 2.2. Firebase Services Status Matrix
| Firebase Service | Snapshot status (2026-11-17) | Detailed Configuration & Code Location in that snapshot |
| :--- | :--- | :--- |
| **Firestore** | **Active (Core Sync Relay)** | Configured via `apps/web-react/src/services/firebase.ts`, rules in `firestore.rules`. Serves as encrypted blind relay. |
| **Authentication** | **Configured; account setup pending in this snapshot** | Firebase Auth email/password and anonymous providers were enabled for the configured web app. The production project had zero Auth users at the time. The primary account was established later; scoped reconciliation and remaining UI acceptance are tracked in the current Firebase audit. |
| **Storage** | **Initialized but unused in this snapshot; since removed** | Firebase Storage had no consumers at the time. Its unused initialization and environment setting have since been removed; see the [documentation status index](../documentation-status.md). |
| **Functions** | **Inactive (NOT configured)** | No Cloud Functions exist in `firebase.json` or source tree. |
| **Hosting** | **Active (Production & Dev PWA)** | Configured in `firebase.json` for 4 targets (`synapse-dev`, `synapsedev`, `synapse-web`, `fourth-cirrus-468923-h7`). Deploys `apps/web-react/dist-web` with `/s/** -> /share-viewer.html` and `** -> /index.html` rewrites. |

### 2.3. Firebase Environment Credentials
Credentials are read via Vite environment variables defined in the React app's [`.env.example`](../../apps/web-react/.env.example):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_SHARE_DOMAIN` (defaults to `synapse-dev.web.app`)

---

## 3. End-to-End Authentication & Session Lifecycle

### 3.1. Historical Single-Password Mechanism (Snapshot: 2026-11-17)
At the time of this snapshot, the application used a **Single Master Password** for identity verification and encryption key derivation. React Web, Tauri, and WebView have since adopted Firebase account sign-in with a checked key migration; Qt and native Android remain separate migration targets. See the [current cloud account migration checklist](../security/cloud-account-encryption-migration.md).

```
[ User Input: Single Master Password ]
                  │
                  ▼ PBKDF2-HMAC-SHA256 (600,000 iterations + "caderno-e2ee-salt-v1")
          [ Master Key (CryptoKey / AES-256) ]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
[ Local Validation ]   [ Cloud Validation ]
IndexedDB / SQLite:     Firestore: `config/auth_validator`
SHA-256(pwd + salt)     decryptText(encryptedData, MasterKey)
                        == { validator: 'CADERNO_VALIDO' }
```

1. **Initial Setup Flow** ([`apps/web-react/src/components/AuthScreen.tsx:70-148`](../../apps/web-react/src/components/AuthScreen.tsx#L70-L148)):
   - Triggered when `authStatus === 'new'` or `'unencrypted'`.
   - Derives `MasterKey` using `deriveMasterKey(password)`.
   - Generates or imports 11 module keys (for `notes`, `vault`, `finance`, `library`, `culture`, `anki`, `files`, `calendar`, `focus`, `practice`, `core`).
   - If setting up for the first time on cloud: writes `{ encryptedData: encryptText({ validator: 'CADERNO_VALIDO' }, MasterKey), updatedAt }` to `config/auth_validator` ([`apps/web-react/src/services/sync/sync-auth.ts:146-161`](../../apps/web-react/src/services/sync/sync-auth.ts#L146-L161)).
   - Pushes encrypted module keys to `config/module_keys` ([`apps/web-react/src/services/sync/sync-auth.ts:163-197`](../../apps/web-react/src/services/sync/sync-auth.ts#L163-L197)).
   - Locally writes SHA-256 password hash to `config/masterHash` in IndexedDB ([`apps/web-react/src/api/web/auth.ts:51-52`](../../apps/web-react/src/api/web/auth.ts#L51-L52)) or `keychain` table in SQLite (`apps/web-react/src-tauri/src/cmd_auth.rs:182-245`).

2. **Login Verification Flow** ([`apps/web-react/src/components/AuthScreen.tsx:149-218`](../../apps/web-react/src/components/AuthScreen.tsx#L149-L218)):
   - Verifies input locally via `window.api.auth.login(password)`:
     - Web: hashes password and matches against `config/masterHash` in IndexedDB.
     - Desktop: attempts AES-256-GCM decryption of `library_key_enc` or `notes_key_enc` in SQLite table `keychain`.
   - Cloud Verification (`verifyCloudMasterPassword` in `sync-auth.ts:7-50`): Reads `config/auth_validator`. If decryption yields `CADERNO_VALIDO`, cloud login succeeds.
   - If cloud login succeeds but local hash is outdated, auto-migration updates the local hash (`AuthScreen.tsx:153-159`).
   - Unlocks module keys and dispatches `{ type: 'SET_MODULE_KEYS', keys }` into React Store.

3. **Session State & Screen Protection**:
   - Session state is held purely in **volatile React component memory** via `useAppAuth` (`isAuth: boolean`, `authStatus: string`).
   - Gatekeeper in [`apps/web-react/src/App.tsx:220-222`](../../apps/web-react/src/App.tsx#L220-L222):
     ```tsx
     if (!isAuth) {
       return <AuthScreen status={authStatus} onSuccess={() => setIsAuth(true)} />;
     }
     ```
   - Inactivity locking (`useActivityTracker.ts`) and system suspend detection (`useAppAuth.ts:28-58`) trigger `window.api.auth.lock()`, resetting `isAuth = false`, wiping module keys from React store, and clearing the web vault key.
   - Plaintext passwords and cryptographic keys are **never stored in localStorage, cookies, or IndexedDB**.

---

## 4. Current Data Model (Local & Cloud)

### 4.1. Core Synchronized Modules & Collections
Every module table maps 1:1 between local persistence (SQLite/IDB) and Firestore root collections:

```
MODULE_TABLES Definition (apps/web-react/src/services/sync/sync-utils.ts:5-27):
├── core:     ['config', 'ai_prompts']
├── notes:    ['pages', 'page_history']
├── finance:  ['transactions', 'wishlist', 'finance_accounts']
├── library:  ['library_books', 'library_highlights', 'library_bookmarks', 'library_collections',
│              'library_book_collections', 'library_reading_sessions']
├── culture:  ['culture_items', 'culture_episodes']
├── video:    ['videos', 'video_words', 'youtube_watched']
├── calendar: ['calendar_events']
├── vault:    ['vault_groups', 'vault_items', 'vault_password_history']
├── practice: ['tutor_sessions', 'tutor_messages', 'tutor_memories']
├── focus:    ['focus_sessions', 'alarms', 'lofis', 'activity_logs']
├── anki:     ['anki_decks', 'anki_notes', 'anki_cards', 'anki_srs_state', 'anki_reviews', 'anki_deck_settings']
├── files:    ['files', 'file_folders', 'file_page_links']
├── diagrams: ['diagrams']
└── quiz:     ['quiz_batteries', 'quiz_questions', 'quiz_attempts', 'quiz_page_links']
```

### 4.2. Cloud Document Payload Structure (Blind Relay)
When pushed to Firestore, each record is serialized, optionally gzip-compressed if >900KB, and encrypted with its module AES-256 key:

```typescript
// Structure of any document in Firestore root collections (pages, transactions, etc.):
{
  encryptedData: string;       // AES-256-GCM ciphertext (IV + AuthTag prepended/appended)
  isCompressed: boolean;       // True if compressed with CompressionStream('gzip') before encryption
  updatedAt: string | null;    // ISO 8601 UTC timestamp used for incremental sync filtering
  createdAt: string | null;    // ISO 8601 UTC timestamp
  deletedAt: string | null;    // Soft delete timestamp (tombstone pattern)
}
```

### 4.3. Page Sharing Subsystem Collections
Defined in `firestore.rules` and implemented in `apps/web-react/src/services/sharing/`:
- `shared_pages/{shareId}`: Metadata config (pageId, ownerId [device fingerprint], permission, passwordHash, wrappedShareKey, isActive, expiresAt, maxViews, viewCount).
- `shared_page_content/{shareId}`: Content payload (encryptedContent, encryptedTitle, encryptedIcon, coverImage, contentHash).
- `shared_page_children/{childId}`: Nested page sharing linkages.
- `share_access_requests/{requestId}`: Visitor access approval handshake (deviceFingerprint, status, visitorPublicKey, ownerPublicKey, encryptedShareKey).
- `share_trusted_devices/{shareId_fingerprintHash}`: Approved device bypass records.
- `share_access_logs/{logId}`: Append-only audit logs.
- `share_updates/{updateId}`: Real-time encrypted Yjs binary deltas (`{ shareId, authorDeviceId, encryptedUpdate, timestamp }`).
- `share_presence/{shareId_deviceId}`: Ephemeral visitor presence (`{ persona, cursor, lastActive }`).

---

## 5. Catalog of All Firestore Operations

### 5.1. Real-Time Listeners (`onSnapshot`)
| File & Line | Target Document / Query | Invocation Frequency & Trigger | Purpose & Lifecycle |
| :--- | :--- | :--- | :--- |
| [`sync-signal.ts:11`](../../apps/web-react/src/services/sync/sync-signal.ts#L11) | `doc(db, 'config', 'sync_signal')` | Persistent during active session in `useSync.ts:194` | Detects remote sync pushes from other devices to trigger `executeRealTimePull()`. |
| [`share-collab.ts:63`](../../apps/web-react/src/services/sharing/share-collab.ts#L63) | `query(collection(db, 'share_updates'), where('shareId', '==', shareId))` | Active while viewing shared page (`ShareContentViewer.tsx`) | Synchronizes remote encrypted Yjs CRDT keystrokes and updates. |
| [`share-collab.ts:132`](../../apps/web-react/src/services/sharing/share-collab.ts#L132) | `query(collection(db, 'share_presence'), where('shareId', '==', shareId))` | Active while viewing shared page (`ShareContentViewer.tsx`) | Receives remote peer cursor positions and persona badges. |
| [`share-access-gate.ts:170`](../../apps/web-react/src/services/sharing/share-access-gate.ts#L170) | `doc(db, 'share_access_requests', requestId)` | Visitor browser waiting for owner approval | Listens for status transition from `'pending'` to `'approved'` or `'denied'`. |
| [`share-access-gate.ts:202`](../../apps/web-react/src/services/sharing/share-access-gate.ts#L202) | `query(collection(db, 'share_access_requests'), where('shareId', 'in', targetIds), where('status', '==', 'pending'))` | Notebook owner session (`GlobalModals.tsx`) | Alerts notebook owner of incoming access requests across active shares. |
| [`ShareViewerApp.tsx:128`](../../apps/web-react/src/share-viewer/ShareViewerApp.tsx#L128) | `doc(db, 'shared_pages', shareId)` | Active on visitor viewer page | Instantly detects if owner revoked, expired, or deleted the share. |
| [`ShareContentViewer.tsx:166`](../../apps/web-react/src/share-viewer/components/ShareContentViewer.tsx#L166) | `doc(db, 'shared_page_content', config.id)` | Active while visitor is reading | Synchronizes full-document snapshots when owner re-saves the page. |

### 5.2. Single Reads (`getDoc`) & Query Reads (`getDocs`)
| File & Line | Firestore Method | Target Document / Query | Purpose |
| :--- | :--- | :--- | :--- |
| [`sync-auth.ts:19`](../../apps/web-react/src/services/sync/sync-auth.ts#L19) | `getDoc` | `config/auth_validator` | Verifies Master Password against cloud validation string. |
| [`sync-auth.ts:68`](../../apps/web-react/src/services/sync/sync-auth.ts#L68) | `getDoc` | `config/security_lock` | Fetches brute-force failed attempt counter. |
| [`sync-auth.ts:168`](../../apps/web-react/src/services/sync/sync-auth.ts#L168) | `getDoc` | `config/module_keys` | Checks if module keys already exist before push. |
| [`sync-auth.ts:203`](../../apps/web-react/src/services/sync/sync-auth.ts#L203) | `getDoc` | `config/module_keys` | Downloads encrypted module keys for local keychain setup. |
| [`sync-pull.ts:58`](../../apps/web-react/src/services/sync/sync-pull.ts#L58) | `getDoc` | `config/sync_manifest` | Reads table update timestamps to skip unchanged collections. |
| [`sync-pull.ts:123`](../../apps/web-react/src/services/sync/sync-pull.ts#L123) | `getDocs` | `query(collection(db, table), where('updatedAt', '>', threshold), orderBy('updatedAt'), limit(100))` | Paginated pull of modified rows per table. |
| [`share-access-gate.ts:298`](../../apps/web-react/src/services/sharing/share-access-gate.ts#L298) | `getDoc` | `share_trusted_devices/{shareId_fingerprint}` | Checks exact device fingerprint match. |
| [`share-access-gate.ts:319`](../../apps/web-react/src/services/sharing/share-access-gate.ts#L319) | `getDocs` | `query(collection(db, 'share_trusted_devices'), where('shareId', '==', ...))` | Fuzzy signal overlap check for trusted device matching. |
| [`share-manager.ts:368`](../../apps/web-react/src/services/sharing/share-manager.ts#L368) | `getDocs` | `query(collection(db, 'shared_pages'), where('pageId', '==', ...))` | Finds active share configuration for a specific page. |
| [`share-manager.ts:390`](../../apps/web-react/src/services/sharing/share-manager.ts#L390) | `getDocs` | `query(collection(db, 'shared_pages'), where('ownerId', '==', ...))` | Lists all shares created by current device. |
| [`share-manager.ts:423`](../../apps/web-react/src/services/sharing/share-manager.ts#L423) | `getDocs` | `query(collection(db, 'share_access_logs'), where('shareId', '==', ...))` | Fetches access logs for audit modal. |
| [`sync-utils.ts:101`](../../apps/web-react/src/services/sync/sync-utils.ts#L101) | `getDocs` | `collection(db, table)` | Unpaginated full collection read during `hardResetCloud()`. |

### 5.3. Writes, Batches, and Transactions
- **Atomic Batches (`writeBatch`)**:
  - [`apps/web-react/src/services/sync/sync-push.ts:202-222`](../../apps/web-react/src/services/sync/sync-push.ts#L202-L222): Chunks prepared encrypted documents into batches of up to 400 operations and commits atomically (`batch.set(docRef, data, { merge: true })`).
  - [`apps/web-react/src/services/sync/sync-utils.ts:109-124`](../../apps/web-react/src/services/sync/sync-utils.ts#L109-L124): `hardResetCloud()` deletes documents in batches of 400.
- **Direct Writes (`setDoc` / `updateDoc`)**:
  - `setDoc(doc(db, 'config', 'security_lock'))` (`sync-auth.ts:117, 134`)
  - `setDoc(doc(db, 'config', 'auth_validator'))` (`sync-auth.ts:151`)
  - `setDoc(doc(db, 'config', 'module_keys'))` (`sync-auth.ts:187`)
  - `setDoc(doc(db, 'config', 'sync_signal'))` (`sync-push.ts:288`)
  - `setDoc(doc(db, 'config', 'sync_manifest'))` (`sync-push.ts:303`)
  - `setDoc(doc(db, 'shared_pages', shareId))` (`share-manager.ts:213`)
  - `setDoc(doc(db, 'shared_page_content', shareId))` (`share-manager.ts:214`)
  - `setDoc(doc(db, 'share_updates', updateId))` (`share-collab.ts:44`)
  - `setDoc(doc(db, 'share_presence', docId))` (`share-collab.ts:96`)
  - `setDoc(doc(db, 'share_access_requests', reqId))` (`share-access-gate.ts:157`)
  - `setDoc(doc(db, 'share_trusted_devices', docId))` (`share-access-gate.ts:285`)
- **Deletions (`deleteDoc`)**:
  - [`share-manager.ts:347-348`](../../apps/web-react/src/services/sharing/share-manager.ts#L347-L348): Deletes `shared_pages` and `shared_page_content`.
  - [`share-collab.ts:113`](../../apps/web-react/src/services/sharing/share-collab.ts#L113): Removes `share_presence` record upon disconnect.
  - [`sync-pull.ts:245`](../../apps/web-react/src/services/sync/sync-pull.ts#L245): Cleans up legacy documents from cloud.
- **Transactions (`runTransaction`)**:
  - **Zero instances**. `runTransaction` is **never called** anywhere in the codebase.

---

## 6. Current Security Rules & Indexes

### 6.1. Audit of `firestore.rules`
The current rules file in [`firestore.rules`](../../firestore.rules) defines the following security posture:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shared_pages/{shareId} {
      allow read: if resource == null || resource.data.isActive == true;
      allow write: if true;
    }
    match /shared_page_content/{shareId} { allow read, write: if true; }
    match /shared_page_children/{childId} { allow read, write: if true; }
    match /share_access_requests/{requestId} { allow read, write: if true; }
    match /share_trusted_devices/{deviceId} { allow read, write: if true; }
    match /share_access_logs/{logId} {
      allow create: if true;
      allow read: if true;
      allow update, delete: if false;
    }
    match /share_updates/{updateId} { allow read, write: if true; }
    match /share_presence/{presenceId} { allow read, write: if true; }

    // Global fallback for core sync collections:
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Critical Security Vulnerabilities Identified:
1. **Unauthenticated Public Read & Write (`allow read, write: if true;`)**:
   The historical audit identified broad Firestore access as a risk. Encryption is entity-specific and the current native audit confirms that some sensitive database fields remain plaintext. Re-check the active Firestore rules and current sync adapters before using the old finding or assuming all payloads are E2EE-encrypted.
2. **Denial of Service via Blanket Overwrites**:
   An attacker can overwrite `config/auth_validator` or `config/module_keys`, permanently locking the user out of their cloud synchronization.
3. **No Ownership Validation (`request.auth == null`)**:
   This was a historical finding. Firebase Auth and scoped rules are deployed, and the primary account and scoped data reconciliation are established. Full app-mediated sign-in and sync-pull acceptance remain open; see the current [Firebase sync integrity audit](../audits/firebase-sync-integrity-2026-11-17/README.md).

### 6.2. Indexes Audit
- **Source Control Status**: There is **no `firestore.indexes.json` file** in the repository, and `firebase.json` does not reference any index configuration file.
- **Implicit Index Requirements**:
  1. `sync-pull.ts:102-106`: Requires a single-field index on `updatedAt` (provided by Firestore by default).
  2. `share-access-gate.ts:196-200`: `where('shareId', 'in', targetIds)` + `where('status', '==', 'pending')` requires a composite index: `(shareId ASC, status ASC)`.
  3. `share-manager.ts:364-367`: `where('pageId', '==', pageId)` + `where('isActive', '==', true)` requires a composite index: `(pageId ASC, isActive ASC)`.
  4. `share-manager.ts:416-421`: `where('shareId', '==', shareId)` + `orderBy('accessedAt', 'desc')` requires a composite index: `(shareId ASC, accessedAt DESC)`.
  5. `share-access-gate.ts:312-317`: `where('shareId', '==', ...)` + `where('persistentToken', '==', ...)` + `where('isRevoked', '==', false)` requires a composite index.

---

## 7. Catalog of Single-User Architectural Assumptions

The source snapshot analyzed here assumed a single user in the locations below. These paths and findings are historical and must be revalidated before implementation:

| Category | File & Line | Code Snippet | Single-User Assumption & Problem |
| :--- | :--- | :--- | :--- |
| **Fixed Cloud Doc** | [`sync-auth.ts:15`](../../apps/web-react/src/services/sync/sync-auth.ts#L15) | `doc(db, 'config', 'auth_validator')` | Singleton document in Firestore. Validates only one user's Master Password for the entire Firebase project. |
| **Fixed Cloud Doc** | [`sync-auth.ts:166`](../../apps/web-react/src/services/sync/sync-auth.ts#L166) | `doc(db, 'config', 'module_keys')` | Singleton document storing module encryption keys. Overwritten by whichever user sets up the app. |
| **Fixed Cloud Doc** | [`sync-auth.ts:66`](../../apps/web-react/src/services/sync/sync-auth.ts#L66) | `doc(db, 'config', 'security_lock')` | Brute force lockouts are global; failed attempts by one user lock out all users. |
| **Fixed Cloud Doc** | [`sync-signal.ts:10`](../../apps/web-react/src/services/sync/sync-signal.ts#L10) | `doc(db, 'config', 'sync_signal')` | Any push from any device notifies all other devices globally, causing cross-user pull spam. |
| **Fixed Cloud Doc** | [`sync-pull.ts:58`](../../apps/web-react/src/services/sync/sync-pull.ts#L58) | `doc(db, 'config', 'sync_manifest')` | Single manifest tracks global table update timestamps across all users. |
| **Flat Cloud Collections** | [`sync-push.ts:209`](../../apps/web-react/src/services/sync/sync-push.ts#L209) | `const docRef = doc(db, table, item.id);` | Writes rows directly into root collections (`pages/{id}`, `transactions/{id}`) without user or workspace namespaces. |
| **Unfiltered Cloud Pull** | [`sync-pull.ts:98-106`](../../apps/web-react/src/services/sync/sync-pull.ts#L98-L106) | `collection(db, table), where('updatedAt', '>', ...)` | Pulls all documents in the collection regardless of who authored or owns them. |
| **Local Storage Sync Key** | [`sync-utils.ts:29`](../../apps/web-react/src/services/sync/sync-utils.ts#L29) | `caderno_last_${type}_time` | Local storage sync timestamps are un-namespaced. Switching users would corrupt sync cursors. |
| **Local IDB Singleton** | [`web/auth.ts:16`](../../apps/web-react/src/api/web/auth.ts#L16) | `await db.get('config', 'masterHash');` | Only one master password hash can be stored in IndexedDB. |
| **SQLite Singleton** | `apps/web-react/src-tauri/src/cmd_auth.rs:96` | `SELECT ... FROM keychain LIMIT 1` | SQLite table `keychain` stores exactly one user's keychain row. |
| **Device-Based Share Owner** | [`share-manager.ts:182`](../../apps/web-react/src/services/sharing/share-manager.ts#L182) | `ownerId: localFingerprint.fingerprintHash` | Shares are owned by hardware/browser fingerprint rather than an authenticated user UID. |
| **Global React Store** | [`apps/web-react/src/store/useStore.tsx`](../../apps/web-react/src/store/useStore.tsx) | `pages: Page[]` in single `AppState` | This audit snapshot describes a store without workspace context or member permissions; revalidate against current code before acting on the finding. |

---

## 8. Performance & Cost Bottlenecks in Existing Implementation

1. **Global Sync Signal Fan-Out (`config/sync_signal`)**:
   - Every single push from any client updates `config/sync_signal`.
   - When 100 users make edits, this triggers 10,000 redundant `onSnapshot` evaluations, causing severe Firestore read quota burn.
2. **Cold Pull Unbounded Scans (`pullAllFromCloud`)**:
   - If a client has no `lastPull` timestamp (new login or cleared browser cache), `pullAllFromCloud` executes queries against all 35 tables without pagination limits, causing huge initial read spikes.
3. **Unbounded Historical Deltas in `share_updates`**:
   - [`apps/web-react/src/services/sharing/share-collab.ts:56-83`](../../apps/web-react/src/services/sharing/share-collab.ts#L56-L83) listens to `where('shareId', '==', shareId)`.
   - Deltas are never cleaned up or compacted. Over weeks of collaboration, a single shared document can accumulate thousands of delta documents that must be downloaded on every reconnect.
4. **Hard Limit of 30 Shares in `listenToPendingRequests`**:
   - In [`apps/web-react/src/services/sharing/share-access-gate.ts:195-200`](../../apps/web-react/src/services/sharing/share-access-gate.ts#L195-L200), `targetIds` is sliced to 30 due to Firestore's `in` operator limit. Users with >30 active shares will never receive access notifications for shares beyond the 30th.
5. **Memory-Heavy Batch Deletion in `hardResetCloud`**:
   - [`apps/web-react/src/services/sync/sync-utils.ts:101-118`](../../apps/web-react/src/services/sync/sync-utils.ts#L101-L118) fetches entire collections into memory before chunking into 400-doc batches. On large vaults, this triggers memory spikes.

---

## 9. Test Suite Verification & Execution Protocol

### 9.1. Test Suite Anatomy
- **Engine**: Vitest (`v4.1.10`) with `jsdom` environment.
- **Global Setup**: [`apps/web-react/src/test/setup.ts`](../../apps/web-react/src/test/setup.ts) automatically mocks:
  - IndexedDB via `fake-indexeddb/auto`.
  - Web Crypto API via Node.js `crypto.webcrypto`.
  - DOM APIs (`matchMedia`, `ResizeObserver`, `IntersectionObserver`, `scrollIntoView`, `AudioContext`).
- **Targeted Test Execution Command**:
  ```bash
  # Targeted sub-second feedback for a specific module:
  npm run test -- src/services/sync/sync-auth.test.ts
  ```
  *Result verified*: 6/6 tests passing in ~1.0s.

### 9.2. TypeScript Compilation Verification
- **Command**:
  ```bash
  npm run typecheck
  ```
  *Result verified*: Exited with code 0 (zero type errors across all contracts, components, and services).

---

## 10. Phase 1 Audit Conclusion & Sign-Off

At the time of this snapshot, the analysis described cloud persistence and authentication as a single-user model with hardcoded Firestore paths, flat collections, and open security rules. Later implementation and verification are recorded in the current Firebase audit and documentation index.

The requirements for **Fase 2 (Detailed Action Plan)** are clearly scoped:
1. Transition authentication to **Firebase Authentication** (email/password) while providing a seamless, zero-loss migration path for the current single user.
2. Introduce a robust multi-tenant data model with **Workspaces, Members, Roles, and Invitations**.
3. Partition Firestore data safely by workspace/user with strict security rules enforcing default-deny and role-based permissions.
4. Scale Yjs real-time collaboration cleanly within workspaces.

*The historical Phase 1 analysis was concluded in this snapshot. The following Phase 2 items are archived recommendations, not a current implementation plan or completion status.*
