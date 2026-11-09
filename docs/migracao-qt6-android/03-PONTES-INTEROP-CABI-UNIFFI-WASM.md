# Pontes de Interoperabilidade: C-ABI, UniFFI e WebAssembly

> **Documento Oficial de Engenharia de Integração**  
> **Crates:** `bridges/bridge-qt`, `bridges/bridge-uniffi`, `bridges/bridge-wasm`  
> **Objetivo:** Expor os recursos de alto desempenho do `synapse-core` de forma segura, sem vazamentos de memória (Zero-Leak Discipline), para cada plataforma nativa.

---

## 1. Ponte C-ABI para Qt 6 / C++ (`bridges/bridge-qt`)

O C-ABI é a forma mais rápida de interop entre C++ e Rust, eliminando qualquer overhead de IPC de rede ou serializações lentas.

### 1.1. Arquivo de Cabeçalho Canônico: `bridges/bridge-qt/include/synapse_bridge.h`
```c
#ifndef SYNAPSE_BRIDGE_H
#define SYNAPSE_BRIDGE_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// Handle opaco de banco de dados
typedef struct Database Database;

// Handle opaco de leitor de streaming
typedef struct EncryptedVideoReader EncryptedVideoReader;

// APIs de Banco de Dados
Database* synapse_db_open(const char* path);
void synapse_db_close(Database* db);
char* synapse_db_query_json(Database* db, const char* sql);
int synapse_db_execute(Database* db, const char* sql);

// APIs de Leitura de Vídeo Criptografado (Callback para libmpv)
EncryptedVideoReader* synapse_video_reader_open(const char* file_path, const char* key_hex);
int64_t synapse_video_reader_size(EncryptedVideoReader* reader);
int64_t synapse_video_reader_seek(EncryptedVideoReader* reader, int64_t offset);
int64_t synapse_video_reader_read(EncryptedVideoReader* reader, uint8_t* buffer, size_t size);
void synapse_video_reader_close(EncryptedVideoReader* reader);

// Algoritmo FSRS v5
int synapse_fsrs_calculate(
    double stability,
    double difficulty,
    int32_t reps,
    int32_t lapses,
    int32_t rating,
    int32_t elapsed_days,
    double* out_stability,
    double* out_difficulty,
    int32_t* out_scheduled_days
);

// Criptografia e Gerenciamento de Memória
int synapse_crypto_derive_master_key(const char* password, uint8_t* out_key32);
char* synapse_crypto_decrypt(const char* key_hex, const char* encrypted_payload);
void synapse_free_string(char* s);

#ifdef __cplusplus
}
#endif

#endif // SYNAPSE_BRIDGE_H
```

### 1.2. Regras Cruciais de Memória (C++ e Rust):
1. **Liberação de Strings:** Qualquer `char*` retornado pelo Rust (`synapse_db_query_json`, `synapse_crypto_decrypt`) foi alocado via `CString::into_raw()`. O chamador em C++ **DEVE** chamar `synapse_free_string()` após copiar para `QByteArray` ou `QString`, caso contrário haverá memory leak.
2. **Handles Opacos:** `Database*` e `EncryptedVideoReader*` são ponteiros brutos gerenciados pelo Rust através de `Box::into_raw()`. Devem ser fechados exclusivamente com `synapse_db_close()` e `synapse_video_reader_close()`.

---

## 2. Ponte UniFFI para Android Jetpack Compose (`bridges/bridge-uniffi`)

O UniFFI gera automaticamente classes seguras em Kotlin com binding JNI direto sem escrever código C/JNI manual.

### 2.1. Arquivo de Definição UDL / Procedural Macros:
Em `bridges/bridge-uniffi/src/lib.rs`, usamos as macros UniFFI v0.28+:
```rust
#[uniffi::export]
pub fn uniffi_db_open(path: String) -> Result<Arc<DatabaseWrapper>, BridgeError> { ... }

#[uniffi::export]
pub fn uniffi_fsrs_review(
    stability: f64,
    difficulty: f64,
    reps: i32,
    lapses: i32,
    rating: i32,
    elapsed_days: i32
) -> FsrsResult { ... }

#[uniffi::export]
pub fn uniffi_read_video_chunk(
    file_path: String,
    key_hex: String,
    offset: i64,
    length: i64
) -> Result<Vec<u8>, BridgeError> { ... }
```

### 2.2. Integração com Android `Media3 / ExoPlayer`:
No Android, a classe `EncryptedChunkDataSource.kt` estende `BaseDataSource` do Jetpack Media3 e chama `uniffi_read_video_chunk()` diretamente, alimentando o reprodutor nativo sem decifrar arquivos no disco.

---

## 3. Ponte WebAssembly para Navegadores Web (`bridges/bridge-wasm`)

Para o ambiente Web (PWA / Browser), o crate `bridges/bridge-wasm` compila para `wasm32-unknown-unknown` usando `wasm-bindgen`.

### 3.1. Métodos Exportados:
- `wasm_fsrs_calculate(stability, difficulty, reps, lapses, rating, elapsed_days)`: Executa cálculos de repetição espaçada em sub-microssegundos diretamente no JavaScript.
- `wasm_crypto_decrypt(keyHex, payload)`: Descriptografia de payloads de notas e senhas.

### 3.2. Adaptador TypeScript: `src/services/synapse-wasm-adapter.ts`
Implementa fallback automático: se o módulo Wasm não estiver carregado na thread principal, cai para a implementação pura em TypeScript sem quebrar o usuário.

