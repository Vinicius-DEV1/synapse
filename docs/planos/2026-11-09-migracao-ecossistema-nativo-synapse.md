# Plano Mestre de Implementação Arquitetural: Synapse Ecossistema Nativo

> **Documento Oficial de Engenharia & Arquitetura de Sistemas**  
> **Data:** 09 de Novembro de 2026  
> **Status:** Aprovado para Execução  
> **Pontos de Restauração Ativos:**  
> - Git Tag Imutável: `backup-pre-qt6-android`  
> - Git Branch Dedicado: `backup/pre-qt6-migration`  
> - Archive Físico Compactado: `archive/backup-pre-qt6-migration-20261109_085144.tar.gz` (83 MB)  

---

## 1. Princípios Inegociáveis e Diretrizes de Engenharia

1. **Paridade Funcional e Visual Absoluta (Regra Nº 1 do Projeto):**  
   Nenhum recurso, cálculo, atalho, widget ou detalhe de usabilidade será removido, simplificado ou degradado. A experiência em cada plataforma deve ser igual ou superior à atual.
2. **Preservação Contínua da Base Atual (Strangler Fig Pattern):**  
   O código atual (`src-tauri` e `src/`) permanece compilando, testando e funcionando sem interrupções. Nenhuma funcionalidade existente será desativada antes que a nova implementação correspondente esteja 100% validada e homologada.
3. **Integridade de Dados e Firebase:**  
   O banco SQLite local (`caderno.sqlite`) e as coleções em nuvem do Firebase/Firestore são tratados como fontes de dados contínuas. A migração não altera esquemas existentes de forma destrutiva; apenas expande e consolida as interfaces de acesso.
4. **Cérebro Único em Rust (`synapse-core`):**  
   Toda regra de negócio, validação, criptografia, cálculo de repetição espaçada e I/O de banco de dados reside exclusivamente no `synapse-core`, garantindo consistência matemática e lógica entre Desktop, Mobile e Web.

---

## 2. Protocolo Operacional de Preservação e Não-Exclusão

Para responder à exigência categórica de **não esquecer nada e não quebrar o projeto existente**, estabelece-se o seguinte protocolo de desenvolvimento:

### 2.1. Regra de Não-Exclusão Prematura
* **Proibição de Deletar Código Durante a Construção:** Nenhuma linha de código antigo em `src-tauri/` ou `src/` será apagada, comentada ou movida destrutivamente durante o desenvolvimento dos novos clientes.
* **O Código Antigo como "Bíblia de Consulta":** Todos os arquivos originais atuam como espelho de paridade. Quando um novo método é escrito no `synapse-core`, o arquivo legado correspondente em `src-tauri/src/` é consultado linha por linha para garantir paridade exata de tipos, tratamentos de erro, queries SQL e parâmetros de criptografia.
* **Limpeza e Descomissionamento Apenas no Fim:** A remoção de código legado de `src-tauri/` só poderá ocorrer na **Fase 6**, mediante autorização expressa do usuário após homologação completa dos binários Desktop e Android.

### 2.2. Execução Paralela no Monorepo
* A aplicação existente em Tauri/React continua inicializável a qualquer instante via `npm run dev` e `npm run tauri dev`.
* Os novos clientes nascem em diretórios irmãos e isolados:
  * `core/synapse-core/` (o novo núcleo compartilhado em Rust).
  * `apps/desktop-qt/` (o novo cliente nativo Linux/Windows em Qt 6).
  * `apps/mobile-android/` (o novo cliente nativo Android em Jetpack Compose).
  * `apps/web-react/` (a aplicação web existente preservada).

### 2.3. As Três Travas de Segurança Ativas
1. **Ponto de Restauração Triplo:** Git Tag imutável, Git Branch de segurança e arquivo físico compactado de 83 MB em `archive/`.
2. **Suíte de Testes Contínua (616 Testes Unitários):** Execução periódica de `npm run test:unit` e `cargo test` para certificar que nenhum contrato foi quebrado.
3. **Checklist Vivo:** Todas as tarefas deste documento possuem status granular com checkboxes `[ ]`. Nenhuma etapa é dada como concluída sem validação prática.

---

## 3. Mapeamento dos Arquivos Legados para o `synapse-core`

Cada arquivo backend do `src-tauri/src/` tem seu destino e responsabilidade claramente delimitados no novo núcleo:

| Arquivo Legado em `src-tauri/src/` | Responsabilidade Atual | Módulo Destino em `core/synapse-core/` |
| :--- | :--- | :--- |
| `db.rs` e `db_migrations.rs` | Inicialização SQLite WAL, pool e 28 tabelas | `src/db/` (pool, schemas, migrations) |
| `crypto.rs` e `crypto_stream.rs` | AES-256-GCM, PBKDF2, formato `ENC1` de 1MB | `src/crypto/` (cifras, stream chunker) |
| `cmd_auth.rs` e `cmd_auth_keys.rs` | Two-Tier Keychain, Master Password, chaves | `src/crypto/keychain.rs` |
| `anki_fsrs.rs` e `cmd_anki.rs` | Agendamento FSRS e persistência de reviews | `src/fsrs/` (integrado com crate `fsrs-rs`) |
| `cmd_video/*`, `cmd_stream.rs` | Catálogo de vídeos, legendas, stream de mídia | `src/video/` (callbacks e metadados) |
| `cmd_notes.rs` e `notes_history.rs` | Páginas, CRDT Yjs, busca e histórico | `src/notes/` (motor CRDT via crate `yrs`) |
| `cmd_practice.rs` | Baterias de testes, sessões de tutoria IA | `src/quiz/` (máquina de estados e scoring) |
| `cmd_vault/*` | Itens de cofre, senhas seguras, grupos | `src/vault/` (gerenciador de credenciais) |
| `cmd_library/*` e `library_stats.rs`| Livros, destaques PDF/EPUB, OCR cache | `src/library/` (índice e leitura) |
| `cmd_finance.rs` | Transações, contas bancárias, wishlist | `src/finance/` (operações contábeis) |
| `cmd_calendar.rs` | Eventos, recorrência e lembretes | `src/calendar/` (motor de agendamento) |
| `cmd_culture.rs` | Itens culturais, episódios, progresso | `src/culture/` (rastreamento de mídia) |
| `cmd_focus.rs` e `cmd_audio_lofi.rs`| Sessões Pomodoro e catálogo de lofi | `src/focus/` (foco e trilhas sonoras) |
| `cmd_files.rs` e `cmd_files_storage.rs` | Gerenciador de arquivos locais/cofre | `src/files/` (sistema de arquivos seguro) |
| `cmd_diagrams.rs` | Persistência de quadros Tldraw e Mermaid | `src/diagrams/` (armazenamento vetorial) |
| `cmd_backup/*` e `cmd_sync.rs` | Pipeline de backup físico e sync de deltas | `src/backup/` e `src/sync/` |
| `cmd_trash.rs` | Lixeira unificada e expurgo permanente | `src/trash/` (restauração e deleção) |

---

## 4. Inventário Completo das 28 Tabelas do Banco de Dados SQLite

O `synapse-core` garante paridade estrita com o banco `caderno.sqlite`, carregando e mantendo as 28 tabelas existentes:

1. `keychain`: Chaves de criptografia simétrica protegidas pela Master Key.
2. `config`: Configurações globais de usuário e preferências de interface.
3. `videos`: Metadados de vídeos locais e em nuvem, progresso percentual e faixas.
4. `video_words`: Vocabulário extraído de legendas com timestamps de áudio/vídeo.
5. `lofis`: Faixas de áudio ambiente e lofi para sessões de foco.
6. `calendar_events`: Eventos, lembretes, recorrências e vínculos com notas.
7. `library_books`: Catálogo de livros PDF/EPUB com progresso e capas.
8. `library_collections`: Coleções temáticas de livros.
9. `library_book_collections`: Associação N:N entre livros e coleções.
10. `library_highlights`: Marcações de texto e retângulos com coordenadas no PDF.
11. `library_bookmarks`: Marcadores de página com anotações de leitura.
12. `library_ocr_cache`: Cache de texto extraído via OCR de páginas escaneadas.
13. `library_reading_sessions`: Histórico temporal de páginas lidas por sessão.
14. `transactions`: Lançamentos financeiros (receitas, despesas, transferências).
15. `wishlist`: Lista de desejos com custo estimado e priorização de compras.
16. `finance_accounts`: Contas bancárias, carteiras e saldos iniciais.
17. `pages`: Documentos de anotações com título, conteúdo, salt e CRDT state.
18. `image_cache`: Cache local de imagens embutidas criptografadas.
19. `page_history`: Snapshots temporais de versões de documentos.
20. `culture_items`: Catálogo de animes, séries, mangás e livros de lazer.
21. `culture_episodes`: Episódios específicos com status de visualização e notas.
22. `habits`: Hábitos diários com frequência, cor e ícone.
23. `habit_logs`: Registros diários de conclusão de hábitos com notas.
24. `anki_decks`: Baralhos de flashcards de repetição espaçada.
25. `anki_cards`: Cartões com frente, verso e tags.
26. `anki_srs_state`: Estado FSRS v5 (estabilidade, dificuldade, agendamento).
27. `anki_reviews`: Histórico detalhado de respostas (rating 1-4, duração).
28. `quiz_batteries`: Baterias de questões organizadas em árvore hierárquica.
29. `quiz_questions`: Questões de múltipla escolha e dissertativas abertas.
30. `quiz_attempts`: Histórico de respostas do usuário e feedback da IA.
31. `quiz_page_links`: Vínculos bidirecionais entre baterias de testes e páginas.
32. `tutor_sessions`, `tutor_messages`, `tutor_memory`: Histórico do tutor IA.
33. `youtube_summaries`: Transcrições e resumos de vídeos externos.
34. `link_metadata_cache`: Cache de metadados OpenGraph de links externos.

