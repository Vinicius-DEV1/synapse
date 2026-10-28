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
  - **Causa Raiz Identificada:** Timeout de 5.000 ms durante a execução massiva concorrente de 353 arquivos de teste. O teste simula uma série sem correspondência na API TVMaze, porém a cadeia de fallback invoca chamadas reais não mockadas para serviços externos (`fetchCinemetaSearch`, `fetchImdbSeries`, `fetchITunesMovies`), efetuando requisições HTTP reais pela rede externa. Quando executado isoladamente com mock ou rede livre, o teste passa em 1.1s.

---

## 2. Matriz de Auditoria e Problemas Identificados

Cada item abaixo está classificado por **Severidade** (`Crítico`, `Importante` ou `Menor`), com arquivo(s) afetado(s), diagnóstico e correção sugerida.

---

### Seção 1: Documentação

#### [DOC-01] Porta padrão de redirecionamento OAuth divergente entre documentação e código
- **Severidade:** Importante
- **Arquivos Afetados:**
  - `src/services/drive/drive-auth.ts` (linha 61)
  - `src/services/drive/drive-pkce.ts` (linha 36)
  - `.env.example` (linha 30)
  - `vite.config.ts` (linha 9)
- **Diagnóstico:** O arquivo de configuração do Vite (`vite.config.ts`) define o servidor de desenvolvimento na porta `35174`, assim como `.env.example` documenta `VITE_DRIVE_REDIRECT_URI="http://localhost:35174"`. No entanto, os arquivos de autenticação do Google Drive (`drive-auth.ts` e `drive-pkce.ts`) utilizam como fallback a porta padrão antiga do Vite: `http://localhost:5173`. Caso o desenvolvedor inicie o app sem definir a variável no `.env`, o fluxo de OAuth redirecionará para a porta 5173 e falhará com erro de conexão.
- **Correção Sugerida:** Unificar os fallbacks em `drive-auth.ts` e `drive-pkce.ts` para `http://localhost:35174`.
- **Status:** Pendente

#### [DOC-02] Variáveis de ambiente do Firebase Emulator ausentes no `.env.example`
- **Severidade:** Menor
- **Arquivos Afetados:**
  - `.env.example`
  - `src/services/firebase.ts` (linhas 28-32)
- **Diagnóstico:** O arquivo `src/services/firebase.ts` consome variáveis de ambiente para emulação local (`VITE_USE_FIREBASE_EMULATOR`, `VITE_FIRESTORE_EMULATOR_HOST`, `VITE_FIRESTORE_EMULATOR_PORT`, `VITE_AUTH_EMULATOR_URL`), mas nenhuma delas está documentada no template `.env.example`.
- **Correção Sugerida:** Adicionar uma seção comentada no `.env.example` documentando as variáveis do Firebase Emulator para desenvolvimento local offline.
- **Status:** Pendente

---

### Seção 2: Arquivos de Agente (`AGENTS.md` e similares)

#### [AGT-01] Métrica desatualizada da contagem de arquivos de teste em `AGENTS.md`
- **Severidade:** Menor
- **Arquivos Afetados:**
  - `AGENTS.md` (linhas 121 e 128)
- **Diagnóstico:** O arquivo de diretrizes para agentes cita: *"as running all 310 files takes over 2 minutes"* e *"all 310 test files"*. Atualmente, o repositório expandiu para 353 arquivos de teste e 1.586 testes unitários/integrados.
- **Correção Sugerida:** Atualizar as referências numéricas na seção 7 do `AGENTS.md` para refletir o volume atual (>350 arquivos de teste).
- **Status:** Pendente

#### [AGT-02] Violação da regra de idioma dos comentários (Regra 6 do `AGENTS.md`)
- **Severidade:** Menor
- **Arquivos Afetados:** Múltiplos arquivos em `src/` (ex: `src/components/AuthScreen.tsx`, `src/components/editor/hooks/useEditorDropPaste.ts`, `src/services/image-gc.ts`, etc.)
- **Diagnóstico:** A Regra 6 do `AGENTS.md` exige estritamente que todos os comentários de código sejam redigidos em inglês (*"All code comments must be written strictly in English"*). Foram encontrados ~99 comentários e anotações em português.
- **Correção Sugerida:** Traduzir os comentários remanescentes em português para inglês conciso e objetivo nas áreas tocadas durante a revisão.
- **Status:** Pendente

