# 🏛️ System Architecture Specification

This document defines the core architecture, multiplatform runtime boundaries, cryptographic security models, and data synchronization patterns powering **Caderno**.

---

## 1. Architectural Overview & Design Philosophy

Caderno is an **Offline-First, Zero-Knowledge Personal Knowledge & Productivity Operating System**. It is engineered to provide the performance, data sovereignty, and security of native desktop software, combined with the accessibility of modern web applications.

```
                                  CADERNO CORE PILLARS
  ┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
  │   Zero-Knowledge E2EE   │      Offline-First      │   Multiplatform Parity  │
  │ Client-side encryption  │ Local SQLite/IndexedDB; │ 100% feature & visual   │
  │ before touching disk    │ zero-latency reads with │ parity between Desktop  │
  │ or remote networks.     │ CRDT synchronization.   │ (Tauri) and Web (PWA).  │
  └─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

---

## 2. Multiplatform Hybrid Runtime

Caderno runs across two execution environments from a unified codebase:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           CROSS-PLATFORM FRONTEND (REACT 19)                  │
│               TypeScript 5.8  •  Vite  •  TailwindCSS  •  TipTap              │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                      Environment Detection (`__TAURI__`)
                     ┌─────────────────┴─────────────────┐
                     ▼                                   ▼
       ┌───────────────────────────┐       ┌───────────────────────────┐
       │   DESKTOP (TAURI V2 / RUST)│       │      WEB PWA (BROWSER)    │
       ├───────────────────────────┤       ├───────────────────────────┤
       │ • Native SQLite (WAL)     │       │ • IndexedDB (`idb` v8)    │
       │ • Tauri IPC Commands      │       │ • Web Crypto API (Subtle) │
       │ • Local Loopback Axum Svr │       │ • Service Worker (`sw.js`)│
       │ • Native FFmpeg / yt-dlp  │       │ • Firebase Firestore Sync │
       │ • `encrypted://` Protocol │       │ • Google Drive REST API   │
       └───────────────────────────┘       └───────────────────────────┘
```

1. **Desktop Native (Tauri v2 + Rust)**:
   - Utilizes Rust for high-speed I/O, heavy cryptography, database operations, media processing, and local streaming.
   - Operates with minimal memory footprint compared to traditional Electron apps (< 60MB base RAM vs 250MB+).
   - High-throughput encrypted SQLite database with Write-Ahead Logging (WAL) enabled.
2. **Web Progressive Web App (Browser / PWA)**:
   - Full client-side execution using IndexedDB (`idb`) and the native W3C Web Crypto API (`window.crypto.subtle`).
   - Background media streaming and chunk decryption orchestrated via Service Workers (`sw.js`).
   - Transparent cloud sync and backup using Google Drive and Firebase signaling.

---

## 3. Four-Tier Layered Architecture

To strictly adhere to the **SOLID** software engineering principles, the codebase enforces clear boundaries across four architectural tiers:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ 1. PRESENTATION LAYER (`src/components/`)                                      │
│ Pure UI rendering, Tailwind styling, accessible keyboard handlers, Radix UI.  │
│ Zero direct platform IPC calls or unmanaged business logic.                  │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼────────────────────────────────────────┐
│ 2. ORCHESTRATION LAYER (`src/hooks/`, `src/store/`)                           │
│ State management (Zustand), reactive lifecycle bindings, memoized selectors.  │
│ Coordinates UI events with underlying business domain services.               │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼────────────────────────────────────────┐
│ 3. DOMAIN & BUSINESS LAYER (`src/services/`, `src/utils/`)                    │
│ Pure business logic: FSRS spaced repetition algorithms, text diffing, OCR     │
│ parsing, cryptographic key lifecycle, and validation logic. React-agnostic.  │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼────────────────────────────────────────┐
│ 4. INFRASTRUCTURE & PLATFORM LAYER (`src/api/`, `src/services/storage/`)      │
│ Abstract drivers: Tauri IPC invoke wrappers, IndexedDB storage adapters,     │
│ Firestore network synchronization, and platform strategy factories.          │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cryptographic Security & Keychain Architecture

Caderno employs a **Two-Tier Key Hierarchy** to decouple user password changes from data re-encryption:

```
[ User Master Password ]
          │
          ▼ PBKDF2-HMAC-SHA256 (600,000 rounds)
   [ Master Key (256-bit AES) ]
          │
          ▼ AES-256-GCM (Unwraps keychain envelope table)
