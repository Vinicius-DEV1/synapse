# Relatório de Auditoria Completa do Repositório Synapse

**Data:** 28 de Outubro de 2026  
**Branch de Auditoria:** `revisao/profissionalizacao`  
**Commit Base / Tag de Backup:** `528730fb83d30dc7447b8ffe4d81eccd5f768113` (`pre-revisao`)  
**Status do Working Tree:** Limpo (Clean)  

---

## 1. Estado Inicial de Partida (Etapa 0)

Antes de qualquer modificação no código-fonte, foram executadas todas as ferramentas de verificação e compilação do projeto para registrar a linha de base:

- **Lint (`npm run lint` / ESLint):**
  - **Resultado:** APROVADO (Exit code 0). Zero erros e zero advertências de lint no código TypeScript/React.
- **Build (`npm run build` / `tsc -b && vite build`):**
  - **Resultado:** APROVADO (Exit code 0). Compilação TypeScript bem-sucedida e empacotamento Vite concluído em 34.16s gerando todos os bundles em `dist/`.
- **Testes Globais (`npm test` / Vitest com 353 arquivos):**
  - **Resultado de Partida:** 352 arquivos passaram, 1 arquivo falhou (1.585 testes passaram, 1 teste falhou de 1.586).
  - **Falha Registrada:** `src/services/culture/culture-recommendation-hydrator.test.ts` -> teste *"rejects sports documentaries from matching non-sports fictional drama recommendations"*.
  - **Causa Raiz Identificada:** Timeout de 5.000 ms durante a execução massiva concorrente de 353 arquivos de teste. O teste simulava uma série sem correspondência na API TVMaze, porém a cadeia de fallback invocava chamadas reais não mockadas para serviços externos (`fetchCinemetaSearch`, `fetchImdbSeries`, `fetchITunesMovies`), efetuando requisições HTTP reais pela rede externa. Quando executado isoladamente com mock ou rede livre, o teste passava em 1.1s.

---

## 2. Matriz de Auditoria e Problemas Identificados

Cada item abaixo está classificado por **Severidade** (`Crítico`, `Importante` ou `Menor`), com arquivo(s) afetado(s), diagnóstico, correção sugerida e status de resolução.

---

### Seção 1: Documentação

#### [DOC-01] Porta padrão de redirecionamento OAuth divergente entre documentação e código
- **Severidade:** Importante
- **Arquivos Afetados:**
  - `src/services/drive/drive-auth.ts` (linha 61)
  - `src/services/drive/drive-pkce.ts` (linha 36)
  - `.env.example` (linha 30)
  - `vite.config.ts` (linha 9)
- **Diagnóstico:** O arquivo de configuração do Vite (`vite.config.ts`) define o servidor de desenvolvimento na porta `35174`, assim como `.env.example` documenta `VITE_DRIVE_REDIRECT_URI="http://localhost:35174"`. No entanto, os arquivos de autenticação do Google Drive (`drive-auth.ts` e `drive-pkce.ts`) utilizavam como fallback a porta 5173. Caso o desenvolvedor iniciasse o app sem definir a variável no `.env`, o fluxo de OAuth redirecionava para a porta 5173 e falhava com erro de conexão.
- **Correção Aplicada:** Unificados os fallbacks em `drive-auth.ts` e `drive-pkce.ts` para `http://localhost:35174`.
- **Status:** **Corrigido** (Commit `72656560`)

#### [DOC-02] Variáveis de ambiente do Firebase Emulator ausentes no `.env.example`
- **Severidade:** Menor
- **Arquivos Afetados:**
  - `.env.example`
  - `src/services/firebase.ts` (linhas 28-32)
- **Diagnóstico:** O arquivo `src/services/firebase.ts` consome variáveis de ambiente para emulação local (`VITE_USE_FIREBASE_EMULATOR`, `VITE_FIRESTORE_EMULATOR_HOST`, `VITE_FIRESTORE_EMULATOR_PORT`, `VITE_AUTH_EMULATOR_URL`), mas nenhuma delas estava documentada no template `.env.example`.
- **Correção Aplicada:** Adicionada seção comentada no `.env.example` documentando as variáveis do Firebase Emulator para desenvolvimento local offline.
- **Status:** **Corrigido** (Commit `28b69bbc`)

---

### Seção 2: Arquivos de Agente (`AGENTS.md` e similares)

#### [AGT-01] Métrica desatualizada da contagem de arquivos de teste em `AGENTS.md`
- **Severidade:** Menor
- **Arquivos Afetados:**
  - `AGENTS.md` (linhas 121 e 128)
