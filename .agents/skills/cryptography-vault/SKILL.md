---
name: cryptography-vault
description: >-
  Canonical reference for Synapse's cryptographic design and current client flows:
  Two-Tier Keychain, PBKDF2/AES-GCM key derivation, ENC1 media streaming,
  cloud-account key migration, and legacy native credential lifecycle. Activate when
  implementing, auditing, or modifying any cryptographic operation or vault flow.
---

# Cryptography, Vault, and Encrypted Media

> Activate when implementing, auditing, refactoring, or querying any cryptographic
> operations, Vault management, Keychain storage, E2EE sync, or encrypted media
> pipelines.

---

## Client Coverage and Boundary

The three product clients are React Web/Tauri, Desktop Qt, and native Android Compose. React Web and its Tauri wrapper share the React UI but use different platform adapters. Qt uses QML/C++ and `bridge-qt`; Android uses Compose/ViewModels and UniFFI. The Expo WebView shell reuses React and owns shell integration only. Treat encryption as implementation-specific: Qt's legacy local credential and React/Tauri account-key flow are distinct; Android does not have an equivalent account keychain flow. Read the coverage guide before assuming a flow is shared or claiming parity.

## Implementation Coverage Is Tracked Separately

This skill defines the required security posture and wire formats; it is not evidence that every application module currently meets them. Before claiming complete E2EE, read [`docs/security/encryption-coverage.md`](../../../docs/security/encryption-coverage.md) and verify its open gates against the code. Keep the specification and the implementation status separate, and update the coverage guide when protection changes.

---

## 1. Security Posture and Implementation Boundaries

This skill specifies required cryptographic behavior; it is not proof that every
application, database field, or sync path implements it. The current verified
coverage and open gaps are recorded in [`docs/security/encryption-coverage.md`](../../../docs/security/encryption-coverage.md).

1. **Encrypt at the boundary** — Encrypt sensitive content before it enters a
   remote sync or storage path. Verify each concrete path before making a claim
   about all cloud data or all modules.
2. **Client-specific local vaults** — React Web/Tauri use the Firebase account
   password as the input to their existing local encryption-root derivation. Qt
   still uses its separate local vault credential. Native Android has no account
   keychain flow. Selected data remains encrypted; several business tables,
   metadata, and assets outside managed folders remain plaintext.
3. **Defense in depth** — Use separate module keys where the keychain defines
   them, AES-GCM envelopes, strict failure handling, bounded media paths, and
   lock-time cleanup. Diagrams currently use the notes key; there is no dedicated
   diagram key column in the current keychain schema.

---

## 2. Two-Tier Key Hierarchy (Keychain Architecture)

React Web/Tauri and Qt implement a **Two-Tier Envelope Key System** with different credential flows. React Web/Tauri use the authenticated Firebase account password as the local key-derivation input; Qt retains its independent local credential until a separate verified migration. Native Android does not have a completed equivalent account keychain flow. Firebase receives neither the derived root key nor module keys:

```
[ Account Password (React/Tauri) or Legacy Local Credential (Qt) ]
          │
          ▼ PBKDF2-HMAC-SHA256 (600,000 iterations)
   [ Encryption Root Key (256-bit) ]
          │
          ▼ AES-256-GCM (Unwraps keychain table)
┌─────────────────────────────────────────────────────────────────┐
│                    SQLite `keychain` Table                       │
├─────────────────┬─────────────────┬──────────────┬──────────────┤
│ library_key_enc │ finance_key_enc │ notes_key_enc│ culture_key_enc│
├─────────────────┼─────────────────┼──────────────┼──────────────┤
│ anki_key_enc    │ focus_key_enc    │ files_key_enc│ vault_key_enc │
├─────────────────┼─────────────────┼──────────────┼──────────────┤
│ calendar_key_enc│ practice_key_enc │ core_key_enc │              │
└─────────────────┴─────────────────┴──────────────┴──────────────┘
          │
          ▼ Decrypted into the client-specific in-memory key store
   [ Module AES-256 Keys ] (notes, vault, files, etc.)
          │
          ▼ AES-256-GCM (Encrypts/Decrypts entity content)
  [ `encrypted_content`, `.enc` Drive Files, Encrypted Streams ]
```

