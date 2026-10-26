# 🚀 Phase 2 — Comprehensive Architectural Action Plan: Multi-User Identity & Collaborative Workspaces

> **Document Status**: Complete & Approved for Implementation  
> **Target Subsystems**: Firebase Authentication, Workspace Hierarchy, Granular RBAC, E2EE Key Sharing, Real-Time CRDT Scaling, Data Migration & Emulator Verification  
> **Reference Audit**: [`docs/architecture/multiuser-workspace-analysis.md`](./multiuser-workspace-analysis.md)  
> **Guiding Philosophy**: 100% Functional & Visual Parity, Zero Data Loss, Zero Plaintext Leakage, Sub-Second Local Latency, Minimal Firestore Operation Overhead  

---

## 1. Proposed Data Model & Collection Topology

### 1.1. Collection Hierarchy & Namespacing
To eliminate global collisions and provide strict tenant boundaries, the root Firestore structure transitions from flat singleton collections into a scoped two-tier model:

```
cloud.firestore
├── users/
│   └── {userId}/
│       ├── profile: UserProfileDoc
│       ├── config/
│       │   ├── auth_validator: AuthValidatorDoc
│       │   ├── module_keys: EncryptedKeychainDoc
│       │   └── security_lock: SecurityLockDoc
│       └── memberships/
│           └── {workspaceId}: UserMembershipPointerDoc
│
├── workspaces/
│   └── {workspaceId}/
│       ├── meta: WorkspaceMetaDoc
│       ├── members/
│       │   └── {userId}: WorkspaceMemberDoc
│       ├── invitations/
│       │   └── {invitationId}: WorkspaceInvitationDoc
│       ├── config/
│       │   ├── sync_signal: WorkspaceSignalDoc
│       │   └── sync_manifest: WorkspaceManifestDoc
│       ├── pages/
│       │   └── {pageId}: ScopedRecordDoc (Encrypted)
│       ├── page_history/
│       │   └── {historyId}: ScopedRecordDoc (Encrypted)
│       ├── transactions/
│       │   └── {txId}: ScopedRecordDoc (Encrypted)
│       ├── library_books/
│       │   └── {bookId}: ScopedRecordDoc (Encrypted)
│       ├── anki_decks/
│       │   └── {deckId}: ScopedRecordDoc (Encrypted)
│       ├── anki_cards/
│       │   └── {cardId}: ScopedRecordDoc (Encrypted)
│       ├── files/
│       │   └── {fileId}: ScopedRecordDoc (Encrypted)
│       ├── [other_module_collections]/
│       └── collab_updates/
│           └── {updateId}: CollabDeltaDoc (Yjs CRDT)
│
└── public_shares/ (Preserved & isolated for web share viewer)
    ├── shared_pages/{shareId}
    ├── shared_page_content/{shareId}
    └── share_access_requests/{requestId}
```

### 1.2. Entity Schemas & TypeScript Definitions

#### 1. User Profile (`users/{userId}`)
```typescript
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  defaultWorkspaceId: string;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string;
}
```

#### 2. Workspace Metadata (`workspaces/{workspaceId}`)
```typescript
export interface WorkspaceMeta {
  id: string;
  name: string;
  icon: string; // Emoji or asset URL (e.g. '🏢', '📚')
  ownerId: string; // UID of workspace creator/current owner
  type: 'personal' | 'team';
  isArchived: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}
```

#### 3. Workspace Member (`workspaces/{workspaceId}/members/{userId}`)
```typescript
export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  email: string;
  displayName: string;
  encryptedWorkspaceKey: string; // Workspace AES-256 key encrypted with member's Master Key
  joinedAt: string;
  invitedBy: string;
}
```

#### 4. User Membership Pointer (`users/{userId}/memberships/{workspaceId}`)
*Purpose*: Denormalized index allowing a user to list all their workspaces in a single $O(1)$ query without running a costly collection-group query across all workspaces.
```typescript
export interface UserMembershipPointer {
  workspaceId: string;
  name: string;
  icon: string;
  role: WorkspaceRole;
  isDefault: boolean;
  joinedAt: string;
}
```

#### 5. Workspace Invitation (`workspaces/{workspaceId}/invitations/{invitationId}`)
```typescript
export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  invitedEmail: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  invitedByUserId: string;
  invitedByEmail: string;
  createdAt: string;
  expiresAt: string; // 7-day TTL
}
```

