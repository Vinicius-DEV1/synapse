# ENC1 Encrypted Media Container

**Status:** Wire-format reference for the Rust chunked-file implementation. Client integration and asset coverage vary; see the [native encryption audit](../security/native-encryption-audit.md).

## 1. Container Layout

ENC1 begins with a 16-byte header, followed by independently authenticated AES-256-GCM chunks:

| Offset | Length | Field |
| --- | ---: | --- |
| 0 | 4 bytes | ASCII magic `ENC1` |
| 4 | 8 bytes | Original plaintext length, unsigned little-endian |
| 12 | 4 bytes | Plaintext chunk size, unsigned little-endian; current supported value is 1 MiB |
| 16 onward | variable | For each chunk: 12-byte nonce, ciphertext, 16-byte GCM tag |

The AES-GCM implementation appends the authentication tag to the ciphertext returned by the cipher. Each chunk adds 28 bytes of overhead. The last chunk may contain fewer than 1 MiB of plaintext.

## 2. Chunk Offsets and Range Reads

For a supported chunk size `C = 1,048,576` and chunk index `i`, the physical offset is:

`16 + i * (C + 28)`

A plaintext range `[start, end]` uses inclusive byte offsets. The reader selects the first and last intersecting chunks, authenticates and decrypts each chunk, then copies the requested slices into the response buffer. The reader does not need to decrypt earlier chunks.

The shared Rust reader validates the magic, chunk size, declared plaintext length, expected container length, and checked offset arithmetic before reading. It rejects truncated or oversized containers and a chunk size it does not support.

## 3. Integrity Boundary

Each encrypted chunk is authenticated by AES-GCM with a fresh 12-byte nonce. A modified chunk fails authentication. The 16-byte container header is not authenticated by the current wire format; size and chunk-size checks provide structural validation, not cryptographic authenticity for the header.

The current format does not include a versioned authenticated header or additional authenticated data. A format change requires a versioned migration and coordinated updates to every reader.

## 4. Implementations

- Shared Rust range reader: `core/synapse-core/src/crypto/stream.rs`.
- Qt C ABI: `bridges/bridge-qt/src/lib.rs`; native Qt playback uses the encrypted video stream adapter and libmpv callbacks.
- Tauri custom protocol: `apps/web-react/src-tauri/src/protocol_encrypted.rs` and `crypto_stream.rs`.
- React web playback: app-specific service-worker and media adapters under `apps/web-react/public/` and `apps/web-react/src/`.

The Tauri protocol uses a custom `encrypted://` URI and handles HTTP range requests; the Qt player uses native callbacks. Do not describe all clients as sharing one HTTP server or one zero-copy path.

## 5. Protection and Migration Scope

Import flows encrypt supported local media when their vault is configured. Qt first-time vault setup also migrates referenced readable files inside the managed `files/`, `library/`, and `videos/` directories. It records pending replacements in `vault_asset_migrations` and resumes them on unlock. Setup stops when an existing referenced asset is outside its managed directory.

ENC1 storage does not itself encrypt database titles, progress fields, paths, subtitle labels, or unrelated business records. See the [native encryption audit](../security/native-encryption-audit.md) for those gaps.

## 6. Verification

The shared Rust container tests cover valid round trips, random nonce use, malformed headers, unsupported chunk sizes, and truncated or extended containers:

```bash
cargo test -p synapse-core crypto::stream::tests --lib
cargo test -p synapse-bridge-qt test_crypto_ffi_roundtrips --lib
```

Qt setup and recovery behavior is covered by the native priority-module suite described in the [testing guide](../TESTES.md). These targeted tests do not certify every platform reader or every encrypted-media integration.
