---
name: security-audit
description: >-
  Conducts comprehensive, file-by-file security audits across Tauri backend (Rust)
  and Web frontend (React/TypeScript), identifying injection, sandbox escapes,
  cryptographic flaws, auth breaches, and providing defensive mitigation plans.
---

# Skill: Comprehensive Multiplatform Security Audit & Mitigation Protocol

Activate this skill whenever the user requests a security audit, vulnerability analysis, penetration defense review, data-protection assessment, or cryptographic validation across the **Caderno** application (excluding or including specified target platforms).

---

## 1. Core Objectives & Threat Modeling Scope

Perform an in-depth, file-by-file security analysis across both the Desktop (Tauri v2 / Rust) and Web (React 19 / TypeScript / Vite) application surfaces:

1. **WebView & Sandbox Isolation**: Verify that untrusted content (e.g. web clippings, external URLs, iframes) cannot escape execution boundaries or access native IPC APIs.
2. **Injection Defense**: Identify and prevent OS Command Injection, SQL Injection, CLI Argument Injection, Cross-Site Scripting (XSS), and URI scheme exploits.
3. **Cryptographic & E2EE Integrity**: Audit key derivation functions (PBKDF2/Argon2id), salt randomness, initialization vector (IV) uniqueness, cipher modes (AES-GCM), and memory scrubbing.
4. **Access Control & Multi-Tenant Boundaries**: Validate cloud storage rules (e.g. Firestore Security Rules), local authentication checks, and IPC authorization guardrails.
5. **Path Traversal & Filesystem Confinement**: Ensure all file operations, custom schemes (`encrypted://`), and video stream handlers strictly confine paths to intended application directories.
6. **Data at Rest & Credential Hygiene**: Detect unencrypted secrets (OAuth client secrets, API keys, unencrypted database caches, residual keys in SQLite slack space).
7. **Local Network & IPC Security**: Audit local HTTP servers (Axum/stream), CORS policies, localhost port bindings, and executable binary download integrity.

---

## 2. Seven-Pillar Audit Matrix

### Pillar 1: WebView Isolation & Sandboxing
- **Iframe Sandboxing**: Ensure `allow-scripts` is **never** combined with `allow-same-origin` on iframes rendering user or web content (`srcDoc` or external URLs).
- **Tauri Content Security Policy (CSP)**: Ensure `tauri.conf.json` defines a strict CSP preventing arbitrary remote script execution and unauthorized WebSocket/HTTP connects.
- **Native Permissions & WebKitGTK**: Validate that media, camera, and microphone permissions are not automatically granted without explicit user interaction.

### Pillar 2: Injection Prevention
- **OS Command Injection**: Never invoke shell interpreters (`cmd.exe`, `/bin/sh`) with string concatenation. Use direct process spawning with separate arguments, or use native shell openers (`opener`, `tauri_plugin_shell::open`).
- **CLI Argument Injection**: Always separate flags from user-supplied positional arguments (e.g. passing `--` before URLs or filenames in `yt-dlp` or `ffmpeg`).
- **SQL Injection**: Verify 100% of SQLite database queries use parameterized placeholders (`?`, `params![]`).
- **DOM & Stored XSS**: Guarantee that any HTML rendering (`dangerouslySetInnerHTML`) is strictly filtered through `DOMPurify` with dangerous tags (`<script>`, `<iframe>`, `object`) forbidden.

### Pillar 3: Cryptography & Key Management
- **Key Derivation (KDF)**: Prohibit single-round hashes (`SHA256(password)`) for password authentication. Require high-iteration PBKDF2 (>= 600,000 rounds) or Argon2id with unique, random per-user salts.
- **No Static Cryptographic Salts**: Ensure salts are randomly generated (16+ bytes) per vault and stored alongside encrypted ciphertext, never hardcoded in source code.
- **AES-GCM Nonce / IV Freshness**: Enforce fresh 12-byte cryptographically secure random IVs (`rand::thread_rng()` / `crypto.getRandomValues()`) for every encryption operation to prevent catastrophic Galois/Counter Mode key recovery.
- **Memory Zeroization**: Clear sensitive keys and plaintext passwords from memory where feasible upon lock or completion.