### 2.1. Master Key Derivation

| Parameter          | Value                              |
| :----------------- | :--------------------------------- |
| **Algorithm**      | PBKDF2 with HMAC-SHA256            |
| **Iterations**     | 600,000 rounds (NIST SP 800-132)   |
| **Local Desktop Salt** | Fixed compatibility salt in the Rust bridge |
| **Web / Cloud Salt** | Existing Web salt in `apps/web-react/src/services/crypto.ts`; remains compatibility-bound |

The fixed local salt is a known limitation, not a per-vault random salt. A
versioned salt migration remains open; do not describe this as unique-salt
hardening. Check the encryption coverage guide for current compatibility behavior.

### 2.2. Module Key Generation & Storage

- Each module has an independent, cryptographically random 256-bit key
  (`generate_module_key()`), generated via `rand::thread_rng().fill_bytes(&mut key)`.
- Encrypted with the Master Key using AES-256-GCM, stored in the `keychain` table
  using the format: `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`.
- In-memory state: When unlocked, keys reside inside
  `DbState.keys: Mutex<Option<UnlockedKeys>>` in Rust memory and are cleared on lock.

---

## 3. Client-Specific Cryptographic Implementations

### 3.1. Desktop Backend — Rust (`apps/web-react/src-tauri/src/crypto.rs`)

- **Dependencies**: `aes-gcm 0.10`, `pbkdf2 0.12`, `sha2 0.10`, `rand 0.8`.
- **Payload Format**: `format!("{}:{}:{}", iv_hex, auth_tag_hex, encrypted_hex)`.
  - `iv_hex`: 12 bytes (or 16 bytes for module keys) hex-encoded.
  - `auth_tag_hex`: 16 bytes GCM authentication tag.
  - `encrypted_hex`: Ciphertext hex-encoded.

```rust
pub fn encrypt_content(key_hex: &str, plaintext: &str) -> Result<String, String>;
pub fn decrypt_content(key_hex: &str, encrypted_payload: &str) -> Result<String, String>;
```

### 3.2. Web Frontend — TypeScript (`apps/web-react/src/services/crypto.ts`)

- **Engine**: Native Web Crypto API (`window.crypto.subtle`).
- **Payload Format**: Combined binary buffer `[12-byte IV | Ciphertext + Tag]`,
  serialized to Base64.

```typescript
export async function deriveMasterKey(password: string, customSalt?: Uint8Array | string): Promise<CryptoKey>;
export async function encryptText(text: string, masterKey: CryptoKey): Promise<string>;
export async function decryptText(encryptedBase64: string, masterKey: CryptoKey): Promise<string>;
export async function encryptFile(buffer: ArrayBuffer, masterKey: CryptoKey): Promise<ArrayBuffer>;
export async function decryptFile(encryptedBuffer: ArrayBuffer, masterKey: CryptoKey): Promise<ArrayBuffer>;
```

### 3.2.1. Encrypted Firebase Sync Rows

- Sync payloads are encrypted with the row's module key before Firestore writes.
  The current implementation is in `apps/web-react/src/services/sync/`.
- Large JSON rows are gzip-compressed. If the compressed Base64 payload still
  exceeds the parent document budget, the client splits it into independently
  AES-GCM-encrypted chunks under the row's `chunks` subcollection.
- Each encrypted chunk envelope binds the format version, table, encoded parent
  document ID, chunk-set ID, sequence index, and total chunk count. Decryption
  must validate all fields, require a complete ordered set, then decompress and
  parse the reconstructed payload. Do not trust parent metadata without checking
  the authenticated chunk envelopes.