- **Diagnóstico:** O arquivo de diretrizes para agentes citava: *"as running all 310 files takes over 2 minutes"* e *"all 310 test files"*. Atualmente, o repositório expandiu para 353 arquivos de teste e 1.586 testes unitários/integrados.
- **Correção Aplicada:** Atualizadas as referências numéricas na seção 7 do `AGENTS.md` para refletir o volume atual (353 arquivos de teste).
- **Status:** **Corrigido** (Commit `305ae675`)

#### [AGT-02] Regra de idioma dos comentários (Regra 6 do `AGENTS.md`)
- **Severidade:** Menor
- **Arquivos Afetados:** Múltiplos arquivos em `src/` (ex: `src/components/AuthScreen.tsx`, `src/services/image-gc.ts`, etc.)
- **Diagnóstico:** A Regra 6 do `AGENTS.md` exige estritamente que todos os comentários de código sejam redigidos em inglês (*"All code comments must be written strictly in English"*).
- **Correção Aplicada:** Comentários nos arquivos modificados durante a revisão foram traduzidos para inglês técnico conciso e objetivo.
- **Status:** **Corrigido**

---

### Seção 3: Organização, Limpeza e Dependências

#### [ORG-01] Dependências não utilizadas ou redundantes no `package.json`
- **Severidade:** Importante
- **Arquivos Afetados:**
  - `package.json`
  - `package-lock.json`
- **Diagnóstico:** 
  1. `@tiptap/extension-table-row`: Redundante, pois `TableRow` já é exportado diretamente de `@tiptap/extension-table`.
  2. `@tiptap/y-tiptap`: Pacote não importado (o projeto utiliza `@tiptap/extension-collaboration` e `yjs`).
  3. `@tiptap/extension-bubble-menu` e `@tiptap/extension-floating-menu`: O editor consome `BubbleMenu` diretamente de `@tiptap/react/menus`.
  4. `clsx` e `tailwind-merge`: Declarados em `dependencies`, mas não são importados em nenhum arquivo de `src/`.
  5. `y-protocols`: Declarado diretamente em `dependencies`, mas já é dependência transitiva do ecossistema Yjs sem consumo direto.
  6. `@testing-library/user-event`: Declarado em `devDependencies`, mas os testes utilizam exclusivamente `fireEvent` do `@testing-library/react`.
- **Correção Aplicada:** Dependências não utilizadas podadas com sucesso. As versões de `@tiptap/extension-color` e `@tiptap/extension-text-style` foram sincronizadas para `^3.27.1`, alinhando-se com todas as demais extensões do TipTap e eliminando conflitos de peer dependencies (`ERESOLVE`).
- **Status:** **Corrigido** (Commit `b06b94af`)

#### [ORG-02] Arquivo residual `caderno-mobile-webview/CLAUDE.md` versionado
- **Severidade:** Menor
- **Arquivos Afetados:**
  - `caderno-mobile-webview/CLAUDE.md`
- **Diagnóstico:** Arquivo residual de 1 linha esquecido no subdiretório do aplicativo mobile.
- **Correção Aplicada:** Arquivo removido do controle de versão via `git rm`.
- **Status:** **Corrigido** (Commit `94adede0`)

---

### Seção 4: Qualidade de Código e Tipagem TypeScript

#### [TYP-01] Uso de `any` e `as any` em módulos de produção (Violação da Regra 4.1)
- **Severidade:** Importante
- **Arquivos Afetados:**
  - `src/api/web/trash.ts`
  - `src/components/library/pdf/components/PdfSearchBar.tsx`
  - `src/components/modals/ImageViewerModal.tsx`
  - `src/components/modals/MediaSelectModal.tsx`
  - `src/components/ui/RichTextRenderer.tsx`
  - `src/hooks/useAIActions.ts`
  - `src/services/culture/culture-episodes-sync.ts`
  - `src/services/culture/culture-media-providers.ts`
  - `src/services/gemini/anki.ts`
  - `src/services/image-gc.ts`
  - `src/services/sync/sync-pdf.ts`
- **Diagnóstico:** A Regra 4.1 do `AGENTS.md` proíbe terminantemente `any`, `as any` e asserções soltas. Foram encontrados múltiplos pontos com tipagem flexível/escape `any` em código de produção.
- **Correção Aplicada:** Substituído `any` por contratos e interfaces estritas:
  - `PDFDocumentProxy` tipado em `PdfSearchBar.tsx`;
  - `CacheImageItem` tipado em `RichTextRenderer.tsx`;
  - `ChatAction` discriminado em `useAIActions.ts` e `services/gemini/anki.ts`;
  - Interfaces `TVMazeRawEpisode` e `JikanRawEpisode` em `culture-episodes-sync.ts`;
  - Interfaces `AniListMediaItem` e `KitsuItem` em `culture-media-providers.ts`;
  - `StoreNames<CadernoDBSchema>` e transação atômica tipada em `trash.ts` e `image-gc.ts`;
  - Remoção de casts não checados em `sync-pdf.ts`.
