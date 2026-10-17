# 🔐 Synapse Password & Credential Vault — Technical Specification

The **Synapse Vault** is a military-grade password, secret, and credential manager engineered with **Zero-Knowledge field-level encryption** and **k-Anonymity breach verification**.

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
  - UI Presentation: `src/components/vault/`
  - Client Cryptographic Services: `src/services/vault-crypto.ts`
  - Tauri Native Backend: `src-tauri/src/cmd_vault/` (`mod.rs`, `items.rs`, `passwords.rs`, `groups.rs`)

---

## 2. Field-Level Encryption Model

Unlike naive vaults that encrypt entire tables into opaque blobs (preventing indexing or fast sorting), Synapse Vault implements granular **field-level encryption**:

1. **Non-Sensitive Searchable Columns**: Item titles, categories, and group identifiers are indexed locally for sub-millisecond retrieval.
2. **Encrypted Secret Columns**:
   - `password`
   - `totp_secret`
   - `notes`
   - `card_number`
3. **Wire Format**: Each sensitive field is stored as an independent ciphertext payload:
   $$\text{Payload} = \text{IV}_{\text{12B}} : \text{Ciphertext} : \text{AuthTag}_{\text{16B}}$$
   Every encryption cycle generates a fresh 96-bit random IV using a Cryptographically Secure Pseudo-Random Number Generator (`crypto.getRandomValues`).

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
- **Mathematical Privacy**: Over 500 potential password suffixes share the same 5-character prefix, making it mathematically impossible for the external API or network sniffers to determine the actual password.

---

## 4. High-Entropy Password & Passphrase Generator

The built-in generator produces cryptographically strong credentials based on **Shannon Entropy**:

- **Entropy Formula**:
  $$H = L \times \log_2(R)$$
  Where $L$ is the character length and $R$ is the size of the character pool (lowercase, uppercase, numbers, symbols).
- **Passphrase Mode**: Generates multi-word passphrases from curated high-entropy wordlists (e.g. `correct-horse-battery-staple`), offering brute-force resistance while remaining human-memorable.

---

## 5. Memory Hygiene & Zeroization

- Master and vault cryptographic keys are held exclusively in volatile RAM.
- Upon session lock, window minimization (configurable), or inactivity timeout, all memory allocations containing cryptographic keys (`DbState.keys` in Rust and CryptoKey references in Web memory) are overwritten and wiped.