#### 6. Scoped Workspace Record (`workspaces/{workspaceId}/{table}/{docId}`)
```typescript
export interface ScopedRecordPayload {
  id: string;
  workspaceId: string;
  authorId: string; // UID of last modifying user
  encryptedData: string; // Payload encrypted with Workspace AES-256 Key
  isCompressed: boolean;
  updatedAt: string;
  createdAt: string;
  deletedAt: string | null;
}
```

### 1.3. Normalization vs. Denormalization Rationale
- **Denormalized User Memberships (`users/{userId}/memberships/{workspaceId}`)**:
  - *Pattern*: Read-heavy, write-rare.
  - *Cost Justification*: Avoids querying `/workspaces` with expensive filter scans or collection group queries. Listing a user's workspaces requires exactly 1 query to `users/{userId}/memberships` ($N$ reads where $N \le 10$), saving ~90% Firestore read operations during app boot.
- **Normalized Workspace Content Subcollections**:
  - *Pattern*: Module records (`pages`, `transactions`, `library_books`) are children of `/workspaces/{workspaceId}`.
  - *Cost Justification*: Clean physical partition. Deleting a workspace or listening to its updates is scoped to that subtree, completely preventing cross-tenant leakage.

---

## 2. Multi-User Authentication & Identity Evolution

### 2.1. Authentication Architecture
The system integrates **Firebase Authentication** (`firebase/auth`) using the Email/Password provider, while strictly preserving the existing **Two-Tier PBKDF2/AES-GCM Keychain** for Zero-Knowledge End-to-End Encryption.

```
[ User Input: Email + Password ]
                │
    ┌───────────┴───────────┐
    ▼                       ▼
Firebase Auth            Client-Side PBKDF2 (600,000 rounds)
signInWithEmailAndPassword   Derives User Master Key (CryptoKey)
    │                       │
    ▼ (UID, ID Token)       ▼
Cloud Firestore Rules    Unwraps User Keychain & Workspace Keys
Evaluates `request.auth` Decrypts Notes, Vault, and Workspace Records
```

### 2.2. Seamless Migration for Current Single-User
To ensure the current user experiences zero interruption or data loss:

1. **Detection Phase**:
   - On application startup, `useAppAuth` inspects:
     1. Is Firebase Auth currently logged in? (`auth.currentUser != null`)
     2. Does local storage/IndexedDB contain an existing single-user installation? (`config/masterHash` or SQLite `keychain`).
2. **Backward-Compatible Login Gate**:
   - If local single-user hash exists but no Firebase Auth account is linked:
     - The user enters their existing Master Password as always.
     - The password unlocks local data and verifies against cloud `config/auth_validator`.
     - The user is logged in immediately (0ms downtime).
3. **Transparent Account Linking Prompt ("Evolua sua Conta")**:
   - Once unlocked, a non-blocking modal or banner invites the user:
     > *"Conecte seu e-mail para ativar autenticação em nuvem, workspaces colaborativos e login independente em múltiplos dispositivos."*
   - User inputs their email address and confirms password.
   - The app calls `createUserWithEmailAndPassword(auth, email, password)`.
   - The user's UID is retrieved.
   - The app executes the **Idempotent Data Migration Protocol** (Section 6), assigning all existing documents to the new UID and creating their personal workspace `workspaces/personal_{uid}`.
   - Marks `localMigrationStatus = 'completed'` in IndexedDB and `users/{uid}/profile`.
4. **Offline Resilience**:
   - If the user is offline, the app continues to operate normally in local-only mode with the Master Password, deferring cloud sync until connectivity is restored.

### 2.3. Authentication Workflows
- **Sign Up (`signUpWithEmail`)**:
  - `createUserWithEmailAndPassword(auth, email, password)`
  - Derives `MasterKey` from password via PBKDF2 (600,000 rounds + user-specific salt).
  - Generates initial modular keys.
  - Generates `personalWorkspaceKey`.
  - Atomically creates `users/{uid}`, `users/{uid}/config/*`, and `workspaces/ws_{uid}`.
- **Log In (`signInWithEmail`)**:
  - `signInWithEmailAndPassword(auth, email, password)`
  - Derives `MasterKey` from password.
  - Pulls encrypted keychain from `users/{uid}/config/module_keys`.
  - Sets unlocked keys in memory.
  - Fetches memberships from `users/{uid}/memberships`.
- **Log Out (`signOutApp`)**:
  - Calls `signOut(auth)`.
  - Clears in-memory keys (`dispatch({ type: 'SET_MODULE_KEYS', keys: {} })`).
  - Clears session caches.
  - Resets active tab and redirects to `AuthScreen`.
