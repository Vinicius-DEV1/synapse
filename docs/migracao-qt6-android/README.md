# Documentação Central da Migração Synapse Nativo (Qt 6, Android, Rust Core)

Bem-vindo à documentação mestre da reengenharia do ecossistema Synapse. Esta pasta contém todos os registros de decisões arquiteturais, esquemas de dados, contratos de interop e guias passo a passo para desenvolvedores e agentes autônomos.

## Índice de Documentos

1. [**00 - Visão Geral e Matriz de Status**](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/docs/migracao-qt6-android/00-VISAO-GERAL-E-STATUS.md)
   - Motivação técnica, ganhos de desempenho, topologia dos 3 clientes e estado atual dos 12 módulos.
2. [**01 - Arquitetura e Especificação do Core Rust**](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/docs/migracao-qt6-android/01-ARQUITETURA-E-CORE-RUST.md)
   - Concorrência SQLite WAL, streaming zero-copy de vídeo `ENC1`, motor FSRS v5 e criptografia Two-Tier Keychain.
3. [**02 - Mapa do Banco de Dados Canônico SQLite**](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/docs/migracao-qt6-android/02-MAPA-BANCO-DADOS-CANONICO.md)
   - As 51 tabelas de `/home/vini/.local/share/com.caderno.app/caderno.sqlite`, volumetria real, esquemas SQL e soft delete.
4. [**03 - Pontes de Interoperabilidade: C-ABI, UniFFI e Wasm**](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/docs/migracao-qt6-android/03-PONTES-INTEROP-CABI-UNIFFI-WASM.md)
   - Assinaturas de funções exportadas, gerenciamento de memória (Zero-Leak Discipline) e bindings.
5. [**04 - Guia Completo do Cliente Desktop Qt 6 (QML + C++)**](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/docs/migracao-qt6-android/04-DESKTOP-QT6-QML-GUIA-COMPLETO.md)
   - `SynapseDataController`, `libmpv` com OpenGL FBO acelerado na GPU, tokens de design system e atalhos de teclado.
6. [**05 - Guia do Aplicativo Mobile Android (Compose + Media3)**](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/docs/migracao-qt6-android/05-MOBILE-ANDROID-COMPOSE-GUIA.md)
   - Jetpack Compose, reprodução via Media3 `EncryptedChunkDataSource` e ciclo de vida do botão voltar.
7. [**06 - Checklist Exaustivo dos 12 Módulos**](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/docs/migracao-qt6-android/06-CHECKLIST-EXAUSTIVO-12-MODULOS.md)
   - Checklist detalhado item por item para cada funcionalidade de todos os 12 módulos do sistema.

