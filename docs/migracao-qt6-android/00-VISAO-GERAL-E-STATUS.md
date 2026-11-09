# Synapse: Visão Geral da Reconstrução Nativa & Matriz de Status

> **Documento Oficial de Engenharia & Transição de Ecossistema**  
> **Status:** Em Andamento Ativo (Modo `/goal`)  
> **Última Atualização:** 09/11/2026  
> **Alvo Primário:** Qt 6 (Desktop nativo Linux/macOS/Windows) + Jetpack Compose (Android nativo) + WebAssembly (Web Browser), compartilhando `synapse-core` (Rust puro).

---

## 1. Missão e Motivação da Reconstrução

O projeto **Synapse** (antigo Caderno) nasceu como um monólito híbrido desktop e web utilizando Tauri v1/v2, React 19, TypeScript e WebView. Embora funcional, o uso de WebView impunha gargalos estruturais documentados:
- **Consumo de Memória (RAM):** 250–450 MB por instância ativa devido ao motor Chromium/Blink/WebKit embutido.
- **Latência de Decodificação de Mídia:** Incapacidade de decodificar fluxos de vídeo criptografados em 4K/60FPS com aceleração direta zero-copy por hardware na GPU.
- **Jank de Rolagem em Coleções Grandes:** Mesmo com virtualização, o DOM do navegador sofre com layout thrashing e overhead de garbage collection em listas com milhares de notas e cartões Anki.
- **Mobile WebView Fragile:** A experiência em Android dependia de um shell WebView com inconsistências de renderização, gerenciamento deficiente de ciclo de vida e renderização de vídeo com buffering excessivo.

### O Novo Paradigma Arquitetural: "Trindade Nativa + Cérebro Rust Compartilhado"

```
+-----------------------------------------------------------------------------------+
|                              SYNAPSE ECOSYSTEM                                    |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +---------------------+   +-------------------------+   +---------------------+  |
|  |     DESKTOP         |   |         MOBILE          |   |        WEB          |  |
|  |  Qt 6.7+ (C++/QML)  |   |  Jetpack Compose Kotlin |   |  React 19 + Vite    |  |
|  |  + libmpv (GPU HW)  |   |  + Media3 (ExoPlayer)   |   |  (PWA / Browser)    |  |
|  +----------+----------+   +------------+------------+   +----------+----------+  |
|             |                           |                           |             |
|             v                           v                           v             |
|      [bridge-qt (C-ABI)]     [bridge-uniffi (UniFFI)]      [bridge-wasm (Wasm)]   |
|             |                           |                           |             |
|             +---------------------------+---------------------------+             |
|                                         |                                         |
|                                         v                                         |
|                       +-----------------------------------+                       |
|                       |        SYNAPSE-CORE (Rust)        |                       |
|                       | - SQLite WAL (rusqlite)           |                       |
|                       | - E2EE PBKDF2/AES-GCM (Two-Tier)  |                       |
|                       | - FSRS v5 Spaced Repetition       |                       |
|                       | - Zero-Copy Video Chunk Reader    |                       |
|                       | - Fuzzy Text Search & Indexer     |                       |
|                       +-----------------+-----------------+                       |
|                                         |                                         |
|                                         v                                         |
|                       +-----------------------------------+                       |
|                       |   CANONICAL SQLITE DATABASE       |                       |
|                       |   ~/.local/share/com.caderno.app/ |                       |
|                       |   caderno.sqlite (114 MB, 51 tbl) |                       |
|                       +-----------------------------------+                       |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Princípios Inegociáveis para Qualquer Agente ou Desenvolvedor

1. **Paridade Funcional e Visual Sagrada (100%):**
   - Jamais simplificar regras de negócio, remover funcionalidades ou alterar a paleta de cores e o design token `#0f0e17` (`bg-dark-bg`), `#10b981` (emerald/acerto), `#f43f5e` (rose/erro), `#f59e0b` (amber/gabarito).
2. **Dados Reais do Usuário Sem Mockups:**
   - O banco de dados canônico ativo é `/home/vini/.local/share/com.caderno.app/caderno.sqlite`. O app deve carregar dados reais existentes (páginas, livros, cultura, transações, cofre, lofis, baralhos Anki) e permitir gravação instantânea no banco.
3. **Preservação de Código Legado:**
   - As pastas `src/` e `src-tauri/` são estritamente preservadas para testes de não-regressão e compatibilidade web. Nenhuma linha existente deve ser deletada sem homologação formal.
4. **Targeted Sub-Second Testing:**
   - Nunca rodar a suíte global cega (`npm test`) durante o ciclo de desenvolvimento iterativo. Usar testes direcionados (`npx vitest run <path>`, `cargo test -p synapse-core`, `cargo check --workspace`).

---

## 3. Matriz de Status dos 12 Módulos do Sistema

