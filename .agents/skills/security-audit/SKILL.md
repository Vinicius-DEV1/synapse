---
name: security-audit
description: >-
  Audits security boundaries across React Web/Tauri, Desktop Qt, native Android, and the Expo WebView shell, identifying injection, sandbox escapes, cryptographic gaps, supply-chain risks, and authorization flaws with OWASP/CWE classifications.
---

# Skill: Comprehensive Multiplatform Security Audit & Mitigation Protocol

> This skill defines audit procedures and target controls; it is not a claim
> that every client currently meets them. For verified Qt vault coverage and
> remaining plaintext risks, use the
> [encryption coverage guide](../../../docs/security/encryption-coverage.md).

Activate this skill whenever auditing security, analyzing vulnerabilities, reviewing penetration defense, assessing data protection, or validating cryptography across the **Caderno** multiplatform ecosystem.

> [!IMPORTANT]
> **Cross-Reference**: For canonical cryptographic architecture, PBKDF2/AES-GCM key derivation flows, and keychain vault specifications, reference the `cryptography-vault` skill. This skill focuses on **threat identification, vulnerability analysis, and defensive hardening**.

---

## Client-Specific Attack Surfaces

Include only the clients in scope, but consider the boundaries between them: browser/IndexedDB and React services; Tauri IPC and capabilities; Qt QML-to-C++/FFI and native filesystem/media handlers; Android Compose/ViewModels, UniFFI/JNI, document-provider URI grants and app lifecycle; and Expo WebView origin, injected scripts, safe-area/back bridges, and shell permissions. Shared Rust Core reduces duplicated domain code but does not make client adapters, local stores, or encryption coverage equivalent. Verify each path independently.

## 1. Threat Modeling Scope & Attack Surface

Caderno has three product clients—React Web/Tauri, native Desktop Qt, and native Android Compose—plus an Expo shell that hosts React. The attack surface spans only the implementations present in the selected scope:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THREAT MODELING BOUNDARIES                      │
└────────────────────────────────────────────────────────────────────────┘
  [ Untrusted Inputs ]   ──► Web Content / URLs / EPUB / PDF / Media Files
  [ IPC Boundary ]       ──► WebView ◄──► Tauri IPC Commands (Rust)
  [ Local Network ]      ──► Local Streaming HTTP Server (127.0.0.1)
  [ Filesystem ]         ──► SQLite DB, Encrypted Files (.enc), App Cache
  [ Cloud Boundaries ]   ──► Firebase Firestore Sync, Google Drive E2EE
