---
name: caderno-cryptography-vault
description: >-
  Comprehensive guide and engineering protocol for Caderno's End-to-End Encryption (E2EE),
  Vault & Keychain architecture, PBKDF2/AES-GCM key derivation, encrypted video streaming,
  and Zero-Knowledge cloud storage.
---

# Skill: Caderno Cryptography, Vault & Zero-Knowledge Security Architecture

Activate this skill when implementing, auditing, refactoring, or querying any cryptographic operations, Vault management, Keychain storage, E2EE sync, or encrypted media pipelines in **Caderno**.

---

## 1. Cryptographic Philosophy & Security Posture

Caderno implements a **Zero-Knowledge, Multiplatform Cryptographic Architecture**:
1. **Client-Side Encryption Only**: Plaintext data and user passwords never leave the local device in unencrypted form. Neither cloud sync (Firebase/Firestore) nor cloud storage (Google Drive) ever receives plaintext files or Master Keys.
2. **Opt-In Local Vault Protection**:
   - By default (no Master Password set), local SQLite stores data in plaintext for high-speed offline desktop access.
   - When a user configures a Master Password / Vault, Caderno transitions into an **encrypted state at rest**, zeroing out plaintext columns and storing AES-256-GCM ciphertexts.
3. **Defense in Depth**: Isolation between modules using independent, dedicated 256-bit AES module keys wrapped inside a central encrypted Keychain.

---

## 2. Two-Tier Key Hierarchy (Keychain Architecture)

Caderno decouples user authentication from data encryption using a **Two-Tier Envelope Key System**:

```
[ User Master Password ]
          │
          ▼ PBKDF2-HMAC-SHA256 (600,000 iterations)
   [ Master Key ]
          │
          ▼ AES-256-GCM (Unwraps keychain table)
┌─────────────────────────────────────────────────────────────────┐
│                    SQLite `keychain` Table                       │
├─────────────────┬─────────────────┬──────────────┬──────────────┤
│ notes_key_enc   │ vault_key_enc   │ files_key_enc│ anki_key_enc │
├─────────────────┼─────────────────┼──────────────┼──────────────┤
│ finance_key_enc │ diagram_key_enc │ core_key_enc │ culture_key  │
└─────────────────┴─────────────────┴──────────────┴──────────────┘
          │
          ▼ Decrypted into in-memory `DbState.keys`
   [ Module AES-256 Keys ] (notes, vault, files, etc.)
          │
          ▼ AES-256-GCM (Encrypts/Decrypts entity content)
  [ `encrypted_content`, `.enc` Drive Files, Encrypted Streams ]
```

### 2.1. Master Key Derivation
- **Algorithm**: PBKDF2 with HMAC-SHA256.
- **Iterations**: `600,000` rounds (NIST SP 800-132 compliant).
- **Domain Salts**:
  - **Desktop Rust (`src-tauri/src/crypto.rs`)**: `b"caderno-keychain-salt"`.
  - **Web / Cloud (`src/services/crypto.ts`)**: `"caderno-e2ee-salt-v1"`.
  - *Rationale*: Distinct salt domains isolate local SQLite Keychain storage from remote cloud sync payloads, preventing cross-domain dictionary replay.

### 2.2. Module Key Generation & Storage
- Each module has an independent, cryptographically random 256-bit key (`generate_module_key()`).
- Generated using `rand::thread_rng().fill_bytes(&mut key)`.
- Encrypted with the Master Key using AES-256-GCM and stored in the `keychain` table:
  - Format: `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`.
- In-memory state: When unlocked, keys reside inside `DbState.keys: Mutex<Option<UnlockedKeys>>` in Rust memory and are cleared on lock.

---

## 3. Dual-Platform Cryptographic Implementations

### 3.1. Desktop Backend (Rust - `src-tauri/src/crypto.rs`)
- **Crate Dependencies**: `aes-gcm = "0.10"`, `pbkdf2 = "0.12"`, `sha2 = "0.10"`, `rand = "0.8"`.
- **Payload Format**: `format!("{}:{}:{}", iv_hex, auth_tag_hex, encrypted_hex)`:
  - `iv_hex`: 12 bytes (or 16 bytes for module keys) hex-encoded.
  - `auth_tag_hex`: 16 bytes GCM authentication tag.
  - `encrypted_hex`: Encrypted ciphertext hex-encoded.
- **Encryption Function**:
  ```rust
  pub fn encrypt_content(key_hex: &str, plaintext: &str) -> Result<String, String>;
  pub fn decrypt_content(key_hex: &str, encrypted_payload: &str) -> Result<String, String>;
  ```

### 3.2. Web & Frontend Client (TypeScript - `src/services/crypto.ts`)
- **Engine**: Native Web Crypto API (`window.crypto.subtle`).
- **Payload Format**: Combined binary buffer `[12-byte IV | Ciphertext + Tag]`, serialized to Base64.
- **Functions**:
  ```typescript
  export async function deriveMasterKey(password: string, customSalt?: Uint8Array | string): Promise<CryptoKey>;
  export async function encryptText(text: string, masterKey: CryptoKey): Promise<string>;
  export async function decryptText(encryptedBase64: string, masterKey: CryptoKey): Promise<string>;
  export async function encryptFile(buffer: ArrayBuffer, masterKey: CryptoKey): Promise<ArrayBuffer>;
  export async function decryptFile(encryptedBuffer: ArrayBuffer, masterKey: CryptoKey): Promise<ArrayBuffer>;
  ```