- Chunk documents contain ciphertext and structural routing metadata only. The
  parent pointer is committed after all chunks are written; access rules must
  keep chunk reads and writes within the same authenticated user or workspace
  role as the parent sync document.
- Read the current limits from `sync-chunked-payload.ts` and `sync-payload.ts`;
  never copy old byte limits into new code. A partial chunk write must not
  advance the row checkpoint or replace the parent pointer.
- Keep legacy-key fallback only while old documents require it. Re-encrypt with
  the module key after a successful decrypt, and preserve the source document
  until the new parent and complete chunk set are verified.

### 3.3. Native Desktop Qt 6 & Rust FFI (`bridges/bridge-qt/`, `apps/desktop-qt/src/synapse_controller.*`)

- **Engine**: Rust FFI C-ABI bridge linked directly with Qt 6 C++ backend.
- **Payload Format**: Identical to Tauri Rust backend: `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`.
- **C-ABI Exports (`bridges/bridge-qt/src/lib.rs`)**:
  - `synapse_crypto_derive_master_key(password, out_key_32)`: PBKDF2-HMAC-SHA256 (600,000 rounds, salt `b"caderno-keychain-salt"`).
  - `synapse_crypto_hash_password_v2(password)`: versioned auth verifier derived from the PBKDF2 master key. `synapse_crypto_hash_password` remains a legacy SHA-256 verifier reader/writer only for migration compatibility.
  - `synapse_crypto_generate_module_key()`: 32 random bytes hex.
  - `synapse_crypto_encrypt_module_key` & `synapse_crypto_decrypt_module_key`: AES-256-GCM (16-byte nonce) for Keychain envelope wrapping.
  - `synapse_crypto_encrypt_content` & `synapse_crypto_decrypt_content`: AES-256-GCM (12-byte nonce) for pages, history revisions, and vault items.
  - `synapse_crypto_wipe_memory(buffer, len)`: Zeroizes key material in memory immediately after usage.
- **Controller & Lifecycle (`SynapseDataController`)**:
  - Transparent on-the-fly decryption for `getPage`, `getPageHistory`, and `getVaultItems`.
  - Zero-plaintext residual guarantee: when saving in encrypted mode, `content` is wiped to `""` and ciphertext stored exclusively in `encrypted_content`.
  - Local credential setup/change/removal with envelope rewrap; this Qt-only flow has not been migrated to Firebase account authentication.
  - Auto-lock timer and memory wipe on lock and application shutdown.

---

### 3.4. Native Android Compose

Native Android has no completed account-key/keychain or Vault persistence flow. Keep Vault non-persistent until an audited Android key lifecycle and typed encrypted Core/UniFFI operations exist. Never pass plaintext credentials to Core CRUD or claim account-key migration, sync, or complete at-rest encryption for Android. Follow [`apps/mobile-android/AGENTS.md`](../../../apps/mobile-android/AGENTS.md) and the encryption coverage guide before changing this boundary. The Android WebView shell uses the React client flow and is not evidence of native Android coverage.

## 4. Entity-Level Encryption Matrix

| Entity                | Plaintext Column          | Encrypted Column / Storage              | Module Key   |
| :-------------------- | :------------------------ | :-------------------------------------- | :----------- |
| **Notes / Pages**     | `pages.content`           | `pages.encrypted_content`               | `notes_key`  |
| **Page Revisions**    | `page_history.content`    | `page_history.encrypted_content`        | `notes_key`  |
| **Diagrams**          | `diagrams.content`        | `diagrams.encrypted_content`            | `diagrams_key` |
| **Password Vault**    | `NULL`                    | `vault_items` (field-by-field)          | `vault_key`  |
| **Drive Photos**      | Local cache               | Drive file `<name>.enc`                 | `masterKey`  |
| **Video Attachments** | Local file                | Chunked AES-GCM `<video>.enc`          | `masterKey`  |
| **Video Subtitles**   | `local_subtitle_path`     | Drive file `<sub>.vtt.enc`              | `masterKey`  |
| **OAuth Tokens**      | Local storage             | Encrypted with `masterKey` if set       | `masterKey`  |