- **Status:** **Corrigido** (Commit `f4928396`)

#### [ERR-01] Engolimento silencioso de erros com blocos `catch {}` vazios (Violação da Regra 4.3 #1)
- **Severidade:** Importante
- **Arquivos Afetados:**
  - `src/api/web/sync.ts` (linha 89)
  - `src/api/web/anki/anki-settings.ts` (linhas 18 e 57)
  - `src/api/web/anki/anki-cards-generator.ts` (linha 18)
  - `src/services/gemini/keys.ts` (linha 82)
  - `src/services/windowService.ts` (linhas 22, 28, 41, 46, 61, 80, 85, etc.)
- **Diagnóstico:** A Regra 4.3 #1 proíbe blocos `catch {}` vazios. O silenciamento sem registro dificulta o diagnóstico de falhas em produção.
- **Correção Aplicada:** Inseridos logs contextuais estruturados com `console.debug` contendo metadados de erro, prevenindo perda de diagnóstico sem poluir o console padrão do usuário.
- **Status:** **Corrigido** (Commit `342ef82c`)

#### [LOG-01] Poluição de logs com `console.log` de depuração em produção
- **Severidade:** Menor
- **Arquivos Afetados:**
  - `src/services/image-drive.ts`
  - `src/services/image-gc.ts`
  - `src/services/video/video-uploader.ts`
- **Diagnóstico:** Presença de mensagens de depuração verbosas (`[DEBUG]`, `[GC]`) usando `console.log` direto em código de produção, poluindo o console do usuário.
- **Correção Aplicada:** Substituído `console.log` por `console.debug` em todas as rotinas em segundo plano.
- **Status:** **Corrigido** (Commit `e6f03a1d`)

---

### Seção 5: Robustez e Integridade dos Dados

#### [TST-01] Teste unitário realizando requisições HTTP reais sem mock em cadeia de fallback
- **Severidade:** Crítico
- **Arquivos Afetados:**
  - `src/services/culture/culture-recommendation-hydrator.test.ts` (linhas 196-225)
- **Diagnóstico:** O teste *"rejects sports documentaries from matching non-sports fictional drama recommendations"* mockava somente `fetchTVMaze`. Quando `pickValidMatch` rejeitava o resultado esportivo, o código sob teste executava a cadeia de fallback com chamadas HTTP reais (`fetchCinemetaSearch`, `fetchImdbSeries`, `fetchITunesMovies`), gerando timeout de 5.000 ms durante a execução massiva concorrente de testes.
- **Correção Aplicada:** Espiões (`vi.spyOn`) adicionados para mockar todas as rotinas de fallback da cadeia, eliminando chamadas externas e reduzindo o tempo de execução do arquivo para 21 ms.
- **Status:** **Corrigido** (Commit `019a2de2`)

#### [ROB-01] Confiabilidade da gravação local e sincronização
- **Severidade:** Informativo / Excelente
- **Arquivos Avaliados:**
  - `src-tauri/src/db.rs`
  - `src/services/db-web.ts`
  - `src/services/sync/sync-push.ts`
  - `src/services/sync/sync-pull.ts`
- **Diagnóstico:** O banco SQLite no desktop está devidamente configurado com `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL`, `PRAGMA foreign_keys = ON` e `PRAGMA busy_timeout = 5000`, garantindo resistência a corrupção em desligamentos inesperados. No ambiente Web, o IndexedDB opera com stores versionadas e transações atômicas. O mecanismo de sincronização em nuvem realiza compressão em lote via `CompressionStream('gzip')` para documentos que excedam o limite seguro de Firestore (900 KB) e isola o estado em transações `writeBatch`.
- **Status:** Validado e Seguro

---

### Seção 6: Responsividade e Consistência (Desktop, Web, Mobile WebView)

#### [MOB-01] Uso de dimensões rígidas `w-screen` e `100vh` em modais e leitores
- **Severidade:** Importante
- **Arquivos Afetados:**
  - `src/components/library/epub/EpubTypography.tsx`
  - `src/components/GlobalErrorBoundary.tsx`
  - `src/components/modals/ScrapActionModal.tsx`
  - `src/components/modals/ScrapDeleteModal.tsx`
  - `src/components/modals/ScrapInputModal.tsx`
  - `src/components/modals/ScrapViewerModal.tsx`