---

## 4. Entity-Level Protection Matrix

| Entity | Plaintext Column | Encrypted Column / Storage | Module Key | Decryption Flow |
| :--- | :--- | :--- | :--- | :--- |
| **Notes / Pages** | `pages.content` | `pages.encrypted_content` | `notes_key` | On-the-fly in `cmd_notes::notes_get_page_content` |
| **Page Revisions** | `page_history.content` | `page_history.encrypted_content` | `notes_key` | Decrypted on history preview |
| **Diagrams (Excalidraw/TLDraw)** | `diagrams.content` | `diagrams.encrypted_content` | `diagrams_key` | Decrypted in `cmd_diagrams` |
| **Password Vault Items** | `NULL` | `vault_items` (labels, passwords, URLs, notes) | `vault_key` | Field-by-field in `cmd_vault::helpers::decrypt_vault_item` |
| **Google Drive Photos** | Local cache | Drive file `<name>.enc` | `masterKey` | In-memory stream decryption upon download |
| **Video Attachments** | Local file | Chunked AES-GCM `<video>.enc` | `masterKey` | Custom streaming protocol `encrypted://localhost` |
| **Video Subtitles** | `local_subtitle_path` | Drive file `<sub>.vtt.enc` | `masterKey` | Decrypted via `decryptFile` before rendering |
| **OAuth & Cloud Tokens** | Local storage | Encrypted with `masterKey` if set | `masterKey` | Decrypted in memory before API requests |

---

## 5. Streaming Encrypted Media Protocol

To support 4K/60fps video playback without loading hundreds of megabytes into RAM:
1. **Custom Protocol (`protocol_encrypted.rs`)**:
   - Registers `encrypted://localhost` (Unix) and `http://encrypted.localhost` (Windows).
   - Intercepts video `<video src="encrypted://...">` requests from the WebView.
2. **HTTP 206 Partial Content Support**:
   - Parses incoming `Range: bytes=start-end` headers.
   - Calculates the exact AES-GCM chunk boundaries corresponding to the requested byte range.
   - Decrypts only the requested chunks on-the-fly using `crypto_stream.rs`, serving partial video streams with near-zero latency.

---

## 6. Mandatory Engineering Rules & Anti-Patterns

### 6.1. Inviolable Security Rules
> [!CAUTION]
> 1. **Zero IV / Nonce Reuse**:
>    - NEVER reuse an Initialization Vector (IV/Nonce) under the same key.
>    - In AES-GCM, reusing an IV destroys the authenticity guarantee and allows key recovery.
>    - Always generate fresh IVs via `rand::thread_rng().fill_bytes(&mut iv)` or `crypto.getRandomValues(new Uint8Array(12))`.
> 2. **Zero Plaintext Residuals in Encrypted Mode**:
>    - When `keys.notes` is present, `pages.content` MUST be set to `""` in the database, with ciphertext residing exclusively in `encrypted_content`.
> 3. **Parameter Tamper Prevention**:
>    - All SQL queries interacting with encrypted data must use strict parameterized bindings (`params![]`, `?`), never string interpolation.
> 4. **Path Traversal Containment**:
>    - Any decrypted local file path served by `protocol_encrypted.rs` must verify `path.canonicalize()?.starts_with(&app_videos_dir)`.

### 6.2. Strictly Prohibited Anti-Patterns
- **NO Plaintext Passwords in SQLite**: Passwords must never be stored directly. Passwords in `vault_items` must be encrypted with `vault_key`. User master authentication uses `hash_auth_password(password)` with SHA-256 salt or PBKDF2.
- **NO Static IVs**: Hardcoded `[0u8; 12]` IVs are strictly prohibited under all circumstances.
- **NO Leaking Ciphertexts into Logs**: Never log `encrypted_payload` or raw keys in `console.log` or terminal debug statements.
- **NO Decryption Fallback Crashes**: If an encrypted payload fails authentication (`Tag verification failed` or invalid UTF-8), return a typed error (`Result<T, DecryptionError>`) and present a locked-state UX rather than throwing an unhandled panic.

---

## 7. Cryptographic Testing & Verification

When adding or modifying encryption code:
1. **Run Cryptography Unit Tests**:
   - TypeScript: `npx vitest run src/services/crypto.test.ts`
   - Rust: `cargo test --manifest-path src-tauri/Cargo.toml crypto`
2. **Verify Cross-Roundtrip Integrity**:
   - Ensure `decrypt(encrypt(text)) === text` for empty strings, multi-byte UTF-8, emojis, and large 10MB+ buffers.
3. **Verify Ciphertext Randomness**:
   - Encrypting the exact same plaintext twice must produce different IVs and completely different ciphertexts.