---

## 5. Streaming Encrypted Media Protocol

To support 4K/60fps video playback without loading hundreds of megabytes into RAM:

1. **Custom Protocol (`protocol_encrypted.rs`)** — Registers `encrypted://localhost`
   (Unix) and `http://encrypted.localhost` (Windows). Intercepts video
   `<video src="encrypted://...">` requests from the WebView.
2. **HTTP 206 Partial Content** — Parses incoming `Range: bytes=start-end` headers,
   calculates the exact AES-GCM chunk boundaries corresponding to the requested
   byte range, and decrypts only the requested chunks on-the-fly using
   `crypto_stream.rs`, serving partial video streams with near-zero latency.

---

## 6. Inviolable Security Rules

> [!CAUTION]
> 1. **Zero IV / Nonce Reuse** — NEVER reuse an Initialization Vector under the same
>    key. In AES-GCM, IV reuse destroys the authenticity guarantee and enables key
>    recovery. Always generate fresh IVs via `rand::thread_rng().fill_bytes()` or
>    `crypto.getRandomValues(new Uint8Array(12))`.
> 2. **Zero Plaintext Residuals in Encrypted Mode** — When `keys.notes` is present,
>    `pages.content` MUST be set to `""` in the database, with ciphertext exclusively
>    in `encrypted_content`.
> 3. **Parameterized SQL Only** — All queries interacting with encrypted data must use
>    `params![]` / `?` bindings. Never use string interpolation.
> 4. **Path Traversal Containment** — Any decrypted local file path served by
>    `protocol_encrypted.rs` must verify
>    `path.canonicalize()?.starts_with(&app_videos_dir)`.

### Prohibited Anti-Patterns

- **NO plaintext passwords in SQLite** — Store only a versioned verifier. The Qt legacy SHA-256 verifier remains compatibility code and must not be used as the React/Tauri account unlock check.
- **NO static IVs** — Hardcoded `[0u8; 12]` is strictly prohibited.
- **NO ciphertexts in logs** — Never log `encrypted_payload` or raw keys.
- **NO unhandled decryption failures** — Return `Result<T, DecryptionError>` and
  present a locked-state UX rather than panicking.

---

## 7. Key-Envelope Credential Migration

### React Web and Tauri account migration

1. Authenticate the user with Firebase Authentication before accessing cloud configuration.
2. Derive the existing Web encryption root from the account password; never upload that key or plaintext module keys.
3. Verify and decrypt only the user's `auth_validator` and `module_keys` configuration documents.
4. If envelopes use a previous credential, require it only when the current account credential cannot open the envelope. Compare all overlapping module keys before rewrapping.
5. Rewrap both cloud configuration documents in one Firestore transaction and the local keychain in one IndexedDB or SQLite transaction. Keep the previous source intact if any verification or write fails.
6. Reopen the saved local keychain with the account credential before entering the app. Make retries safe when cloud and local commits finish at different times.

See [`docs/security/cloud-account-encryption-migration.md`](../../../docs/security/cloud-account-encryption-migration.md) for client coverage, the remaining native gaps, and legacy deletion gates.

### Qt legacy local credential change

1. **Derive Current Root Key**: `PBKDF2(previous_credential, salt, 600000)`.
2. **Verify and Recover Module Keys**: Decrypt each current `*_key_enc` envelope.
3. **Rewrap for the New Local Credential**: Re-encrypt the same module keys with fresh IVs.
4. **Update the Versioned Verifier** in the same SQLite transaction.
5. **Zero Temporary Key Material** immediately after use.