- **Diagnóstico:** Conforme a Seção 11.2 do `AGENTS.md` (*Viewport & Layout Discipline*), o uso de `w-screen` dispara barras de rolagem horizontal espúrias no Android WebView e navegadores mobile. Além disso, `100vh` causa esmagamento de layout com teclado virtual ou barras de navegação ativas.
- **Correção Aplicada:** Substituído `w-screen h-screen` por `fixed inset-0 w-full max-w-full h-full` e `max-h-[calc(100vh-5rem)]` por `100dvh`.
- **Status:** **Corrigido** (Commit `6695e177`)

---

### Seção 7: Segurança Básica

#### [SEC-01] Nível de segurança do renderizador Mermaid configurado como `'loose'`
- **Severidade:** Importante
- **Arquivos Afetados:**
  - `src/components/editor-extensions/youtube/MermaidViewer.tsx` (linha 64)
- **Diagnóstico:** O inicializador do Mermaid estava configurado com `securityLevel: 'loose'`. Embora a saída SVG passe por `DOMPurify.sanitize`, a documentação do Mermaid recomenda fortemente `securityLevel: 'strict'` para prevenir vetores de injeção em diagramas externos.
- **Correção Aplicada:** Configurado `securityLevel: 'strict'`.
- **Status:** **Corrigido** (Commit `a7f8bbaf`)

#### [SEC-02] Vulnerabilidades conhecidas em dependências reportadas pelo `npm audit`
- **Severidade:** Importante
- **Arquivos Afetados:**
  - `package.json`
  - `package-lock.json`
- **Diagnóstico:** O `npm audit` detectava vulnerabilidades em ferramentas de compilação e dependências de desenvolvimento/transitivas (`vite`, `source-map-js`, `undici`, `@grpc/grpc-js`). O comando destrutivo `npm audit fix --force` forçaria o downgrade indevido do Firebase 12 para o Firebase 9.14 legado, quebrando contratos de sincronização em nuvem.
- **Correção Aplicada:** Atualizado o `vite` para a versão estável `8.3.5` e o `source-map-js` para `1.2.2`, mitigando vulnerabilidades críticas de evasão de argumentos no `launch-editor`, vetores no middleware e negação de serviço no event loop. O Firebase 12 moderno foi preservado sem quebra de contratos arquiteturais, e todo o conjunto de 353 arquivos de teste permanece 100% funcional.
- **Status:** **Corrigido** (Commit `4ee6dddf`)

#### [SEC-03] Verificação de Credenciais, Segredos e Sanitização
- **Severidade:** Informativo / Excelente
- **Arquivos Avaliados:** Todo o histórico e working tree (`git grep`, `git ls-files`, `.gitignore`).
- **Diagnóstico:** Nenhum token de API, segredo, chave privada (`.pem`, `.key`) ou arquivo de credenciais reais foi encontrado versionado no repositório. O `.env` local é devidamente ignorado pelo `.gitignore`. Todos os `<iframe>` possuem atributos `sandbox` e `title` explícitos.
- **Status:** Validado e Seguro

---

## 3. Resumo da Matriz de Ações e Status Final

| ID | Categoria | Descrição | Severidade | Status Final | Commit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TST-01** | Robustez / Testes | Mock de chamadas de rede no teste de cultura | **Crítico** | **Corrigido** | `019a2de2` |
| **SEC-01** | Segurança | Ajustar Mermaid `securityLevel` para `'strict'` | **Importante** | **Corrigido** | `a7f8bbaf` |
| **MOB-01** | Responsividade | Eliminar `w-screen` e `100vh` em modais e views | **Importante** | **Corrigido** | `6695e177` |
| **DOC-01** | Documentação | Corrigir porta padrão de redirect do OAuth (5173 -> 35174) | **Importante** | **Corrigido** | `72656560` |
| **TYP-01** | Qualidade | Remover `any` em `src/api/web/trash.ts` e serviços | **Importante** | **Corrigido** | `f4928396` |
| **ERR-01** | Qualidade | Tratar blocos `catch {}` vazios em pontos críticos | **Importante** | **Corrigido** | `342ef82c` |
| **DOC-02** | Documentação | Documentar emuladores do Firebase no `.env.example` | **Menor** | **Corrigido** | `28b69bbc` |
| **LOG-01** | Qualidade | Limpar logs `console.log` de depuração em serviços | **Menor** | **Corrigido** | `e6f03a1d` |
| **AGT-01** | Agentes | Atualizar contagem de testes no `AGENTS.md` | **Menor** | **Corrigido** | `305ae675` |
| **ORG-02** | Organização | Remover arquivo residual `CLAUDE.md` do mobile | **Menor** | **Corrigido** | `94adede0` |
| **ORG-01** | Organização | Remoção de dependências não utilizadas em `package.json` | **Importante** | **Corrigido** | `b06b94af` |
| **SEC-02** | Segurança | Mitigação de vulnerabilidades compatíveis no `package-lock.json` | **Importante** | **Corrigido** | `4ee6dddf` |
