# Guia do Aplicativo Mobile Android (Jetpack Compose + Media3)

> **Documento Oficial de Engenharia Mobile**  
> **Caminho:** `apps/mobile-android/`  
> **Tecnologias:** Kotlin 1.9+, Jetpack Compose, Material3, AndroidX Media3 (ExoPlayer), UniFFI JNI  
> **Target SDK:** 34 (Android 14) / Min SDK: 26 (Android 8.0)

---

## 1. Arquitetura do App Android

O cliente mobile substitui a antiga WebView por telas 100% nativas em Jetpack Compose, consumindo o mesmo banco de dados SQLite e o mesmo motor criptográfico Rust através da ponte UniFFI.

```
+-------------------------------------------------------------------------+
|                          apps/mobile-android                            |
+-------------------------------------------------------------------------+
|                                                                         |
|  [app/src/main/java/com/synapse/app/]                                   |
|    - MainActivity.kt: Ponto de entrada, ciclo de vida e tema escuro     |
|    - SynapseCoreBindings.kt: Classes JNI geradas pelo UniFFI            |
|    - EncryptedChunkDataSource.kt: Fonte de mídia customizada Media3     |
|    - ui/                                                                |
|      - theme/Theme.kt: Paleta de cores (#0f0e17) e tipografia            |
|      - screens/                                                         |
|        - VideoPlayerScreen.kt: Player nativo ExoPlayer acelerado        |
|        - ZenQuizScreen.kt: Simulado imersivo com Material3 Cards        |
|        - AnkiStudyScreen.kt: Estudo de flashcards com FSRS v5           |
|        - NotesListScreen.kt: Lista de páginas com pesquisa rápida       |
|                                                                         |
|  [app/build.gradle.kts]                                                 |
|    - Dependências: Compose BOM, Media3-ExoPlayer, Media3-UI             |
|    - Integração de bibliotecas nativas .so (libsynapse_bridge_uniffi.so)|
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 2. Streaming de Vídeo Criptografado com Media3 ExoPlayer

Em vez de decifrar o arquivo de vídeo inteiro para a memória interna do smartphone, o `EncryptedChunkDataSource` estende `androidx.media3.datasource.BaseDataSource` e requisita chunks de 1 MB sob demanda via JNI:

```kotlin
class EncryptedChunkDataSource(
    private val filePath: String,
    private val keyHex: String
) : BaseDataSource(/* isNetwork = */ false) {

    private var currentPosition: Long = 0
    private var bytesRemaining: Long = 0

    override fun open(dataSpec: DataSpec): Long {
        currentPosition = dataSpec.position
        val fileSize = SynapseCoreBindings.getVideoSize(filePath, keyHex)
        bytesRemaining = if (dataSpec.length == C.LENGTH_UNSET.toLong()) {
            fileSize - dataSpec.position
        } else {
            dataSpec.length
        }
        return bytesRemaining
    }

    override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
        if (bytesRemaining <= 0) return C.RESULT_END_OF_INPUT
        val bytesToRead = minOf(length.toLong(), bytesRemaining).toInt()
        val chunk = SynapseCoreBindings.readVideoChunk(filePath, keyHex, currentPosition, bytesToRead.toLong())
        System.arraycopy(chunk, 0, buffer, offset, chunk.size)
        currentPosition += chunk.size
        bytesRemaining -= chunk.size
        return chunk.size
    }

    override fun close() {
        bytesRemaining = 0
    }
}
```

---

## 3. Gestão do Botão Voltar (Android Hardware Back Navigation)

De acordo com as diretrizes do projeto Caderno/Synapse:
- Qualquer modal, simulado imersivo ou drawer lateral deve interceptar o evento de retorno físico ou gesto do Android (`BackHandler { ... }` em Compose).
- Se uma tela imersiva estiver ativa (ex.: Simulado Zen), a primeira pressão no botão voltar sai do simulado com confirmação; a segunda pressão fecha o aplicativo.

---

## 4. Como Compilar para Android

1. Instalar o Android NDK e CMake via Android Studio SDK Manager.
2. Gerar as bibliotecas `.so` do Rust para as arquiteturas desejadas:
   ```bash
   rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
   cargo build --release -p synapse-bridge-uniffi --target aarch64-linux-android
   ```
3. Copiar os arquivos `.so` gerados para `apps/mobile-android/app/src/main/jniLibs/arm64-v8a/`.
4. Compilar o APK:
   ```bash
   cd apps/mobile-android
   ./gradlew assembleDebug
   ```

