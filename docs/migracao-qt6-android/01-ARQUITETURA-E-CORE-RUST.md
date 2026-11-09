# Arquitetura e Especificação Técnica do `synapse-core` (Rust)

> **Documento Oficial de Engenharia para Agentes e Desenvolvedores**  
> **Crate:** `core/synapse-core`  
> **Linguagem:** Rust (Edição 2021)  
> **Responsabilidade:** Motor unificado e semântica de negócios compartilhada entre Desktop (Qt 6), Mobile (Android) e Web (Wasm).

---

## 1. Visão Geral do Crate

O `synapse-core` é uma biblioteca Rust compilável para múltiplos alvos:
- `x86_64-unknown-linux-gnu` / `x86_64-pc-windows-msvc` / `aarch64-apple-darwin` (Desktop)
- `aarch64-linux-android` / `armv7-linux-androideabi` / `x86_64-linux-android` (Android NDK)
- `wasm32-unknown-unknown` (WebAssembly)

Nenhum código de UI ou framework gráfico reside no core. Ele encapsula:
1. **Gerenciamento de Persistência SQLite WAL** (`rusqlite` com mutex de conexão thread-safe).
2. **Criptografia E2EE Two-Tier Keychain** (AES-256-GCM + PBKDF2 com 600.000 iterações HMAC-SHA256).
3. **Motor FSRS v5 (Free Spaced Repetition Scheduler)** para repetição espaçada nativa com estabilidade, dificuldade e intervalos calculados deterministicamente.
4. **Leitor de Streaming Zero-Copy de Vídeos Criptografados (`ENC1`)** com cabeçalho de metadados de 128 bytes e blocos de 1 MB.
5. **Motor de Busca e Indexação Textual em Memória**.

---

## 2. Gerenciamento de Persistência SQLite & Concorrência

### 2.1. Configuração do Banco
O core abre o banco SQLite no modo WAL (`Write-Ahead Logging`) e aplica pragmas de alta performance:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = -64000; -- 64 MB de cache em memória
```

### 2.2. O Tipo `Database`
```rust
pub struct Database {
    conn: Arc<Mutex<Connection>>,
    path: PathBuf,
}
```
- A conexão é protegida por `Arc<Mutex<Connection>>`, garantindo acesso seguro entre threads de background (ex.: renderização QML, decodificação libmpv e I/O de disco).
- Todas as tabelas são criadas automaticamente se não existirem via método `Database::open(path)`.
- A migração preserva estritamente o esquema canônico do Caderno com 51 tabelas existentes, utilizando soft delete (`deleted_at IS NULL`) em todas as entidades.

---

## 3. Criptografia E2EE Two-Tier Keychain

O Caderno adota um modelo de chave em dois níveis:
1. **Master Key (KEK - Key Encryption Key):** Derivada da senha mestra do usuário via PBKDF2-HMAC-SHA256 (600k iterações, sal de 16 bytes).
2. **Vault Keys / Media Keys (DEK - Data Encryption Keys):** Chaves aleatórias de 256 bits usadas para cifrar cada registro ou arquivo de mídia individualmente.

### Formato de Cifra:
- Algoritmo: `AES-256-GCM` com autenticação AEAD.
- Payload serializado: `IV (12 bytes) || Ciphertext || Auth Tag (16 bytes)`.

---

## 4. Motor FSRS v5 (Free Spaced Repetition Scheduler)

Diferente do algoritmo clássico SM-2 (usado no Anki legado), o FSRS v5 calcula a probabilidade matemática de retenção com base em:
- **Estabilidade ($S$):** Tempo em dias para a probabilidade de lembrança cair para 90%.
- **Dificuldade ($D$):** Escala de 1 a 10 representando a complexidade inerente do cartão.
- **Classificação ($R$):**
  - `1`: Again (Falha / Novamente)
  - `2`: Hard (Difícil)
  - `3`: Good (Bom)
  - `4`: Easy (Fácil)

### Fórmula de Agendamento:
$$\text{Intervalo} = S \times \frac{\ln(\text{Retenção Solicitada})}{\ln(0.9)}$$
Onde a retenção solicitada padrão é $0.90$ (90%).

O método exposto no core:
```rust
pub fn review(&self, card: &Card, rating: Rating, now: DateTime<Utc>) -> Card;
```
Calcula a nova estabilidade, dificuldade, repetições, lapsos e data de vencimento com tempo de execução inferior a 50 microssegundos.

---

## 5. Streaming Zero-Copy de Vídeo Criptografado (`ENC1`)

Para reproduzir vídeos protegidos sem descriptografar o arquivo inteiro para o disco (o que exporia a mídia e consumiria gigabytes de espaço temporário), o `synapse-core` implementa o leitor `EncryptedVideoReader`.

### Estrutura do Formato `ENC1`:
```
+-------------------------------------------------------------------------+
| Magic Bytes: "ENC1" (4 bytes)                                           |
| Version: 0x0001 (2 bytes)                                               |
| Cipher: AES-256-GCM (1 byte)                                            |
| Chunk Size: 1,048,576 bytes (1 MB) (4 bytes)                            |
| Original File Size: uint64 (8 bytes)                                    |
| Salt: 16 bytes                                                          |
| Master Nonce Base: 12 bytes                                             |
| Reserved Header Padding: 81 bytes (Total: 128 bytes)                    |
+-------------------------------------------------------------------------+
| Chunk 0: [IV 12B] [1MB Ciphertext] [Tag 16B]                            |
| Chunk 1: [IV 12B] [1MB Ciphertext] [Tag 16B]                            |
| ...                                                                     |
+-------------------------------------------------------------------------+
```

### Algoritmo de Acesso Aleatório (Seek O(1)):
Ao solicitar um seek para o offset $X$:
1. `chunk_index = X / chunk_size`
2. `offset_in_chunk = X % chunk_size`
3. O reader lê apenas o chunk específico do arquivo, decifra o bloco na memória e serve os bytes solicitados para o buffer do `libmpv` (Desktop) ou `Media3 DataSource` (Android).
4. Suporta decodificação por hardware direta sem quedas de frames em 4K.

