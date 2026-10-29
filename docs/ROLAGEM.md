# Auditoria e Otimização de Rolagem e Fluidez de Interface

Este documento consolida a metodologia, diagnósticos de perfilamento (profiler com Chrome DevTools Protocol), medições de linha de base inicial, causas raízes comprovadas por evidência e o plano de ação atômico para garantir **60 FPS estáveis** em todos os módulos do **Synapse**, com prioridade máxima no **Módulo de Questões e Quiz**.

---

## 1. Metodologia de Medição e Condições de Execução

- **Script de Reprodução**: `npm run benchmark:scroll` (`scripts/benchmark-scroll.mjs`)
- **Motor de Renderização**: Google Chrome 156.0.8078.73 (Headless com Chrome DevTools Protocol nativo)
- **Aceleração / Throttling**: **4x CPU Throttling** (`Emulation.setCPUThrottlingRate({ rate: 4 })`)
- **Viewports Testados**:
  1. **Desktop**: `1920 x 1080` (escala 1x)
  2. **Mobile WebView**: `390 x 844` (escala 3x, emulação de toque e inércia mobile)
- **Volume de Dados em Escala**:
  - **Quiz & Questões Player**: 200 questões completas (enunciados, 4 alternativas estilizadas, tags, gabaritos e histórico)
  - **Questions Explorer Tree**: 30 baterias com 300 questões em árvore hierárquica recursiva
  - **Anki Flashcards**: 300 cartões de repetição espaçada FSRS
  - **Notas / Editor**: 100 blocos ricos (parágrafos, cabeçalhos, blocos de código com `ScrollablePre` e tabelas)
  - **Cofre de Senhas**: 200 credenciais criptografadas completas
- **Rigor Estatístico**: 5 iterações por cenário. A 1ª iteração é descartada como warmup de JIT e cache. Reportados a mediana, valores mínimos, máximos e variação percentual `((max - min) / mediana) * 100`.

---

## 2. Linha de Base Inicial (`pre-scroll`)

Medições coletadas na tag `pre-scroll` sob CPU limitada em 4x:

| Módulo / Viewport | Duração Média Quadro | p95 Quadro | Quadros Perdidos (>16,6ms) | Tarefas Longas (>50ms) | Recálculo Layout + Estilo | Duração Total Tarefas | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Quiz Player (Desktop)** | **17,78 ms** | **16,80 ms** | 355 | **2** | **476,45 ms** | 4.797,12 ms | 🔴 Crítico |
| **Quiz Player (Mobile)** | **17,74 ms** | **16,80 ms** | 353 | **2** | **457,08 ms** | 3.623,27 ms | 🔴 Crítico |
| **Anki Flashcards (Desktop)** | **18,02 ms** | **33,30 ms** | 366 | 0 | 0,00 ms | 4.186,45 ms | 🟠 Queda 30fps |
| **Anki Flashcards (Mobile)** | **17,23 ms** | **16,70 ms** | 367 | **2** | **238,46 ms** | 3.309,82 ms | 🟠 Instável |
| **Vault Records (Desktop)** | **22,34 ms** | **33,40 ms** | 342 | 0 | 0,00 ms | 4.012,63 ms | 🔴 Queda 30fps |
| **Vault Records (Mobile)** | **16,80 ms** | **16,80 ms** | 380 | 0 | 0,00 ms | 4.629,86 ms | 🟡 Regular |
| **Questions Explorer (Desktop)** | **16,69 ms** | **16,75 ms** | 375 | 0 | 0,00 ms | 4.864,58 ms | 🟡 Regular |
| **Questions Explorer (Mobile)** | **16,72 ms** | **16,75 ms** | 378 | 0 | 0,00 ms | 3.268,34 ms | 🟡 Regular |
| **Notes Document (Desktop)** | **16,66 ms** | **16,70 ms** | 375 | 0 | 0,00 ms | 655,93 ms | 🟢 Fluido |
| **Notes Document (Mobile)** | **16,67 ms** | **16,75 ms** | 372 | 0 | 0,00 ms | 1.098,56 ms | 🟢 Fluido |

---

## 3. Causas Encontradas (Ordenadas por Impacto Medido)