> [!CAUTION]
> - Module keys themselves do NOT change — only their wrapping envelope changes. All
>   existing encrypted content remains valid without re-encryption.
> - Implement atomic transaction wrapping (`BEGIN IMMEDIATE` / `COMMIT`) to ensure
>   all-or-nothing consistency in case of crash during re-wrap.
> - Never store both old and new master keys simultaneously in persistent storage.

---

## 8. Implementation File Map

| File | Layer | Responsibility |
| :--- | :---- | :------------- |
| `bridges/bridge-qt/src/lib.rs` | Rust Native Bridge | PBKDF2 (600k rounds), AES-256-GCM, SHA-256, memory wiping C-ABI |
| `apps/desktop-qt/src/synapse_controller.*` | C++ Desktop Controller | Two-Tier Keychain orchestration, on-the-fly encryption/decryption, auto-lock |
| `apps/desktop-qt/src/controllers/vault/vault_setup_controller.cpp` | Qt Desktop Vault | Transactional migration of supported plaintext fields during first-time setup |
| `apps/desktop-qt/src/controllers/vault/vault_setup_assets_controller.cpp` | Qt Desktop Vault | ENC1 staging, managed asset migration, persistent recovery journal, fail-closed unlock recovery |
| `apps/desktop-qt/qml/vault/VaultUnlockScreen.qml` | QML Presentation | Native vault unlock screen |
| `apps/desktop-qt/qml/settings/MasterPasswordModal.qml` | QML Presentation | Setup, change, and remove master password dialogs with strength meter |
| `apps/desktop-qt/qml/vault/PasswordGeneratorModal.qml` | QML Presentation | Interactive entropy-controlled secure password generator |
| `apps/web-react/src-tauri/src/crypto.rs` | Rust Backend | AES-256-GCM encrypt/decrypt, PBKDF2 derivation, module key generation |
| `apps/web-react/src/services/auth/account-vault.ts` | React orchestration | Account sign-in, key reconciliation, and safe legacy-envelope migration |
| `apps/web-react/src/services/sync/sync-auth.ts` | Web infrastructure | Encrypted account-key configuration in Firestore |
| `core/synapse-core/src/db/keychain.rs` | Shared Rust persistence | Transactional Tauri keychain verification and rewrap |
| `apps/web-react/src-tauri/src/crypto_stream.rs` | Rust Backend | Chunked AES-GCM streaming for large files (video) |
| `apps/web-react/src-tauri/src/protocol_encrypted.rs` | Rust Backend | Custom `encrypted://` URI protocol, HTTP 206 partial content |
| `apps/web-react/src-tauri/src/cmd_vault/` | Rust Backend | Tauri vault command modules for vault CRUD and field-level flows |
| `apps/web-react/src-tauri/src/cmd_notes.rs` | Rust Backend | Note content encryption/decryption on read/write |
| `apps/web-react/src/services/crypto.ts` | Web Frontend | Web Crypto API wrappers |
| `apps/web-react/src/services/sync/sync-chunked-payload.ts` | Web Frontend | Authenticated encrypted chunks for oversized Firebase sync rows |
| `apps/web-react/src/services/storage/` | Web Frontend | IndexedDB/Firestore encrypted sync adapters |

---

## 9. Verification Protocol

When adding or modifying encryption code:

1. **Unit Tests**: `npm run test -- src/services/crypto.test.ts` / `cargo test crypto`
2. **Cross-Roundtrip Integrity**: `decrypt(encrypt(text)) === text` for empty strings,
   multi-byte UTF-8, emojis, and large 10MB+ buffers.
3. **Ciphertext Randomness**: Encrypting identical plaintext twice must produce
   different IVs and completely different ciphertexts.
4. **Credential Migration Integrity**: Verify that module keys remain byte-for-byte
   unchanged after the Web/Tauri rewrap and that the previous envelope no longer
   opens. Keep Qt legacy credential tests until its account migration is complete.
