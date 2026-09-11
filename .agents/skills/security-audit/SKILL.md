---
name: security-audit
description: >-
  Conducts comprehensive, file-by-file security audits across Tauri backend (Rust)
  and Web frontend (React/TypeScript), identifying injection, sandbox escapes,
  cryptographic flaws, supply chain risks, auth breaches, and providing defensive
  mitigation plans with OWASP/CWE classification.
---

# Skill: Comprehensive Multiplatform Security Audit & Mitigation Protocol

Activate this skill whenever the user requests a security audit, vulnerability analysis, penetration defense review, data-protection assessment, or cryptographic validation across the **Caderno** application.

> [!IMPORTANT]
> **Cross-reference**: For detailed cryptographic architecture, key derivation flows, and encryption implementation specifics, activate the `caderno-cryptography-vault` skill. This audit skill focuses on **identifying security vulnerabilities** — the crypto skill provides the **canonical implementation reference**.

---

## 1. Core Objectives & Threat Modeling Scope

Perform an in-depth, file-by-file security analysis across both the Desktop (Tauri v2 / Rust) and Web (React 19 / TypeScript / Vite) application surfaces:

1. **WebView & Sandbox Isolation**: Verify that untrusted content cannot escape execution boundaries or access native IPC APIs.
2. **Injection Defense**: Identify and prevent OS Command Injection, SQL Injection, CLI Argument Injection, XSS, and URI scheme exploits.
3. **Cryptographic & E2EE Integrity**: Audit key derivation, salt randomness, IV uniqueness, cipher modes, and memory scrubbing (see `caderno-cryptography-vault` for canonical implementation).
4. **Access Control & Multi-Tenant Boundaries**: Validate cloud storage rules, local authentication checks, and IPC authorization guardrails.
5. **Path Traversal & Filesystem Confinement**: Ensure all file operations strictly confine paths to intended application directories.
6. **Data at Rest & Credential Hygiene**: Detect unencrypted secrets, API keys, and residual keys.
7. **Local Network & IPC Security**: Audit local HTTP servers, CORS policies, localhost bindings, and binary download integrity.
8. **Supply Chain & Dependency Security**: Assess third-party package risk.

---

## 2. Eight-Pillar Audit Matrix

### Pillar 1: WebView Isolation & Sandboxing
- **Iframe Sandboxing**: Ensure `allow-scripts` is **never** combined with `allow-same-origin` on iframes rendering user or web content.
- **Tauri CSP**: Ensure `tauri.conf.json` defines strict CSP preventing arbitrary remote script execution.
- **Native Permissions**: Validate that media, camera, and microphone permissions are not automatically granted.

### Pillar 2: Injection Prevention
- **OS Command Injection**: Never invoke shell interpreters with string concatenation. Use direct process spawning with separate arguments.
- **CLI Argument Injection**: Always separate flags from user-supplied positional arguments (e.g., `--` before URLs in `yt-dlp` / `ffmpeg`).
- **SQL Injection**: Verify 100% of SQLite queries use parameterized placeholders (`?`, `params![]`).
- **DOM & Stored XSS**: All HTML rendering (`dangerouslySetInnerHTML`) must be filtered through `DOMPurify` with dangerous tags forbidden.

### Pillar 3: Cryptography & Key Management
*(Canonical reference: `caderno-cryptography-vault` skill)*
- **KDF Strength**: Require high-iteration PBKDF2 (≥ 600,000 rounds) or Argon2id with unique, random per-user salts.
- **No Static Salts**: Salts must be randomly generated (16+ bytes), never hardcoded.
- **IV Freshness**: Enforce fresh 12-byte cryptographically secure random IVs for every encryption operation.
- **Memory Zeroization**: Clear sensitive keys from memory upon lock or completion.

### Pillar 4: Filesystem Confinement & Path Traversal
- **Strict Canonicalization**: All file paths must be canonicalized and checked against allowed root directories using `path.starts_with(base_dir)`.
- **Absolute Path Prohibitions**: Prohibit logic where `path.is_absolute()` allows reading/writing arbitrary files.
- **Custom Protocol Handlers**: Never serve unencrypted arbitrary files over custom protocols based solely on path existence.

### Pillar 5: Cloud & Backend Security (Firestore / Firebase)
- **Firestore Rules**: Strictly prohibit wildcard unauthenticated access. Require `request.auth.uid == userId`.
- **Input Validation & DoS**: Limit upload payload sizes and enforce structure validation.