---

### Seção 3: Organização, Limpeza e Dependências

#### [ORG-01] Dependências não utilizadas ou redundantes no `package.json`
- **Severidade:** Importante
- **Arquivos Afetados:**
  - `package.json`
- **Diagnóstico:** 
  1. `@tiptap/extension-table-row`: É uma dependência declarada separadamente, mas `TableRow` já é exportado e consumido diretamente de `@tiptap/extension-table`.
  2. `@tiptap/y-tiptap`: Pacote legado não importado em nenhum local do repositório (o projeto utiliza `@tiptap/extension-collaboration` e `yjs`).
  3. `@tiptap/extension-bubble-menu` e `@tiptap/extension-floating-menu`: O editor consome `BubbleMenu` diretamente do pacote `@tiptap/react/menus`.
  4. `clsx` e `tailwind-merge`: Declarados em `dependencies`, porém não são importados em nenhum arquivo de `src/`.
  5. `y-protocols`: Declarado diretamente em `dependencies`, mas já é dependência transitiva do ecossistema Yjs sem consumo direto.
  6. `@testing-library/user-event`: Declarado em `devDependencies`, mas os testes utilizam exclusivamente `fireEvent` do `@testing-library/react`.
- **Correção Sugerida:** Propor a remoção segura dessas dependências não utilizadas para aprovação do usuário, reduzindo a superfície de ataque e o tamanho de `node_modules`.
- **Status:** Aguardando Decisão do Usuário

#### [ORG-02] Arquivo residual `caderno-mobile-webview/CLAUDE.md` versionado
- **Severidade:** Menor
- **Arquivos Afetados:**
  - `caderno-mobile-webview/CLAUDE.md`
- **Diagnóstico:** Arquivo de apenas 1 linha contendo `@AGENTS.md` esquecido dentro do subdiretório do aplicativo mobile.
- **Correção Sugerida:** Propor a remoção ou consolidação do arquivo para manter o repositório limpo.
- **Status:** Pendente

---

### Seção 4: Qualidade de Código e Tipagem TypeScript

#### [TYP-01] Uso proibido de `any` e `as any` em módulos de produção (Violação da Regra 4.1)
- **Severidade:** Importante
- **Arquivos Afetados:**
  - `src/api/web/trash.ts` (linha 74: `await (db as any).put(table, item)`)
  - `src/components/library/epub/useEpubTheme.ts` (linhas 394, 416, 433)
  - `src/components/library/epub/utils/epubAssetManager.ts` (linhas 18, 23, 74, 98)
  - `src/components/library/pdf/components/PdfSearchBar.tsx` (linhas 11, 101)
  - `src/components/modals/ImageViewerModal.tsx` (linha 23)
  - `src/components/modals/MediaSelectModal.tsx` (linha 36)
  - `src/components/ui/RichTextRenderer.tsx` (linha 3)
  - `src/hooks/useAIActions.ts` (linhas 8, 19, 37, 42)
  - `src/services/culture/culture-episodes-sync.ts` (linhas 17, 55)
  - `src/services/culture/culture-media-providers.ts` (linhas 181, 256)
  - `src/services/image-gc.ts` (linha 80)
- **Diagnóstico:** A Regra 4.1 do `AGENTS.md` proíbe terminantemente `any`, `as any` e asserções não checadas. Foram encontrados múltiplos pontos com tipagem flexível/escape `any` em código de produção.
- **Correção Sugerida:** Substituir `any` por tipos específicos, interfaces discriminadas ou `unknown` com guardas de tipo seguras (`type guards`).
- **Status:** Pendente

#### [ERR-01] Engolimento silencioso de erros com blocos `catch {}` vazios (Violação da Regra 4.3 #1)
- **Severidade:** Importante
- **Arquivos Afetados:** 110 ocorrências distribuídas no repositório, incluindo:
  - `src/api/web/sync.ts` (linha 89)
  - `src/api/web/anki/anki-settings.ts` (linhas 18 e 57)
  - `src/api/web/anki/anki-cards-generator.ts` (linha 18)
  - `src/api/web/anki/anki-notes.ts` (linha 130)
  - `src/services/gemini/keys.ts` (linha 82)
  - `src/services/windowService.ts` (linhas 22, 41, 46, 61, etc.)
  - `src/services/link-vault/linkVaultService.ts` (múltiplas linhas)