| # | Módulo | Core Rust | C-ABI / Controller C++ | Desktop Qt 6 (QML) | Android Compose | Status Atual |
|---|---|:---:|:---:|:---:|:---:|:---:|
| 1 | **Editor de Páginas & Documentos** | ✅ Concluído | ✅ Concluído | ✅ Concluído (162 pág reais, depth*16px, Fixados, toolbar MD, zen mode) | ✅ Concluído (`NotesScreen.kt`) | 🟢 100% Funcional (Desktop + Android) |
| 2 | **Media Center & Vídeo Criptografado** | ✅ Concluído | ✅ Concluído (`libmpv`) | ✅ Concluído (galeria, coleções, player GPU, speed 0.75-2.0x, drawer de momentos) | ✅ Concluído (Media3 + `VideoPlayerScreen.kt`) | 🟢 100% Funcional (Desktop + Android) |
| 3 | **Anki & Flashcards (FSRS v5)** | ✅ Concluído | ✅ Concluído (FSRS + CRUD) | ✅ Concluído (árvore depth*24px, 3 círculos, DeckBrowser, dashboard FSRS, cloze parsing, flip anim) | ✅ Concluído (`AnkiStudyScreen.kt`) | 🟢 100% Funcional (Desktop + Android) |
| 4 | **Baterias de Questões & Simulado Zen** | ✅ Concluído | ✅ Concluído (attempts + CRUD) | ✅ Concluído (explorador, criação, modo zen 1-4/A-D, gabarito [G]) | ✅ Concluído (`ZenQuizScreen.kt`) | 🟢 100% Funcional (Desktop + Android) |
| 5 | **Finanças Pessoais & Wishlist** | ✅ Concluído | ✅ Concluído (summary + CRUD) | ✅ Concluído (3 cards, transações, wishlist, exclusão reativa) | ✅ Concluído (`FinanceScreen.kt`) | 🟢 100% Funcional (Desktop + Android) |
| 6 | **Hábitos & Consistência Diária** | ✅ Concluído | ✅ Concluído (range logs + CRUD)| ✅ Concluído (matriz 7 dias de ofensiva, checkins interativos, criação) | ✅ Concluído (`HabitsScreen.kt`) | 🟢 100% Funcional (Desktop + Android) |
| 7 | **Calendário & Agenda** | ✅ Concluído | ✅ Concluído (events + toggle) | ✅ Concluído (filtros Todos/Pendentes/Concluídos, busca, criação) | 🟡 Planejado | 🟢 100% Funcional no Desktop |
| 8 | **Biblioteca & E-Reader** | ✅ Concluído | ✅ Concluído (books + progress)| ✅ Concluído (steppers -5/-1/+1/+5/+10, modal leitura, criação) | ✅ Concluído (`LibraryScreen.kt`) | 🟢 100% Funcional (Desktop + Android) |
| 9 | **Cultura & Entretenimento** | ✅ Concluído | ✅ Concluído (items + steppers) | ✅ Concluído (filtros mídia/status, busca, steppers -1/+1 Ep, criação) | 🟡 Planejado | 🟢 100% Funcional no Desktop |
| 10 | **Foco Pomodoro & Lofi** | ✅ Concluído | ✅ Concluído (sessions + lofis)| ✅ Concluído (timer circular, pills de categoria, banner diário, lofis) | 🟡 Planejado | 🟢 100% Funcional no Desktop |
| 11 | **Cofre E2EE & Credenciais** | ✅ Concluído | ✅ Concluído (vault CRUD + gen) | ✅ Concluído (filtros de grupos, busca em tempo real, cópia para clipboard) | ✅ Concluído (`VaultScreen.kt`) | 🟢 100% Funcional (Desktop + Android) |
| 12 | **Configurações & Navegação Global**| ✅ Concluído | ✅ Concluído (counts + paths)  | ✅ Concluído (sidebar com badges de todos os módulos, grid 11 métricas) | ✅ Concluído (`MainActivity.kt` + BottomSheet) | 🟢 100% Funcional (Desktop + Android) |

---

## 4. Guia Rápido de Compilação e Execução

### Desktop Qt 6:
```bash
# Compilar bibliotecas Rust do workspace
cargo build --release --workspace

# Compilar binário Desktop Qt 6
./tools/scripts/build-desktop.sh

# Executar cliente nativo Desktop
./apps/desktop-qt/build/synapse-desktop
```

### Android (Gradle):
```bash
cd apps/mobile-android
./gradlew assembleDebug
```

### WebAssembly (Web):
```bash
cargo build --release -p synapse-bridge-wasm --target wasm32-unknown-unknown
```

### Testes Rápidos de Verificação:
```bash
cargo test -p synapse-core
npx vitest run src/services/synapse-wasm-adapter.test.ts
npx tsc -b --noEmit
```