### Pillar 6: Credential Storage & API Secrets
- **No Hardcoded OAuth Secrets**: Use PKCE without hardcoded client secrets in public clients.
- **Encrypted Cache at Rest**: Local caches must be encrypted with the active module master key.
- **Safe Database Sanitization**: Clear `keychain` table and `VACUUM` in decrypted exports/backups.

### Pillar 7: Localhost Services & Binary Integrity
- **Stream Server Security**: Restrict to localhost (`127.0.0.1`), remove wildcard CORS, validate short-lived auth tokens.
- **No Tokens in URLs**: Avoid sensitive tokens in GET query parameters.
- **Binary Hash Verification**: Verify downloaded binaries (`ffmpeg`, `yt-dlp`) against SHA-256 checksums before marking executable.

### Pillar 8: Supply Chain & Dependency Security
- **npm Audit**: Run `npm audit` regularly and address critical/high vulnerabilities.
- **Cargo Audit**: Run `cargo audit` on Rust dependencies for known CVEs.
- **Dependency Review**: Audit new dependencies before adding — check maintainer reputation, download counts, last update date, and permissions scope.
- **Lock File Integrity**: Ensure `package-lock.json` and `Cargo.lock` are committed and not ignored.
- **Dependency Pinning**: Prefer exact versions or narrow ranges over wildcard (`*`) or wide caret (`^`) ranges for security-critical packages.

---

## 3. Quick-Win Security Checklist

For rapid audits (< 30 min), check these high-impact items first:

- [ ] Search for `dangerouslySetInnerHTML` — is `DOMPurify` always used?
- [ ] Search for `Command::new` / `process.spawn` — are arguments properly separated?
- [ ] Search for `format!` in SQL context — are all queries parameterized?
- [ ] Search for `.unwrap()` in IPC handlers — are panics possible in user-facing code paths?
- [ ] Check `tauri.conf.json` → `security.csp` — is it defined and restrictive?
- [ ] Search for hardcoded API keys, secrets, or tokens in source code
- [ ] Check Firestore rules — any `allow read, write: if true;`?
- [ ] Run `npm audit --audit-level=high` and `cargo audit`
- [ ] Check `encrypted://` / custom protocol handlers for path traversal
- [ ] Verify OAuth flows use PKCE, not hardcoded client secrets

---

## 4. Four-Phase Audit Protocol

### Phase 1: Attack Surface Discovery & Mapping
1. Identify all boundary interfaces: Tauri commands, custom URI protocols, local network listeners, cloud sync adapters, Web APIs.
2. Catalog all cryptographic operations, key derivations, and storage locations.
3. Identify all unsanitized sinks: `dangerouslySetInnerHTML`, `Command::new()`, `fs::read/write`, `iframe` attributes.

### Phase 2: Line-by-Line Defensive Inspection
1. Audit every file in the target module against the Eight-Pillar Matrix.
2. Trace the entire data lifecycle from user input → serialization → storage → decryption → rendering.
3. Validate error handlers to ensure secrets or system paths are never leaked in user-facing toasts or telemetry.

### Phase 3: Secondary Cross-Review Loop
> [!IMPORTANT]
> **MANDATORY**: Re-evaluate all findings under the lens of combined exploit chains:
> - *Can an unauthenticated local web page leverage the stream server or custom protocol to access local files?*
> - *Can a malicious web clipping or Anki card trigger XSS to invoke Tauri IPC commands?*
> - *Can an attacker with database access easily invert password hashes?*
> - *Can a malicious npm/cargo dependency exfiltrate encryption keys at build time?*

### Phase 4: Structured Mitigation Plan Generation
Format findings into an actionable report:
- **Severity**: Critical / High / Medium / Low
- **OWASP / CWE Classification**
- **Vulnerability Location** (file and line numbers)
- **Vulnerability Mechanics & Impact**
- **Defensive Remediation** (code diff / implementation steps)
- **Functional Parity Guarantee** (proof that user experience remains intact)

---

## 5. Strict Functional & Visual Parity Rule

During all security mitigations:
- **NEVER** strip or remove features (e.g., streaming, offline web clipping, dictionary lookups, external link opening).
- Mitigations must **harden and secure the existing architecture**, preserving 100% of user capabilities and design aesthetics.