- **Diagnóstico:** A Regra 4.3 #1 proíbe blocos `catch {}` vazios (*"Silent Error Swallowing: Empty catch {} blocks are strictly forbidden. All errors must be logged with contextual metadata and provide fallback UX or user feedback"*). O silenciamento sem registro dificulta o diagnóstico de falhas em produção e encobre bugs silenciosos.
- **Correção Sugerida:** Adicionar log contextual (`console.warn` ou `console.error`) ou tratamento de fallback resiliente nos blocos vazios críticos.
- **Status:** Pendente

#### [LOG-01] Poluição de logs com `console.log` de depuração em produção
- **Severidade:** Menor
- **Arquivos Afetados:**
  - `src/services/image-drive.ts`
  - `src/services/image-gc.ts`
  - `src/services/video/video-uploader.ts`
  - `src/api/tauri/library.ts`
- **Diagnóstico:** Presença de mensagens de depuração verbosas (`[DEBUG]`, `[GC]`) usando `console.log` direto em código de produção, poluindo o console do usuário e ferramentas de monitoramento.
- **Correção Sugerida:** Substituir `console.log` desnecessários por `console.debug` ou remover logs puramente informativos de fluxo interno.
- **Status:** Pendente

---

### Seção 5: Robustez e Integridade dos Dados

#### [TST-01] Teste unitário realizando requisições HTTP reais sem mock em cadeia de fallback
- **Severidade:** Crítico
- **Arquivos Afetados:**
  - `src/services/culture/culture-recommendation-hydrator.test.ts` (linhas 196-225)
- **Diagnóstico:** O teste *"rejects sports documentaries from matching non-sports fictional drama recommendations"* mocka somente a função `fetchTVMaze`. Quando `pickValidMatch` rejeita o resultado esportivo, o código sob teste (`searchMediaForRecommendation`) prossegue na cadeia de fallback executando `fetchCinemetaSearch`, `fetchImdbSeries` e `fetchITunesMovies`. Como essas funções não foram mockadas nesse teste específico, o Vitest dispara requisições HTTP reais para a internet, estourando o timeout de 5.000 ms durante o teste concorrente global.
- **Correção Sugerida:** Mockar explicitamente os espiões (`vi.spyOn`) de `fetchCinemetaSearch`, `fetchImdbSeries` e `fetchITunesMovies` retornando arrays vazios `[]`, isolando o teste de dependências externas de rede.
- **Status:** Pendente

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
  - `src/components/library/epub/EpubTypography.tsx` (linha 34: `max-h-[calc(100vh-5rem)]`)
  - `src/components/GlobalErrorBoundary.tsx` (linha 37: `w-screen h-screen`)
  - `src/components/modals/ScrapActionModal.tsx` (linha 80: `w-screen h-screen`)
  - `src/components/modals/ScrapDeleteModal.tsx` (linha 57: `w-screen h-screen`)
  - `src/components/modals/ScrapInputModal.tsx` (linha 88: `w-screen h-screen`)
  - `src/components/modals/ScrapViewerModal.tsx` (linha 123: `w-screen h-screen`)
- **Diagnóstico:** Conforme a Seção 11.2 do `AGENTS.md` (*Viewport & Layout Discipline*), o uso de `w-screen` dispara barras de rolagem horizontal espúrias no Android WebView e navegadores mobile devido à sobreposição de barras do sistema. Além disso, `100vh` causa esmagamento de layout quando o teclado virtual ou a barra de endereços do navegador mobile é exibida; deve-se usar `100dvh` ou `fixed inset-0 w-full max-w-full`.
- **Correção Sugerida:** Substituir `w-screen h-screen` por `fixed inset-0 w-full h-full` ou `100dvh` nos modais e containers de tela cheia.
- **Status:** Pendente

---

### Seção 7: Segurança Básica

#### [SEC-01] Nível de segurança do renderizador Mermaid configurado como `'loose'`
- **Severidade:** Importante
- **Arquivos Afetados:**
  - `src/components/editor-extensions/youtube/MermaidViewer.tsx` (linha 64)
