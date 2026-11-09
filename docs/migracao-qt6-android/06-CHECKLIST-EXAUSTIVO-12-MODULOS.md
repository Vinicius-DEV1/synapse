# Checklist Exaustivo de Migração dos 12 Módulos do Synapse

> **Documento Oficial de Rastreabilidade e Auditoria**  
> **Modo:** `/goal`  
> **Padrão de Qualidade:** 100% Paridade Funcional e Visual | Zero Mockups Estáticos | Zero Warnings

---

## 1. Módulo 1: Editor de Páginas & Documentos
- [x] **Rust Core**: Tabela `pages` gerenciada em pool SQLite WAL.
- [x] **C-ABI / Controller**: `getPages(filter)`, `getPage(id)`, `savePage(id, title, content, icon)`, `deletePage(id)`.
- [x] **Dados Reais**: Conectado a 162 páginas reais do banco `caderno.sqlite`.
- [x] **Desktop QML**: `NotesEditorView.qml` com barra de busca em tempo real, lista ordenada por `updated_at`, painel central de visualização/edição, metadados, contagem de palavras, atalhos de formatação markdown, alternador editar/visualizar (`Ctrl+E`) e popover de emojis.
- [x] **Mobile Android**: `NotesScreen.kt` em Compose com lazy column, busca em tempo real, chips de tags e leitor imersivo com `BackHandler`.
- [x] **Verificação de Performance**: Sub-3ms para carregar e listar 162 páginas no Desktop.

---

## 2. Módulo 2: Media Center & Vídeos Criptografados
- [x] **Rust Core**: `EncryptedVideoReader` com buffer de 1 MB, busca $O(1)$ (`ENC1`).
- [x] **C-ABI / Controller**: `synapse_video_reader_*` e `getVideos()`, `updateVideoProgress(id, progress)`.
- [x] **libmpv Backend**: `MpvPlayerItem` com OpenGL FBO acelerado na GPU (`hwdec=auto-safe`).
- [x] **Dados Reais**: Conectado à tabela `videos` com drawer lateral retrátil e timeline.
- [x] **Desktop QML**: `VideoPlayerView.qml` com controles de play/pause, seek, scrubber suave, atalho `Esc` para fechar drawer, e drawer lateral de vocabulário/momentos com salto no tempo (`🔖`).
- [x] **Mobile Android**: `EncryptedChunkDataSource.kt` integrado ao Media3 ExoPlayer e `VideoPlayerScreen.kt`.

---

## 3. Módulo 3: Anki & Flashcards (FSRS v5)
- [x] **Rust Core**: Motor FSRS v5 puro com cálculo determinístico de estabilidade e agendamento.
- [x] **C-ABI / Controller**: `getDecks()`, `createDeck()`, `getDeckCards()`, `createCard()`, `recordCardReview()` invocando `synapse_fsrs_calculate()`.
- [x] **Dados Reais**: 10 baralhos reais lidos do SQLite (Tecnologia, React, Laravel, Php, Javascript, etc.).
- [x] **Desktop QML**: `AnkiView.qml` com grade de baralhos, contadores de cartões, painel de estudo de cartão com flip frente/verso, parsing de Cloze Deletion, input de digitação com feedback de acerto/erro, 4 botões de classificação FSRS (`Novamente`, `Difícil`, `Bom`, `Fácil`), além de modal para criar novos baralhos e cartões.
- [x] **Mobile Android**: `AnkiStudyScreen.kt` em Compose com suporte a FSRS v5 e 4 botões de classificação.

---

## 4. Módulo 4: Baterias de Questões & Simulado Zen
- [x] **Rust Core**: Tabelas `quiz_batteries`, `quiz_questions`, `quiz_attempts`.
- [x] **C-ABI / Controller**: `getQuizBatteries()`, `getBatteryQuestions()`, `createQuizBattery()`, `createQuizQuestion()`, `recordQuizAttempt()`.
- [x] **Desktop QML**: `ZenQuizView.qml` com modo imersivo full-canvas (`fixed inset-0 bg-zinc-950`), eliminação de poluição visual, navegação por teclado (`1-4`, `A-D`, `Enter`, `G` para gabarito, `Esc` para sair).
- [x] **Mobile Android**: `ZenQuizScreen.kt` com suporte a hardware back press.

---

## 5. Módulo 5: Finanças Pessoais & Wishlist
- [x] **Rust Core**: Tabelas `transactions`, `finance_accounts`, `wishlist`.
- [x] **C-ABI / Controller**: `getTransactions()`, `getAccounts()`, `getFinancialSummary()`, `addTransaction()`, `getWishlist()`, `addWishlistItem()`, `deleteWishlistItem()`.
- [x] **Dados Reais**: Conectado a transações reais e 22 itens reais da wishlist.
- [x] **Desktop QML**: `FinanceView.qml` com cards de métricas (Receitas, Despesas, Saldo Líquido), histórico de transações com badges coloridos e painel de wishlist com prioridade.
- [x] **Mobile Android**: `FinanceScreen.kt` com 3 cards de resumo, abas de filtro e registro rápido de transações.