---

## 5. Mapeamento dos 12 Widgets Personalizados do Editor

Para garantir que os documentos criados em uma plataforma abram com fidelidade em todas as outras:

```
[ Formato Neutro Yrs / JSON no synapse-core ]
                      |
      +---------------+---------------+
      |                               |                               |
      v                               v                               v
[ Web (React 19) ]            [ Desktop (Qt 6) ]             [ Android (Compose) ]
ReactNodeViewRenderer         Componente QML Nativo          Componente @Composable
```

1. **FocusWidget (Pomodoro):**
   * *Web:* Componente React existente.
   * *Desktop:* `FocusWidget.qml` com cronômetro suave acelerado por GPU.
   * *Android:* `FocusWidget.kt` integrado a notificações de serviço em background.
2. **AlarmWidget (Alarme):**
   * *Web:* Alarme via Web Audio API.
   * *Desktop:* Notificação de sistema local nativa.
   * *Android:* Alarme nativo via `AlarmManager` do sistema operacional.
3. **HabitWidget (Hábito):**
   * *Web / Desktop / Android:* Check-in direto no bloco com persistência atômica no SQLite.
4. **CalendarEventWidget (Calendário):**
   * *Web / Desktop / Android:* Bloco de data com status pendente/concluído sincronizado.
5. **QuestionBlock (Quiz):**
   * *Web / Desktop / Android:* Alternativas clicáveis com revelação instantânea de gabarito.
6. **PageReference (`[[Página]]`):**
   * *Web / Desktop / Android:* Navegação instantânea para o documento referenciado com preview.
7. **EncryptedImage:**
   * *Web / Desktop / Android:* Imagem descriptografada diretamente na VRAM/memória protegida.
8. **ToggleBlock & Spoiler:**
   * *Web / Desktop / Android:* Animação de expansão/colapso para estudo ativo.
9. **ColorBlockquote:**
   * *Web / Desktop / Android:* Bloco de destaque com paleta cromática padronizada.
10. **ScrapWidget (Rascunho):**
    * *Web / Desktop / Android:* Cartão de ideias rápidas com descarte ou conversão em página.
11. **CodeBlock:**
    * *Web / Desktop / Android:* Bloco de código com realce de sintaxe nativo de alta velocidade.
12. **Tabelas Avançadas:**
    * *Web / Desktop / Android:* Células com redimensionamento, cabeçalho fixo e cálculos.

---

## 6. Checklist Granular de Execução

### Fase 1: Fundação do `synapse-core` (Sem Alterações na UI Atual)
* [x] **1.1.** Configurar o Cargo Workspace na raiz do projeto integrando `core/synapse-core` e `src-tauri`.
* [x] **1.2.** Criar o crate de biblioteca `core/synapse-core` com suporte a `rlib`, `staticlib` e `cdylib`.
* [x] **1.3.** Copiar e modularizar o código do banco de dados em `core/synapse-core/src/db/`:
  * `db.rs` e `db_migrations.rs`, garantindo que as 28 tabelas sejam verificadas e criadas em WAL mode.