### Causa 1: Falta de `content-visibility: auto` e `contain-intrinsic-size` no Quiz e Questões (Impacto: 476,45 ms de Layout/Estilo e 2 Tarefas Longas)
- **Evidência**:
  - Em [QuizPlayer.tsx](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/src/components/editor-extensions/quiz/components/QuizPlayer.tsx#L117-L127) e [QuizPlayerCard.tsx](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/src/components/editor-extensions/quiz/components/QuizPlayerCard.tsx#L79-L104), cada questão montada na tela renderiza dezenas de elementos (markdown, opções de múltipla escolha, botões, tags, gabarito e histórico).
  - Sem isolamento de layout (`content-visibility: auto`), o motor Chromium/WebKit é forçado a calcular o layout de todas as 200 questões simultaneamente a cada frame de rolagem.
  - Isso gera **476,45 ms** de Recálculo de Layout + Estilo na thread principal e **2 tarefas longas** que travam a interface sob CPU 4x.
- **Arquivos**:
  - `src/components/editor-extensions/quiz/components/QuizPlayerCard.tsx`
  - `src/components/editor-extensions/quiz/components/QuizEditorCard.tsx`
  - `src/components/questions/BatteryQuestionsPreview.tsx`

### Causa 2: `transition-all` em Elementos de Lista e Cards que Rolam (Impacto: Quedas para 30 FPS / p95 de 33,4 ms)
- **Evidência**:
  - Em `QuizPlayerCard.tsx` (linha 95), `CardListView.tsx` e `VaultItemList.tsx`, os containers utilizam a classe Tailwind `transition-all duration-200`.
  - A propriedade `transition-all` força o navegador a observar e interpolar propriedades geométricas (`width`, `height`, `padding`, `margin`, `border-width`), impedindo a aceleração 100% via compositor de GPU.
  - No Cofre (`vault-records`), isso elevou a média de quadro para **22,34 ms** e p95 para **33,40 ms** (queda severa para ~30 fps).
- **Arquivos**:
  - `src/components/editor-extensions/quiz/components/QuizPlayerCard.tsx`
  - `src/components/vault/components/VaultItemList.tsx`
  - `src/components/anki/CardListView.tsx`
  - `src/components/questions/BatteryTreeItem.tsx`

### Causa 3: Listeners Globais de Rolagem Sem `{ passive: true }` (Impacto: Compositor Thread Bloqueada)
- **Evidência**:
  - Em `src/hooks/useActivityTracker.ts` (linha 45) e `src/hooks/useTimeTracker.ts` (linha 66):
    ```typescript
    window.addEventListener('scroll', handleActivity);
    ```
  - Ambos os hooks registram listeners de `scroll` na janela global sem `{ passive: true }`. O compositor do navegador é obrigado a esperar a execução síncrona do JavaScript antes de realizar o deslocamento da rolagem.
- **Arquivos**:
  - `src/hooks/useActivityTracker.ts`
  - `src/hooks/useTimeTracker.ts`
  - `src/components/editor/components/SlashMenu.tsx`
  - `src/components/editor/hooks/useBlockHandle.ts`

### Causa 4: Ausência de Camadas Aceleradas por Hardware (`transform: translateZ(0)`) e `overscroll-behavior: contain` nos Containers Principais (Impacto: Scroll Chaining e Repaint Geral)
- **Evidência**:
  - Os containers de rolagem em `QuestionsView.tsx` (linha 210), `AnkiView.tsx`, `VaultView.tsx` e `FocusApp.tsx` não possuem isolamento de camada de composição (`will-change: transform` ou `transform: translateZ(0)`), nem `overscroll-behavior-y: contain`.
  - No mobile WebView, a falta de `overscroll-behavior: contain` gera encadeamento de rolagem para o documento raiz (`window`), causando "saltos" e micro-pausas na inércia de rolagem.
- **Arquivos**:
  - `src/components/questions/QuestionsView.tsx`
  - `src/index.css` (classes utilitárias de rolagem padronizadas)

---

## 4. Backlog Priorizado de Correções (ETAPA 2)

1. **Item 1 (Prioridade Total)**: Aplicar `content-visibility: auto`, `contain-intrinsic-size` e remover `transition-all` nos cards de Questões e Quiz (`QuizPlayerCard`, `QuizEditorCard` e `BatteryQuestionsPreview`).
2. **Item 2**: Remover `transition-all` e aplicar `content-visibility: auto` com contenção de layout no Cofre (`VaultItemList`) e no Anki (`CardListView`).
3. **Item 3**: Corrigir todos os listeners globais de rolagem adicionando `{ passive: true }` e throttle com `requestAnimationFrame` em `useActivityTracker.ts`, `useTimeTracker.ts`, `SlashMenu.tsx` e `useBlockHandle.ts`.
4. **Item 4**: Padronizar classe utilitária de aceleração por compositor (`.smooth-scroll-container` com `overscroll-behavior-y: contain`, `transform: translateZ(0)` e `-webkit-overflow-scrolling: touch`) nos containers dos módulos.

