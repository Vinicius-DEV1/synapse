# 🔐 Synapse Password & Credential Vault — Technical Specification

The **Synapse Vault** is a credential-management module with AES-GCM protection in supported flows and k-anonymity breach checking. This document describes the product design; it does not certify every client or every related data field.

Native Qt setup protects selected vault item fields, groups, and password history. It does not encrypt every SQLite table or every metadata field. See the [encryption coverage guide](../security/encryption-coverage.md) for current scope and remaining plaintext coverage.

---

## 1. Architectural Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SYNAPSE VAULT ARCHITECTURE                      │
├────────────────────────────────────────────────────────────────────────┤
│  PRESENTATION & UX                                                     │
│  Radix UI  •  Entropy Score Meter  •  Search & Filtering  •  Icons     │
├────────────────────────────────────────────────────────────────────────┤
│  KEYCHAIN DECOUPLING                                                   │
│  Master Key ──(AES-256-GCM)──► Unwraps vault_key in RAM                │
├────────────────────────────────────────────────────────────────────────┤
│  FIELD-LEVEL ENCRYPTION                                                │
│  Username (Plain/Enc) • Password (AES-GCM) • TOTP Secret (AES-GCM)     │
├────────────────────────────────────────────────────────────────────────┤
│  k-ANONYMITY COMPROMISE DETECTION (HIBP)                               │
│  SHA-1(Password) ──► First 5 Hex Chars ──► Query HIBP API              │
└────────────────────────────────────────────────────────────────────────┘
```

- **Source Code Locations**:
  - UI Presentation: `apps/web-react/src/components/vault/`
  - Client Cryptographic Services: `apps/web-react/src/services/vault-crypto.ts`
  - Tauri Native Backend: `apps/web-react/src-tauri/src/cmd_vault/` (`mod.rs`, `items.rs`, `passwords.rs`, `groups.rs`)

---

## 2. Field-Level Encryption Model

The clients have separate vault adapters. The native Qt setup currently encrypts the following local content fields during setup and on supported writes:

1. **Credential fields**: `label`, `username`, `email`, `password`, `url`, `notes`, and `custom_fields`.
2. **Group and history fields**: group `name`, `icon`, and `color`, plus historical password values.
3. **Visible metadata**: flags, ordering, timestamps, relationships, and other operational columns are not all encrypted. The current field inventory is in the [encryption coverage guide](../security/encryption-coverage.md).
4. **Wire format**: each protected text value is stored as an AES-GCM ciphertext payload:
   $$\text{Payload} = \text{IV}_{\text{12B}} : \text{Ciphertext} : \text{AuthTag}_{\text{16B}}$$
  Supported encryption flows generate a fresh 96-bit nonce. React/Tauri and Qt use separate persistence adapters; verify each implementation before assuming identical coverage.

---

## 3. k-Anonymity Compromise Detection (Have I Been Pwned)

Synapse verifies whether stored or generated credentials have appeared in known data breaches without ever transmitting the user's password over the internet:

```
[ User Password: "MyP@ssw0rd!" ]
              │
              ▼ SHA-1 Hash
    [ 2BD928B3F4...8F02 ]
         │          │
         │          └── (Remaining 35 chars kept strictly private in RAM)
         ▼ (Only first 5 hex characters)
    [ "2BD92" ]
         │
         ▼ HTTP GET https://api.pwnedpasswords.com/range/2BD92
    [ List of matching hash suffixes + breach frequencies ]
         │
         ▼ Local RAM Comparison
    [ Match detected? If suffix in response -> Flag as Compromised ]
```

- **Zero Plaintext Exposure**: Only 5 hexadecimal characters of the SHA-1 hash are sent to the external API.
  - **Privacy Boundary**: The request sends only the configured hash prefix, not the password itself. This reduces information disclosed to the service; it is not a claim that every network or service-side inference is mathematically impossible.

---

## 4. High-Entropy Password & Passphrase Generator

The built-in generator produces cryptographically strong credentials based on **Shannon Entropy**:

- **Entropy Formula**:
  $$H = L \times \log_2(R)$$
  Where $L$ is the character length and $R$ is the size of the character pool (lowercase, uppercase, numbers, symbols).
- **Passphrase Mode**: Generates multi-word passphrases from curated high-entropy wordlists (e.g. `correct-horse-battery-staple`), offering brute-force resistance while remaining human-memorable.

---

## 5. Memory Hygiene and Zeroization

Selected bridge buffers and Qt key-map values are cleared during lock. Full zeroization of Qt implicit-shared strings, QML state, JSON query buffers, IndexedDB copies, temporary files, and WAL snapshots has not been proven. Treat this as a defense-in-depth measure, not a zero-residual guarantee.
