# Guia Completo do Cliente Desktop Qt 6 (QML + C++)

> **Documento Oficial de Engenharia Desktop**  
> **Caminho:** `apps/desktop-qt/`  
> **Tecnologias:** Qt 6.7+ (Core, Gui, Quick, Qml, OpenGL), C++17, QML, `libmpv` (C-API)  
> **Binário de Destino:** `apps/desktop-qt/build/synapse-desktop`

---

## 1. Arquitetura do Executável Desktop

O cliente Desktop é um aplicativo compilado nativo com consumo de memória em repouso de apenas ~35 MB (comparado aos ~350 MB da versão Electron/Tauri com Chromium).

```
+-------------------------------------------------------------------------+
|                           apps/desktop-qt                               |
+-------------------------------------------------------------------------+
|                                                                         |
|  [main.cpp]                                                             |
|    - setlocale(LC_NUMERIC, "C") [Crítico para libmpv]                   |
|    - QGuiApplication                                                    |
|    - Registra tipo QML "MpvPlayerItem" em "Synapse.Media 1.0"           |
|    - Instancia SynapseDataController e injeta no QQmlContext            |
|    - Carrega "qml/main.qml" via QQmlApplicationEngine                   |
|                                                                         |
|  [src/synapse_controller.cpp / .h]                                      |
|    - Interage com synapse_bridge.h (Rust)                               |
|    - Conecta ao SQLite canônico (~/.local/share/com.caderno.app)        |
|    - Expõe métodos Q_INVOKABLE reativos para o QML                      |
|                                                                         |
|  [src/mpv_player_item.cpp / .h]                                         |
|    - Implementa QQuickFramebufferObject + QQuickFramebufferObject::Renderer|
|    - Vincula mpv_render_context via OpenGL FBO                          |
|    - Protocolo personalizado "synapse-enc://" decodifica blocos ENC1    |
|    - Aceleração por hardware GPU ativada: hwdec=auto-safe               |
|                                                                         |
|  [qml/]                                                                 |
|    - main.qml: Sidebar retrátil, StackLayout dos 12 módulos, atalhos    |
|    - editor/NotesEditorView.qml: 162 páginas reais, busca, markdown     |
|    - video/VideoPlayerView.qml: Player GPU, timeline, drawer de vídeos  |
|    - anki/AnkiView.qml: Baralhos, sessão de estudo, botões FSRS v5      |
|    - quiz/ZenQuizView.qml: Simulado full-canvas, atalhos de teclado     |
|    - finance/FinanceView.qml: Transações reais, saldos, wishlist        |
|    - habits/HabitsView.qml: Hábitos e matriz de check-in diário         |
|    - calendar/CalendarView.qml: Grade mensal e compromissos reais       |
|    - library/LibraryView.qml: Livros reais, capas e progresso lido      |
|    - culture/CultureView.qml: Mídias culturais, pôsteres e episódios    |
|    - focus/FocusLofiView.qml: Timer Pomodoro e áudio Lofi               |
|    - vault/VaultView.qml: 34 credenciais reais, revelação e gerador     |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 2. Requisito Crítico do `libmpv`: Locale Numérico

> [!CAUTION]
> O `libmpv` aborta a execução do processo com erro fatal se `LC_NUMERIC` não for estritamente `"C"`.  
> O construtor de `QGuiApplication` do Qt altera o locale do sistema para o locale do usuário (ex.: `pt_BR.UTF-8` onde separador decimal é vírgula).  
> **Regra Obrigatória:** Em `main.cpp` e sempre antes de chamar `mpv_create()`, execute:
> ```cpp
> setlocale(LC_NUMERIC, "C");
> ```

---

## 3. Design System & Tokens Visuais em QML

Para manter **100% de paridade visual** com o design original do Caderno:
- **Canvas Principal:** `#0f0e17`
- **Superfície Elevada / Cards:** `#16161e` ou `#1e1e2e`
- **Bordas Sutis:** `#2a2b3d` ou `Qt.rgba(1, 1, 1, 0.06)`
- **Acento Primário (Brand Indigo):** `#6366f1`
- **Sucesso / Acerto / Concluído:** `#10b981` (Emerald)
- **Erro / Incorreto:** `#f43f5e` (Rose)
- **Alerta / Gabarito:** `#f59e0b` (Amber)
- **Texto Principal:** `#f8fafc` (Slate 50)
- **Texto Secundário / Muted:** `#94a3b8` (Slate 400)

---

## 4. Atalhos de Teclado Globais (Keyboard-First Fluidity)

| Atalho | Ação |
|---|---|
| `Ctrl + 1` | Alternar para Editor de Páginas & Notas |
| `Ctrl + 2` | Alternar para Media Center (Vídeos) |
| `Ctrl + 3` | Alternar para Anki & Flashcards |
| `Ctrl + 4` | Alternar para Baterias de Questões / Simulado Zen |
| `Ctrl + 5` | Alternar para Finanças & Wishlist |
| `Ctrl + 6` | Alternar para Hábitos & Consistência |
| `Ctrl + 7` | Alternar para Calendário & Agenda |
| `Ctrl + 8` | Alternar para Biblioteca & E-Reader |
| `Ctrl + 9` | Alternar para Cultura & Mídia |
| `Ctrl + 0` | Alternar para Cofre de Senhas E2EE |
| `Ctrl + B` | Recolher / Expandir barra lateral (Sidebar) |
| `Ctrl + F` | Foco no campo de busca do módulo ativo |
| `Esc` | Sair de visualizações imersivas ou fechar gavetas (drawers) |