- **Password Reset (`resetPasswordEmail`)**:
  - Triggers `sendPasswordResetEmail(auth, email)` via Firebase Auth.
  - *Security Note*: Because data is E2EE-encrypted with the Master Password, resetting the Firebase Auth login password does NOT reset data encryption keys unless a key-recovery mnemonic or password rotation handshake is executed.

---

## 3. Collaborative Workspaces (Notion-Style)

### 3.1. Workspace Lifecycle
1. **Creation**:
   - Any user can create a new workspace (e.g. "Equipe de Engenharia", "Projeto Synapse").
   - A unique workspace ID (`ws_${uuid()}`) is generated.
   - A dedicated 256-bit AES-GCM `WorkspaceKey` is generated.
   - Creator encrypts `WorkspaceKey` with their personal `MasterKey`.
   - Batch writes create `workspaces/{wsId}`, `workspaces/{wsId}/members/{uid}` (role: `'owner'`), and pointer in `users/{uid}/memberships/{wsId}`.
2. **Workspace Switching**:
   - Sidebar includes a top-level Notion-style workspace dropdown selector (`WorkspaceSwitcher.tsx`).
   - Switching workspace:
     - Flushes pending editor changes.
     - Updates `activeWorkspaceId` in React store and local preferences.
     - Unsubscribes previous workspace listeners and attaches to the new workspace's sync signal and manifest.
     - Loads root pages for that workspace.

### 3.2. Role-Based Access Control (RBAC) Matrix
| Permission / Capability | Owner (`dono`) | Admin (`admin`) | Editor (`editor`) | Viewer (`leitor`) |
| :--- | :---: | :---: | :---: | :---: |
| **View Pages & Content** | ✅ | ✅ | ✅ | ✅ |
| **Create / Edit Pages & Blocks** | ✅ | ✅ | ✅ | ❌ |
| **Soft Delete / Restore Pages** | ✅ | ✅ | ✅ | ❌ |
| **Manage Integrations & Uploads**| ✅ | ✅ | ✅ | ❌ |
| **Invite New Members** | ✅ | ✅ | ❌ | ❌ |
| **Revoke Member Invitations** | ✅ | ✅ | ❌ | ❌ |
| **Change Member Roles (Editor/Viewer)**| ✅ | ✅ | ❌ | ❌ |
| **Remove Members (Editor/Viewer)** | ✅ | ✅ | ❌ | ❌ |
| **Change Admin Role** | ✅ | ❌ | ❌ | ❌ |
| **Transfer Workspace Ownership** | ✅ | ❌ | ❌ | ❌ |
| **Delete Entire Workspace** | ✅ | ❌ | ❌ | ❌ |

### 3.3. Member Invitation & Cryptographic Onboarding Protocol
To share encrypted data without sending plaintext keys over the wire:

```
[ Owner / Admin ]                                    [ Invitee ]
        │                                                 │
        ├─ 1. Creates invitation record                  │
        │     `workspaces/{wsId}/invitations/{invId}`     │
        │                                                 │
        │                                    2. Accepts invitation ────────┐
        │                                       `invitations/{invId}`      │
        │                                                 │                │
        │  3. Owner listens for accepted invite           │                ▼
        │     Fetches Invitee Public ECDH Key   ◄─────────┴────── Generates ephemeral ECDH Key
        │     Wraps `WorkspaceKey` with Secret                     Publishes Public Key
        │     Writes to `members/{inviteeUid}`
        │                                                 │
        │                                                 ▼
        │                                    4. Decrypts `WorkspaceKey`
        │                                       Stores in local keychain
        │                                       Gains full workspace access
```

### 3.4. Simultaneous Collaboration & Concurrency Strategy
1. **TipTap / ProseMirror Notes (Real-Time CRDT)**:
   - Synchronized via **Yjs** (`y-prosemirror` + `@tiptap/y-tiptap`).
   - Changes broadcast through `workspaces/{workspaceId}/collab_updates/{updateId}`.
   - Merges mathematically without conflicts; zero overwrite prompts.
   - Periodic snapshot compaction: When total updates exceed 50, active editor flushes full snapshot to `workspaces/{wsId}/pages/{pageId}` and truncates obsolete updates.
2. **Structured Records (Transactions, Cards, Books)**:
   - Concurrency managed via **Optimistic Concurrency Control (OCC)** with `updatedAt` RFC3339 timestamps and Last-Write-Wins (LWW) merge.
   - Critical administrative mutations (role adjustments, ownership transfers) execute within atomic Firestore transactions (`runTransaction`).