```

### Client Boundary Matrix

| Target | Boundaries to inspect |
| :--- | :--- |
| React Web | Browser origin, DOM/HTML, IndexedDB, web APIs, file handles, Firebase |
| React/Tauri desktop | React WebView, Tauri capabilities/commands, Rust backend, filesystem and native protocols |
| Desktop Qt | QML/C++ exposure, Qt invokables/signals, `bridge-qt` FFI, native file/media paths, Rust Core |
| Native Android | Compose/ViewModels, UniFFI/JNI, Android permissions, document-provider URI grants, intents, backup and app lifecycle |
| Expo/WebView shell | Origin allowlist, injected scripts, navigation, hardware Back, safe-area bridge, shell permissions |

The WebView shell uses React product UI. Core sharing does not replace per-client boundary validation; verify each adapter and storage flow independently.

### Core Audit Objectives:
1. **WebView & Sandbox Isolation**: Untrusted content (web clippings, imported books, Anki cards) must never escape execution boundaries or access native IPC APIs.
2. **Injection Defense**: Eliminate OS Command Injection, SQL Injection, CLI Argument Injection, DOM/Stored XSS, and custom URI scheme exploits.
3. **Cryptographic & E2EE Integrity**: Ensure high-iteration key derivation, fresh cryptographically secure IVs, authenticated cipher modes (AES-256-GCM), and memory scrubbing.
4. **Filesystem Confinement & Path Traversal**: Ensure all local file operations strictly confine paths to allowed sandbox directories.
5. **Access Control & Cloud Boundaries**: Enforce least-privilege Firestore rules (`request.auth.uid == userId`) and verify the actual encryption/account scoping of each Drive backup flow where implemented.
6. **Credential Hygiene**: Prevent hardcoded secrets, unprotected OAuth credentials, or sensitive residual data in unencrypted storage.
7. **Local Network & Binary Integrity**: Enforce loopback restrictions, token-authenticated media streaming, and SHA-256 verification of external binaries (`ffmpeg`, `yt-dlp`).
8. **Supply Chain Hygiene**: Continuously audit npm and cargo dependency trees for known CVEs.

---

## 2. Eight-Pillar Audit Matrix & Defensive Patterns

### Pillar 1: WebView Isolation & Sandboxing
- **Iframe Sandboxing**: Ensure `allow-scripts` is **never** paired with `allow-same-origin` on frames rendering external content.
  ```html
  <!-- SECURE: Sandboxed frame without same-origin privileges -->
  <iframe sandbox="allow-scripts" srcDoc={sanitizedHtml} />
  ```
- **Tauri Content Security Policy (CSP)**: Ensure `tauri.conf.json` enforces a strict policy forbidding unvetted remote scripts:
  ```json
  "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset: blob:; media-src 'self' encrypted: asset: blob:;"
  ```
- **Native Permissions**: Verify camera, microphone, and geolocation permissions are restricted to user-initiated actions.

### Pillar 2: Injection Prevention
- **OS Command Injection (CWE-78)**: Never concatenate user inputs into shell strings. Always invoke binaries with explicit argument arrays:
  ```rust
  // VULNERABLE:
  // Command::new("sh").arg("-c").arg(format!("yt-dlp {}", user_url)).output()?;

  // SECURE: Direct execution with positional argument separation
  Command::new("yt-dlp")
      .arg("--") // Disables option parsing for subsequent arguments
      .arg(user_url)
      .output()?;
  ```
- **SQL Injection (CWE-89)**: 100% of SQLite operations must use parameterized bindings (`params![]` or `?`). String interpolation (`format!`) in SQL statements is strictly prohibited.
  ```rust
  // SECURE: Parameterized SQLite query
  conn.execute(
      "UPDATE pages SET title = ?1, updated_at = ?2 WHERE id = ?3",
      params![new_title, now, page_id],
  )?;
  ```
- **DOM & Stored XSS (CWE-79)**: Any dynamic HTML rendered with `dangerouslySetInnerHTML` must pass through `DOMPurify` with dangerous tags stripped:
  ```typescript
  import DOMPurify from 'dompurify';

  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
  ```

### Pillar 3: Cryptography & Key Management (CWE-327, CWE-330)
- **KDF Hardening**: Enforce PBKDF2 with HMAC-SHA256 (minimum 600,000 iterations) or Argon2id with unique, per-vault random salts.
- **IV / Nonce Freshness**: Every encryption operation must use a fresh 12-byte cryptographically secure random IV (`rand::thread_rng()` or `crypto.getRandomValues()`). Static IVs (`[0u8; 12]`) are strictly forbidden.
- **Envelope Key Wrapping**: Store module keys wrapped with the user's master key using AES-256-GCM.
- **Memory Zeroization**: Wipe sensitive plaintext keys from memory on vault lock or logout.

### Pillar 4: Filesystem Confinement & Path Traversal (CWE-22)
- **Strict Canonicalization**: Canonicalize target paths and verify that they reside inside allowed application directories before reading or writing:
  ```rust
  let canonical_target = target_path.canonicalize()
      .map_err(|e| format!("Invalid path: {}", e))?;

  if !canonical_target.starts_with(&app_storage_dir) {
      return Err("Security Violation: Path traversal detected".into());
  }
  ```
- **Custom Protocol Handlers**: Protocols (`encrypted://`) must validate paths against directory boundaries before serving file streams.

### Pillar 5: Cloud & Backend Security (Firestore / Firebase)
- **Firestore Security Rules**: Prohibit wildcard read/write access. Every operation must require authentication and tenant matching:
  ```javascript
  match /users/{userId}/notes/{noteId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
  ```
- **Upload Rate-Limiting & Size Caps**: Enforce maximum payload constraints on document sync and attachment uploads.

### Pillar 6: Credential Storage & API Secrets
- **No Hardcoded OAuth Secrets**: Use OAuth 2.0 with PKCE (Proof Key for Code Exchange) for public desktop clients.
- **Per-Entity At-Rest Review**: Verify each table, index, credential, cache, and media path against the encryption coverage guide. Do not assume that enabling a client vault encrypts all persisted data or metadata.
- **Sanitized Exports**: Verify export behavior for the selected client and data model. Exclude key material and sensitive fields by design; never rely on `VACUUM` as a substitute for controlled export contents.