### Pillar 4: Filesystem Confinement & Path Traversal
- **Strict Canonicalization**: All file paths supplied from frontend or URL queries must be canonicalized and checked against allowed root directories (`app_data_dir`, `videos_dir`, `files_dir`) using `path.starts_with(base_dir)`.
- **Absolute Path Check Prohibitions**: Prohibit logic where `path.is_absolute()` allows reading or writing arbitrary files outside the application scope.
- **Custom Protocol Handlers (`encrypted://`)**: Never serve unencrypted arbitrary files over custom protocols based solely on path existence.

### Pillar 5: Cloud & Backend Security (Firestore / Firebase)
- **Firestore Rules Hardening**: Strictly prohibit wildcard unauthenticated access (`allow read, write: if true;`). Require authenticated user context (`request.auth != null`) and ownership checks (`request.auth.uid == userId`).
- **Input Validation & DoS Prevention**: Limit upload payload sizes and enforce structure validation in cloud database rules.

### Pillar 6: Credential Storage & API Secrets
- **No Hardcoded OAuth Secrets in Frontend**: OAuth 2.0 flows in public clients (Single-Page Apps / Desktop WebViews) must use PKCE without hardcoded client secrets.
- **Encrypted Cache at Rest**: Local caches (`image_cache`, `geminiApiKeys`, `drive_credentials`) must be encrypted at rest using the active module master key rather than stored as plaintext BLOBs or JSON.
- **Safe Database Sanitization**: In decrypted exports or backups, ensure the `keychain` table is cleared and `VACUUM` is performed to prevent residual key leakage in freed SQLite pages or WAL logs.

### Pillar 7: Localhost Services & Binary Integrity
- **Stream Server Security**: Restrict Axum/HTTP stream servers to localhost (`127.0.0.1`), remove wildcard CORS (`CorsLayer::permissive()`), and validate short-lived authentication tokens.
- **No Tokens in URL Query Strings**: Avoid passing sensitive OAuth tokens via GET query parameters (`?token=...`), which leak into logs and browser history.
- **Cryptographic Hash Verification for Binaries**: When downloading external dependencies (`ffmpeg`, `yt-dlp`), verify downloaded binaries against verified SHA-256 checksums before marking executable.

---

## 3. Four-Phase Audit Protocol

### Phase 1: Attack Surface Discovery & Mapping
1. Identify all boundary interfaces: Tauri commands (`generate_handler![]`), custom URI protocols, local network listeners (Axum), cloud sync adapters (Firestore), and Web APIs.
2. Catalog all cryptographic operations, key derivations, and storage locations (SQLite, IndexedDB, LocalStorage).
3. Identify all unsanitized sinks: `dangerouslySetInnerHTML`, `Command::new()`, `fs::read()`, `fs::write()`, `iframe` attributes.

### Phase 2: Line-by-Line Defensive Inspection
1. Audit every file in the target module against the Seven-Pillar Matrix.
2. Trace the entire data lifecycle from user input -> serialization -> storage -> decryption -> rendering.
3. Validate error handlers to ensure secrets or system paths are never leaked in user-facing toasts or telemetry.

### Phase 3: Secondary Cross-Review Loop
> [!IMPORTANT]
> **MANDATORY**: Re-evaluate all findings under the lens of combined exploit chains:
> - *Can an unauthenticated local web page leverage the stream server or custom protocol to access local files?*
> - *Can a malicious web clipping (scrap) or Anki card trigger XSS to invoke Tauri IPC commands?*
> - *Can an attacker with database access easily invert password hashes?*

### Phase 4: Structured Mitigation Plan Generation
Format findings into an actionable report:
- **Severity**: Critical / High / Medium / Low
- **OWASP / CWE Classification**
- **Vulnerability Location** (file and line numbers)
- **Vulnerability Mechanics & Impact**
- **Defensive Remediation** (code diff / implementation steps)
- **Functional Parity Guarantee** (proof that user experience and existing capabilities remain 100% intact)

---

## 4. Strict Functional & Visual Parity Rule

During all security mitigations:
- **NEVER** strip or remove features (e.g. streaming, offline web clipping, dictionary lookups, external link opening).
- Mitigations must **harden and secure the existing architecture**, preserving 100% of user capabilities and design aesthetics.