┌─────────────────────────────────────────────────────────────────┐
│                    SQLite / IDB `keychain` Table                │
├─────────────────┬─────────────────┬──────────────┬──────────────┤
│ notes_key_enc   │ vault_key_enc   │ files_key_enc│ anki_key_enc │
├─────────────────┼─────────────────┼──────────────┼──────────────┤
│ finance_key_enc │ diagram_key_enc │ core_key_enc │ culture_key  │
└─────────────────┴─────────────────┴──────────────┴──────────────┘
          │
          ▼ Decrypted into in-memory protected state
   [ Dedicated Module AES-256 Keys ]
          │
          ▼ AES-256-GCM (Ciphertext payloads)
   [ Encrypted Notes, Drive `.enc` Files, Chunked Media Streams ]
```

### 4.1. Key Derivation & Salt Isolation
- **Algorithm**: PBKDF2 with HMAC-SHA256, strictly adhering to **NIST SP 800-132**.
- **Iteration Count**: 600,000 iterations to withstand high-throughput GPU brute-force attacks.
- **Salt Domains**:
  - Desktop SQLite Keychain: `b"caderno-keychain-salt"` (Rust domain).
  - Cloud / Remote Sync Payloads: `"caderno-e2ee-salt-v1"` (Web Crypto domain).
  - Domain separation prevents cross-system dictionary replay attacks.

### 4.2. In-Memory Key Zeroization
- Plaintext Master Keys and Module Keys are never stored in persistent databases or local storage.
- Upon session locking or application exit, all in-memory keys (`DbState.keys` in Rust and memory references in TypeScript) are overwritten and cleared.

---

## 5. Real-Time Collaborative State & Concurrency (CRDT)

Caderno utilizes **Conflict-Free Replicated Data Types (CRDTs)** via the **Yjs** ecosystem for note editing and multi-device synchronization:

```
┌─────────────────────────┐                     ┌─────────────────────────┐
│  Client A (Tauri Linux) │                     │   Client B (Web PWA)    │
│  TipTap / ProseMirror   │                     │   TipTap / ProseMirror  │
└────────────┬────────────┘                     └────────────┬────────────┘
             │                                               │
      `y-prosemirror`                                 `y-prosemirror`
             │                                               │
      ┌──────▼──────┐                                 ┌──────▼──────┐
      │   Y.Doc A   │                                 │   Y.Doc B   │
      └──────┬──────┘                                 └──────┬──────┘
             │                                               │
             └──────────────► Firebase Signaling ◄───────────┘
                               (Encrypted CRDT
                                State Vectors)
```

- **Conflict-Free Convergence**: Edits from concurrent devices merge deterministically without data loss, overwrites, or merge conflict prompts.
- **State Vector Compaction**: Periodic document compaction prevents unbounded CRDT history growth by generating snapshot checkpoints.

---

## 6. Storage Strategy & Multiplatform Adapters

Persistence adheres strictly to the **Liskov Substitution Principle (LSP)** through the `IStorageService` abstraction:

```typescript
export interface IStorageService {
  getNotes(): Promise<Note[]>;
  saveNote(note: Note): Promise<void>;
  deleteNote(id: string): Promise<void>;
  getVaultItems(): Promise<VaultItem[]>;
  saveVaultItem(item: VaultItem): Promise<void>;
  // ...fine-grained domain methods
}
```

```
                        ┌──────────────────┐
                        │ IStorageService  │
                        └────────┬─────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
     ┌───────────────────────┐       ┌───────────────────────┐
     │  TauriStorageService  │       │   WebStorageService   │
     │  (Rust IPC / SQLite)  │       │  (IndexedDB / idb)    │
     └───────────────────────┘       └───────────────────────┘
```

The concrete implementation is instantiated transparently at runtime by a dependency injection factory based on platform capabilities.

---

## 7. Performance Engineering & Quality Guarantees

Caderno adopts elite industry performance best practices:

1. **Zero-Latency Perceived UX (SWR Pattern)**:
   - Adopts Stale-While-Revalidate (RFC 5861). Cached records display synchronously for 0ms transition times, revalidating against storage in the background.
2. **GPU Compositor Acceleration**:
   - Zero-rerender CSS interactions: Hover, active, and focus states use Tailwind composite classes (`group-hover`, `peer`, `:focus-within`) handled entirely on the GPU compositor thread without triggering React re-renders.
3. **Constant-Time Lookups ($O(1)$ Hash Maps)**:
   - High-frequency datasets (tags, note lookups, flashcard queries) are indexed in memory using `Map` and `Set` structures, preventing $O(n)$ render-loop scans.
4. **Off-Main-Thread Media Processing**:
   - Video streaming, audio slicing, and PDF/EPUB parsing run asynchronously or in background workers to preserve smooth 60fps UI responsiveness.