### Pillar 7: Localhost Services & Binary Integrity
- **Local Stream Server**: Bind exclusively to `127.0.0.1`, disallow external network interfaces (`0.0.0.0`), restrict CORS headers, and validate short-lived authentication tokens.
- **Binary Hash Verification**: Verify downloaded auxiliary binaries against pre-calculated SHA-256 checksums before marking executable (`chmod +x`).

### Pillar 8: Supply Chain & Dependency Hygiene
- **Audit Tooling**: Run `npm audit --audit-level=high` and `cargo audit` in CI/CD and pre-release gates.
- **Lockfile Integrity**: Always commit `package-lock.json` and `Cargo.lock`. Never use unpinned wildcards (`*`) for security-critical dependencies.

---

## 3. Rapid 30-Minute Security Checklist

| Checkpoint | Target Pattern | Priority |
| :--------- | :------------- | :------- |
| **XSS** | Search for `dangerouslySetInnerHTML` — is `DOMPurify` strictly applied? | 🔴 Critical |
| **OS Injection** | Search for `Command::new` and `process.spawn` — are args passed as arrays? | 🔴 Critical |
| **SQL Injection** | Search for `format!` or string concatenation in SQLite queries | 🔴 Critical |
| **Path Traversal** | Verify `canonicalize()?.starts_with(&base_dir)` in file handlers | 🔴 Critical |
| **IV Reuse** | Verify fresh 12-byte random IV generation on every encryption call | 🔴 Critical |
| **Tauri CSP** | Inspect Tauri CSP/capabilities, Qt QML exposure, Android manifest/URI grants, and WebView origin/injected-script boundaries for the selected client | 🟠 High |
| **Cloud Rules** | Verify Firestore rules enforce `request.auth.uid == userId` | 🟠 High |
| **Hardcoded Secrets** | Scan codebase for API keys, bearer tokens, and static passwords | 🟠 High |
| **Dependency CVEs** | Run `npm audit` and `cargo audit` | 🟡 Medium |

---

## 4. Four-Phase Audit Protocol

### Phase 1: Attack Surface Discovery & Boundary Mapping
1. Identify client boundaries: browser APIs and IndexedDB; Tauri commands/capabilities; Qt QML-to-C++ invokables, `bridge-qt`, custom URI protocols and local HTTP servers; Android UniFFI/JNI, manifests, intents and document URI grants; WebView origin, injected scripts and navigation; plus cloud sync handlers where implemented.
2. Catalog all cryptographic operations, key derivation routines, and persistent storage sinks.
3. Enumerate all untrusted input vectors (web clips, markdown imports, external media).

### Phase 2: Line-by-Line Defensive Inspection
1. Audit each target module against the Eight-Pillar Matrix.
2. Trace complete data lifecycles: User Input → Serialization → Encryption → Storage → Decryption → DOM Rendering.
3. Verify that exceptions and errors never leak plaintext passwords, master keys, or system paths in toast messages or telemetry.

### Phase 3: Secondary Cross-Review Loop (Exploit Chains)
> [!IMPORTANT]
> **MANDATORY**: Re-evaluate all findings under the lens of combined exploit chains:
> - *Can a malicious web clipping exploit XSS to invoke native Tauri IPC commands?*
> - *Can an unauthenticated local page access the local stream server to read private media?*
> - *Can an attacker with local SQLite database access extract module keys without the Master Password?*
> - *Can a malicious npm dependency exfiltrate keys at build or runtime?*
> - *Can an untrusted Android content URI, intent, or restored lifecycle state cross its intended owner boundary?*
> - *Can QML invoke an exposed native operation with invalid or unauthorized arguments?*

### Phase 4: Structured Mitigation Plan Generation
Format findings into an actionable report:

```markdown
### [SEC-01] [Vulnerability Title]
- **Severity**: Critical | High | Medium | Low
- **OWASP / CWE**: e.g., CWE-78: OS Command Injection / OWASP A03:2021
- **Location**: Record exact source paths in the selected client, including the relevant React/Tauri, Qt, Android, Core, bridge, or shell boundary.
- **Mechanics & Risk**: Explanation of how the flaw can be exploited.
- **Defensive Remediation**: Concrete code patch eliminating the vulnerability.
- **Parity Guarantee**: Verification that application functionality and UX remain intact.
```

---

## 5. Strict Functional & Visual Parity Rule

During all security remediations:
- **NEVER** strip or disable features (e.g., streaming media, web clipping, dictionary lookups, external link opening) to resolve a vulnerability.
- Remediations must **harden and secure the existing architecture**, preserving 100% of functional capabilities and visual fidelity.