- **Diagnóstico:** O inicializador do Mermaid está configurado com `securityLevel: 'loose'`. Embora a saída SVG passe por `DOMPurify.sanitize`, a documentação de segurança do Mermaid recomenda fortemente `securityLevel: 'strict'` ou `'antiscript'` para prevenir vetores de execução de script em diagramas gerados por terceiros ou inputs não confiáveis.
- **Correção Sugerida:** Alterar `securityLevel: 'loose'` para `securityLevel: 'strict'`.
- **Status:** Pendente

#### [SEC-02] Vulnerabilidades conhecidas em dependências reportadas pelo `npm audit`
- **Severidade:** Crítico / Requer Decisão
- **Arquivos Afetados:**
  - `package.json` / `package-lock.json`
- **Diagnóstico:** O `npm audit` detectou 71 vulnerabilidades (1 baixa, 43 moderadas, 25 altas e 2 críticas). As vulnerabilidades de maior impacto situam-se em pacotes de terceiros:
  - `@grpc/grpc-js` (via Firebase Firestore)
  - `@tiptap/core` (via extensões do TipTap)
  - `@xenova/transformers` / `sharp`
  - `source-map-js`
  - `undici`
  - `vite`
- **Análise de Risco:** Corrigir todas as vulnerabilidades via `npm audit fix --force` quebraria dependências centrais (ex: forçaria o downgrade do Firebase para a versão 9.14 legada ou alteraria a versão do Transformers). Modificações que envolvam breaking changes em bibliotecas estruturais devem ser avaliadas com cuidado para não quebrar a arquitetura existente.
- **Correção Sugerida:** Aplicar atualizações sem breaking changes (`npm audit fix`) para pacotes compatíveis (ex: `vite`, `source-map-js`, `undici`), e planejar uma atualização coordenada das dependências de runtime maiores.
- **Status:** Aguardando Decisão do Usuário

#### [SEC-03] Verificação de Credenciais, Segredos e Sanitização
- **Severidade:** Informativo / Excelente
- **Arquivos Avaliados:** Todo o histórico e working tree (`git grep`, `git ls-files`, `.gitignore`).
- **Diagnóstico:** Nenhum token de API, segredo, chave privada (`.pem`, `.key`) ou arquivo de credenciais reais foi encontrado versionado no repositório. O `.env` local é devidamente ignorado pelo `.gitignore`. Todos os `<iframe>` possuem atributos `sandbox` e `title` explícitos.
- **Status:** Validado e Seguro

---

## 3. Resumo da Matriz de Ações para a Etapa 2

| ID | Categoria | Descrição | Severidade | Ação Proposta na Etapa 2 |
| :--- | :--- | :--- | :--- | :--- |
| **TST-01** | Robustez / Testes | Mock de chamadas de rede no teste de cultura | **Crítico** | Aplicar mock dos fallbacks no teste para zerar falhas da suíte |
| **SEC-01** | Segurança | Ajustar Mermaid `securityLevel` para `'strict'` | **Importante** | Ajustar configuração em `MermaidViewer.tsx` |
| **MOB-01** | Responsividade | Eliminar `w-screen` e `100vh` em modais e views | **Importante** | Substituir por `fixed inset-0 w-full` e `100dvh` |
| **DOC-01** | Documentação | Corrigir porta padrão de redirect do OAuth (5173 -> 35174) | **Importante** | Alinhar `drive-auth.ts` e `drive-pkce.ts` |
| **TYP-01** | Qualidade | Remover `any` em `src/api/web/trash.ts` e serviços | **Importante** | Tipar com schemas seguros |
| **ERR-01** | Qualidade | Tratar blocos `catch {}` vazios em pontos críticos | **Importante** | Inserir logs contextuais defensivos |
| **DOC-02** | Documentação | Documentar emuladores do Firebase no `.env.example` | **Menor** | Atualizar `.env.example` |
| **LOG-01** | Qualidade | Limpar logs `console.log` de depuração em serviços | **Menor** | Trocar por `console.debug` ou sanitizar |
| **AGT-01** | Agentes | Atualizar contagem de testes no `AGENTS.md` | **Menor** | Atualizar texto de 310 para >350 testes |
| **ORG-01** | Organização | Remoção de dependências não utilizadas | **Importante** | **Aguardando Decisão do Usuário** |
| **SEC-02** | Segurança | Atualização com breaking change de bibliotecas | **Crítico** | **Aguardando Decisão do Usuário** |