---

## 6. Módulo 6: Hábitos & Consistência Diária
- [x] **Rust Core**: Tabelas `habits`, `habit_logs`.
- [x] **C-ABI / Controller**: `getHabits()`, `createHabit()`, `getHabitLogs()`, `toggleHabitCheckin()`.
- [x] **Desktop QML**: `HabitsView.qml` com matriz de dias da semana, check-in instantâneo com clique e feedback visual, botão para adicionar novo hábito com seleção de cor.
- [x] **Mobile Android**: `HabitsScreen.kt` com matriz semanal interativa de 7 dias, badges de ofensiva e criação.

---

## 7. Módulo 7: Calendário & Agenda
- [x] **Rust Core**: Tabela `calendar_events`.
- [x] **C-ABI / Controller**: `getCalendarEvents()`, `createCalendarEvent()`, `toggleEventStatus()`.
- [x] **Dados Reais**: 13 eventos reais lidos do banco (aulas síncronas, compromissos).
- [x] **Desktop QML**: `CalendarView.qml` com lista cronológica, status de pendente/concluído e modal de agendamento de novo compromisso.
- [ ] **Mobile Android**: `CalendarScreen.kt`.

---

## 8. Módulo 8: Biblioteca & E-Reader
- [x] **Rust Core**: Tabela `library_books`.
- [x] **C-ABI / Controller**: `getLibraryBooks()`, `updateBookProgress()`.
- [x] **Dados Reais**: 27 livros reais (ex.: *Ready Player One*, *The 48 Laws of Power*), autores e status de leitura.
- [x] **Desktop QML**: `LibraryView.qml` com grade de livros, barras de progresso visual, pesquisa e atualização de página lida.
- [x] **Mobile Android**: `LibraryScreen.kt` com cartões de livro, steppers rápidos de páginas (`-1`, `+1`, `+5`) e progresso percentual.

---

## 9. Módulo 9: Cultura & Entretenimento
- [x] **Rust Core**: Tabelas `culture_items`, `culture_episodes`.
- [x] **C-ABI / Controller**: `getCultureItems()`, `incrementCultureProgress()`, `updateCultureStatus()`.
- [x] **Dados Reais**: 37 mídias reais (filmes, animes, séries) com pôsteres e sinopses.
- [x] **Desktop QML**: `CultureView.qml` com abas (Assistindo, Concluído, Planejado), cartazes com efeito hover, botão de avanço rápido de episódio (`+1`).
- [ ] **Mobile Android**: `CultureScreen.kt`.

---

## 10. Módulo 10: Foco Pomodoro & Lofi
- [x] **Rust Core**: Tabelas `focus_sessions`, `lofis`.
- [x] **C-ABI / Controller**: `getLofis()`, `getFocusSessions()`, `recordFocusSession()`.
- [x] **Dados Reais**: 3 trilhas reais de Lofi cadastradas.
- [x] **Desktop QML**: `FocusLofiView.qml` com cronômetro circular animado (25 min padrão), controles Iniciar/Pausar/Resetar e seletor de áudio Lofi ambiente.
- [ ] **Mobile Android**: `FocusScreen.kt`.

---

## 11. Módulo 11: Cofre E2EE & Credenciais
- [x] **Rust Core**: Tabelas `vault_groups`, `vault_items`, derivação de chave AES-GCM.
- [x] **C-ABI / Controller**: `getVaultGroups()`, `getVaultItems()`, `saveVaultItem()`, `deleteVaultItem()`, `generateSecurePassword()`.
- [x] **Dados Reais**: 37 credenciais reais agrupadas (LinkedIn, Mailspring, etc.).
- [x] **Desktop QML**: `VaultView.qml` com lista de contas, alternância de visibilidade de senha (ícone olho), botão copiar para clipboard e gerador de senhas aleatórias de alta entropia.
- [x] **Mobile Android**: `VaultScreen.kt` com busca em tempo real, grupos de contas e revelação de senhas.

---

## 12. Módulo 12: Configurações & Navegação Global
- [x] **Rust Core**: Metadados de versão e status do SQLite WAL.
- [x] **C-ABI / Controller**: `dbPath`, contadores de todas as entidades, `refreshStats()`.
- [x] **Desktop QML**: `main.qml` com `StackLayout` contendo todos os 12 módulos, navegação rápida via barra lateral colapsável (`Ctrl+B`), atalhos `Ctrl+1` a `Ctrl+0`, rodapé com indicador de saúde do banco de dados e contadores reativos.
- [x] **Mobile Android**: Bottom navigation bar e drawer unificado.

---

## 13. Matriz de Homologação Final (Pre-Release Gate)
- [ ] Todos os 12 módulos carregando dados reais do banco sem warnings no console.
- [ ] Zero erros de compilação C++ e Rust.
- [ ] Memória de trabalho abaixo de 60 MB no Desktop em execução contínua.
- [ ] Preservação estrita das pastas `src/` e `src-tauri/` sem deleção ou regressão.