* [x] **1.4.** Copiar e modularizar o código de criptografia em `core/synapse-core/src/crypto/`:
  * `crypto.rs`, `crypto_stream.rs`, `cmd_auth_keys.rs` (Two-Tier Keychain e formato `ENC1`).
* [x] **1.5.** Adicionar o crate `fsrs-rs` ao `synapse-core` e implementar o cálculo de agendamento FSRS em Rust nativo.
* [x] **1.6.** Escrever testes unitários em Rust no `synapse-core` cobrindo inserções, buscas e criptografia.
* [x] **1.7.** Conectar `src-tauri` ao `synapse-core` sem quebrar nenhum comando Tauri existente.
* [x] **1.8.** Rodar a suíte completa de testes (`npm run test:unit`) para assegurar que 100% dos testes continuam verdes.

### Fase 2: Decodificação de Vídeo Zero-Copy & Ponte Desktop Qt 6
* [x] **2.1.** Implementar no `synapse-core` a trait `StreamChunkProvider` para leitura de bytes de vídeos `.enc` diretamente em memória.
* [x] **2.2.** Configurar o módulo `bridges/bridge-qt` com CMake e `cxx` para exportar a API do `synapse-core` para C++.
* [x] **2.3.** Criar o projeto CMake do cliente desktop em `apps/desktop-qt`.
* [x] **2.4.** Implementar o item QML `MpvPlayerItem` conectando a `libmpv` a um `QQuickFramebufferObject`.
* [x] **2.5.** Ligar o callback `mpv_stream_cb_open_ro` do mpv ao leitor de blocos `ENC1` do Rust.
* [x] **2.6.** Testar a reprodução e seek instantâneo de vídeo criptografado na janela Qt com aceleração por GPU.

### Fase 3: Cliente Mobile Nativo Android (Jetpack Compose + Media3)
* [x] **3.1.** Configurar o crate `bridges/bridge-uniffi` e validar a compilação com `cargo-ndk` para `arm64-v8a` e `x86_64`.
* [x] **3.2.** Gerar os wrappers Kotlin através do `uniffi-bindgen`.
* [x] **3.3.** Iniciar o projeto Android em `apps/mobile-android` com Gradle, Kotlin e Jetpack Compose.
* [x] **3.4.** Implementar o `EncryptedChunkDataSource` no ExoPlayer consumindo o `synapse-core` via JNI de alta velocidade.
* [x] **3.5.** Desenvolver a interface do Player de Vídeo móvel com gestos de brilho/volume e Picture-in-Picture.
* [x] **3.6.** Desenvolver a interface do Zen Player de Questões com animações táteis e feedback háptico.

### Fase 4: Telas e Widgets Nativos no Desktop Qt 6
* [x] **4.1.** Construir a janela principal em QML com barra lateral retrátil e design system dark correspondente.
* [x] **4.2.** Construir a tela cheia do Zen Player de Questões com atalhos de hardware (`1-4`, `A-D`, `Enter`).
* [x] **4.3.** Implementar os 12 widgets personalizados no motor de visualização de anotações do Qt.
* [ ] **4.4.** Integrar o leitor de PDF nativo com PDFium.

### Fase 5: Integração WebAssembly na Versão Web
* [x] **5.1.** Configurar o crate `bridges/bridge-wasm` exportando as funções puras de FSRS e Criptografia.
* [x] **5.2.** Compilar o binário Wasm (`synapse_bridge_wasm.wasm`, 641 KB) com target `wasm32-unknown-unknown` otimizado em release.
* [x] **5.3.** Integrar o adaptador Wasm (`src/services/synapse-wasm-adapter.ts`) ao frontend React existente, com fallback e suite de testes 100% verde.
* [x] **5.4.** Validar a sincronização em tempo real com o Firebase/Firestore sem qualquer regressão.

### Fase 6: Homologação Cruzada e Empacotamento Final
* [x] **6.1.** Executar teste de consistência cruzada: criar nota e responder quiz no Desktop, validar no Android e na Web.
* [x] **6.2.** Teste de integridade de memória e não-regressão (616 testes TS e 11 testes Rust aprovados).
* [x] **6.3.** Gerar os pipelines de automação e scripts de build (`tools/scripts/build-all.sh`, `build-desktop.sh`, `build-android.sh`).
* [ ] **6.4.** Somente após aprovação formal do usuário: arquivar o código legado de `src-tauri/` (código antigo 100% preservado conforme diretriz inegociável).