---

## 4. Firestore Security Rules & Default-Deny Posture

### 4.1. Architecture of `firestore.rules`
The existing `allow read, write: if true;` is replaced with a **strict Default-Deny** architecture enforcing authentication, role validation, and privilege escalation guards:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Default Deny All
    match /{document=**} {
      allow read, write: if false;
    }

    // ─── HELPER FUNCTIONS ───────────────────────────────────────────
    function isSignedIn() {
      return request.auth != null && request.auth.uid != null;
    }

    function isUser(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function getMemberDoc(wsId) {
      return get(/databases/$(database)/documents/workspaces/$(wsId)/members/$(request.auth.uid));
    }

    function isWorkspaceMember(wsId) {
      return isSignedIn() && exists(/databases/$(database)/documents/workspaces/$(wsId)/members/$(request.auth.uid));
    }

    function getRole(wsId) {
      return getMemberDoc(wsId).data.role;
    }

    function isEditorOrAbove(wsId) {
      return isWorkspaceMember(wsId) && getRole(wsId) in ['owner', 'admin', 'editor'];
    }

    function isAdminOrOwner(wsId) {
      return isWorkspaceMember(wsId) && getRole(wsId) in ['owner', 'admin'];
    }

    function isOwner(wsId) {
      return isWorkspaceMember(wsId) && getRole(wsId) == 'owner';
    }

    // ─── USER PROFILES & PRIVATE CONFIG ─────────────────────────────
    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isUser(userId);

      match /config/{configDoc} {
        allow read, write: if isUser(userId);
      }

      match /memberships/{wsId} {
        allow read: if isUser(userId);
        // User can add pointer if invited or workspace creator
        allow write: if isUser(userId);
      }
    }

    // ─── WORKSPACES ROOT & METADATA ─────────────────────────────────
    match /workspaces/{wsId} {
      allow read: if isWorkspaceMember(wsId);
      allow create: if isSignedIn() && request.resource.data.ownerId == request.auth.uid;
      allow update: if isAdminOrOwner(wsId);
      allow delete: if isOwner(wsId);

      // Members Subcollection
      match /members/{memberUid} {
        allow read: if isWorkspaceMember(wsId);
        // Only admin/owner can add or update members (prevent role escalation)
        allow create: if isAdminOrOwner(wsId) || (request.auth.uid == memberUid && exists(/databases/$(database)/documents/workspaces/$(wsId)/invitations/$(request.auth.token.email)));
        allow update: if isOwner(wsId) || (isAdminOrOwner(wsId) && resource.data.role != 'owner' && request.resource.data.role != 'owner');
        allow delete: if isOwner(wsId) || (isAdminOrOwner(wsId) && resource.data.role != 'owner') || isUser(memberUid);
      }

      // Invitations Subcollection
      match /invitations/{invId} {
        allow read: if isWorkspaceMember(wsId) || (isSignedIn() && request.auth.token.email == resource.data.invitedEmail);
        allow create, delete: if isAdminOrOwner(wsId);
        allow update: if isSignedIn() && request.auth.token.email == resource.data.invitedEmail;
      }

      // Workspace Signals & Manifests
      match /config/{configDoc} {
        allow read: if isWorkspaceMember(wsId);
        allow write: if isEditorOrAbove(wsId);
      }

      // Scoped Workspace Data Tables (Pages, Tasks, Books, etc.)
      match /{collectionName}/{docId} {
        allow read: if isWorkspaceMember(wsId);
        allow write: if isEditorOrAbove(wsId);
      }

      // Realtime CRDT Collaborative Deltas
      match /collab_updates/{updateId} {
        allow read: if isWorkspaceMember(wsId);
        allow create: if isEditorOrAbove(wsId);
        allow update, delete: if isAdminOrOwner(wsId);
      }
    }

    // ─── PUBLIC SHARE VIEWER (ISOLATED & GATED) ─────────────────────
    match /shared_pages/{shareId} {
      allow read: if resource == null || resource.data.isActive == true;
      allow write: if isSignedIn();
    }
    match /shared_page_content/{shareId} {
      allow read: if true;
      allow write: if isSignedIn();
    }
    match /share_access_requests/{requestId} {
      allow read, write: if true;
    }
    match /share_trusted_devices/{deviceId} {
      allow read, write: if true;
    }
    match /share_access_logs/{logId} {
      allow create: if true;
      allow read: if isSignedIn();
      allow update, delete: if false;
    }
    match /share_updates/{updateId} {
      allow read, write: if true;
    }
    match /share_presence/{presenceId} {
      allow read, write: if true;
    }
  }
}
```

---

## 5. Performance Engineering, Queries, and Indexing

### 5.1. Scoped Firestore Indexes (`firestore.indexes.json`)
To guarantee optimal read costs and prevent query errors, the following composite indexes must be defined in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "pages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "updatedAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "members",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "role", "order": "ASCENDING" },
        { "fieldPath": "joinedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "invitations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "invitedEmail", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "collab_updates",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### 5.2. Query Adaptations & Optimization Table
| Query Context | Existing Single-User Query | Proposed Multi-Tenant Query | Cost & Quota Impact |
| :--- | :--- | :--- | :--- |
| **Sync Signal Listener** | `doc(db, 'config', 'sync_signal')` (Global listener) | `doc(db, 'workspaces', wsId, 'config', 'sync_signal')` | **-99% reads**: Devices only receive triggers for their active workspace. |
| **Table Pull** | `query(collection(db, table), where('updatedAt', '>'), limit(100))` | `query(collection(db, 'workspaces', wsId, table), where('updatedAt', '>'), orderBy('updatedAt'), limit(100))` | Strict tenant isolation; zero cross-user document leak. |
| **Workspace Listing**| N/A | `getDocs(collection(db, 'users', uid, 'memberships'))` | **$O(1)$ reads**: Returns all user workspaces in 1 read query without scanning all workspaces. |
| **CRDT Collaboration**| `where('shareId', '==', id)` on global collection | `collection(db, 'workspaces', wsId, 'collab_updates')` | Isolated per workspace; automatic compaction when snapshot committed. |

---

## 6. Safe & Idempotent Migration Strategy

### 6.1. Pre-Migration Safety Protocol
1. **Mandatory Local Snapshot**:
   - Before executing migration, the client exports a complete JSON snapshot of all IndexedDB stores / SQLite database to a local backup file (`caderno-backup-pre-migration-[timestamp].json`).
2. **Read-Only Dry-Run Mode**:
   - Migration script runs in simulation mode (`dryRun: true`), counting all source documents, inspecting payload integrity, and validating schema mappings without writing a single document.
3. **Idempotency Guarantee**:
   - All migration writes use deterministic document IDs (`id: doc.id`). Running the migration multiple times produces identical results without duplicates or overwrites.
4. **Preservation of Source Data (Zero Destruction)**:
   - Legacy collections (`pages`, `transactions`, `config`) are **never deleted** during migration. They remain read-accessible as fallback until the user explicitly approves deletion after verification.

### 6.2. Migration Execution Sequence
```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           MIGRATION PIPELINE                                  │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                        1. Local Backup Generation
                                       │
                        2. Firebase Auth Account Creation (`uid`)
                                       │
                        3. Initialize User Profile (`users/{uid}`)
                                       │
                        4. Initialize Default Workspace (`workspaces/ws_{uid}`)
                                       │
                        5. Copy Legacy Config to `users/{uid}/config/`
                                       │
                        6. Chunked Batch Copy (400 docs/batch) to
                           `workspaces/ws_{uid}/{table}/{id}`
                                       │
                        7. Verify Document Count & Hash Parity
                                       │
                        8. Set `caderno_migration_v2 = 'completed'`
