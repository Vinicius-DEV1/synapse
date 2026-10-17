# 🛡️ Security Policy & Vulnerability Disclosure

**Synapse** is engineered from the ground up around **Zero-Knowledge principles**, end-to-end encryption (E2EE), and local-first data durability. We take data confidentiality, cryptographic integrity, and security vulnerabilities with the highest priority.

---

## 🔒 Supported Versions

We actively provide security patches, dependency updates, and cryptographic hardening for the following releases:

| Version | Supported | Security Maintenance Status |
| :------ | :-------- | :-------------------------- |
| **`1.0.x`** | ✅ Yes | Actively maintained with critical vulnerability patches. |
| `< 1.0.0` | ❌ No | Deprecated development prototypes. |

---

## 🔐 Zero-Knowledge Cryptographic Guarantees

Synapse guarantees that:
1. **Zero Plaintext Transmission**: All personal notes, passwords, files, and flashcards are encrypted client-side using **AES-256-GCM** with a unique 96-bit (12-byte) initialization vector (IV) per record before touching persistent disks or remote cloud relays.
2. **Ephemeral Master Keys**: Master cryptographic keys are derived via **PBKDF2-HMAC-SHA256 (600,000 iterations)** with cryptographically secure random salts. Master keys reside strictly in volatile RAM and are wiped upon lock.
3. **Blind Relays**: Cloud sync backbones (Firebase Firestore / Google Drive) act solely as blind relays; they never receive decryption keys or view plaintext content.

---

## 🚨 Reporting a Vulnerability

If you believe you have discovered a security vulnerability or cryptographic flaw in Synapse, we urge you to practice **Responsible Disclosure**. Please do **not** disclose the issue publicly through GitHub Issues, public discussions, or social media until it has been reviewed and patched.

### Submission Process

1. **GitHub Security Advisory (Recommended)**:
   Navigate to the repository's **[Security Tab](https://github.com/Vinicius-DEV1/synapse/security)** on GitHub and select **"Report a vulnerability"** to open a private advisory.
2. **Direct Security Contact**:
   Alternatively, contact the author directly via GitHub: [@Vinicius-DEV1](https://github.com/Vinicius-DEV1).

### What to Include in Your Report

To help us investigate and remediate the issue promptly, please include:
- A clear description of the vulnerability and its potential impact.
- Detailed step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
- The execution environment (Desktop Linux/macOS/Windows, Web Browser, or Mobile Companion).
- Any proposed mitigations or code patches, if available.

### Response & Remediation Timelines

- **Initial Acknowledgement**: Within **48 hours** of report receipt.
- **Triage & Assessment**: Within **5 business days**, confirming reproduction and severity classification.
- **Fix & Disclosure**: Coordinated release and public advisory once a patch is verified and deployed.

---

## ⚠️ Out of Scope

The following scenarios are considered out of scope for security reports:
- Attacks requiring physical access to an unlocked device or pre-existing root/administrator compromise of the host OS.
- Attacks relying on modified or malicious third-party browser extensions installed in the user's browser.
- Issues related to third-party services (e.g. Firebase or Google Cloud outages) without a vulnerability in Synapse's implementation.

---

## 🎖️ Recognition

We sincerely appreciate the security researchers and contributors who invest their time and expertise in keeping Synapse safe for everyone. Responsible security researchers will be credited in release notes and security advisories (with their permission).