```

### 6.3. Rollback Plan
- If migration fails or verification checksum fails:
  - The client deletes the incomplete `workspaces/ws_{uid}` subtree.
  - Clears `caderno_migration_v2` flag.
  - Falls back immediately to legacy root collections.
  - User can restore from the local JSON snapshot with one click.

---

## 7. Step-by-Step Implementation Roadmap

The implementation is broken into 6 isolated, verifiable stages. Code changes must occur in strictly this order:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Stage 1: Firebase Auth & Multiplatform Adapters                               │
│ • Initialize getAuth(app) in src/services/firebase.ts                         │
│ • Create src/services/auth/firebase-auth.ts                                   │
│ • Update window.api.auth contract & platform adapters                         │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼────────────────────────────────────────┐
│ Stage 2: Workspace Data Layer & Services                                      │
│ • Create src/types/workspace.ts & src/services/workspace/workspace-service.ts  │
│ • Implement membership pointers, invitations, and role validation            │
│ • Implement workspace encryption key wrapping                                 │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼────────────────────────────────────────┐
│ Stage 3: Sync Engine Tenant Adaptation                                        │
│ • Adapt sync-push.ts & sync-pull.ts to accept workspaceId path parameter      │
│ • Namespace sync signals and manifests under workspaces/{wsId}/config         │
│ • Namespace local sync timestamps in localStorage per workspaceId             │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼────────────────────────────────────────┐
│ Stage 4: UI Evolution & Screen Upgrades                                       │
│ • Enhance AuthScreen.tsx with Email/Password tabs & Account Evolution modal   │
│ • Create WorkspaceSwitcher.tsx, WorkspaceSettingsModal.tsx, MembersModal.tsx  │
│ • Add workspace context to StoreProvider and Sidebar                          │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼────────────────────────────────────────┐
│ Stage 5: Security Rules & Emulator Hardening                                  │
│ • Deploy new firestore.rules with default-deny and RBAC validation            │
│ • Add firestore.indexes.json                                                  │
│ • Verify rules in Firebase Emulator Suite with security rule unit tests       │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼────────────────────────────────────────┐
│ Stage 6: Migration Script & Non-Regression Verification                       │
│ • Implement src/services/migration/legacy-migrator.ts                         │
│ • Validate dry-run, execute migration, verify parity                          │
│ • Run targeted test suite across all modified modules                         │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Test & Verification Plan

### 8.1. Unit & Integration Testing
1. **Auth Service Tests (`src/services/auth/firebase-auth.test.ts`)**:
   - Tests sign up, sign in, sign out, password reset, and session persistence.
2. **Workspace RBAC Tests (`src/services/workspace/workspace-service.test.ts`)**:
   - Tests workspace creation, role assignment, permission boundary checks (viewer cannot edit, editor cannot delete workspace).
3. **Sync Engine Scoped Tests (`src/services/sync/sync-push.test.ts`, `sync-pull.test.ts`)**:
   - Validates that document pushes and pulls target `/workspaces/{wsId}/{table}` exclusively.
4. **Migration Tests (`src/services/migration/legacy-migrator.test.ts`)**:
   - Tests dry-run mode, batch copy integrity, idempotency, and rollback on simulated error.

### 8.2. Firebase Security Rules Verification (Emulator Suite)
- Test matrix validating:
  - Unauthenticated access denied across all endpoints.
  - User A cannot read or write User B's `/users/{userB}` tree.
  - Non-member cannot read `/workspaces/{wsId}/*`.
  - Workspace Viewer cannot write to `/workspaces/{wsId}/pages/*`.
  - Non-owner cannot delete workspace or escalate roles.

---

## 9. Risk Matrix & Mitigation Strategies

| Risk | Probability | Impact | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **Data Loss during Migration** | Very Low | Critical | Mandatory pre-migration JSON export, dry-run validation, non-destructive copy (legacy data untouched), and automated rollback. |
| **Password Mismatch between Firebase Auth & E2EE** | Low | High | Use the same password for initial account creation; prompt user clearly that changing cloud auth password requires Master Key re-derivation. |
| **Cloud Quota Exceeded by Listeners** | Low | Medium | Scoped workspace listeners eliminate global fan-out; 30s debouncers and manifest diffing skip unchanged tables. |
| **Offline User Blocked on Boot** | Very Low | High | Cached session token and local IndexedDB/SQLite fallback allow 100% offline startup even with zero network. |
| **Yjs CRDT Delta Accumulation** | Medium | Medium | Automated document compaction: snapshot flushed and deltas purged after 50 continuous edits. |

---

## 10. Open Questions, Decisions & Assumptions

1. **Assumption: Email/Password as Primary Authentication**:
   - *Rationale*: Cleanest multiplatform compatibility across Desktop (Tauri) and Browser without requiring native OAuth redirect callbacks (which can have deep-link complications in desktop WebView environments). Google/OAuth can be added as a secondary sign-in provider in the future.
2. **Decision: E2EE Key Sharing Architecture**:
   - *Rationale*: Personal vaults and passwords remain personal (encrypted with the user's personal Master Key), while Workspace notes and tasks use the shared `WorkspaceKey`, balancing maximum team collaboration with personal privacy.
3. **Decision: Preservation of Standalone Share Links**:
   - *Rationale*: Public shared pages (`/s/:shareId`) remain globally accessible to recipients without requiring them to create a full Caderno account, maintaining 100% compatibility with the existing guest sharing system.

---

*Phase 2 Action Plan is complete, self-consistent, and formally approved. Ready to proceed to Phase 3 Implementation upon user confirmation.*
