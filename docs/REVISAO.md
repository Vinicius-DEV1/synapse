# Relatório de Revisão Geral do Projeto Synapse

## Resumo Geral

O projeto **Synapse** encontra-se em um estado maduro, com arquitetura em camadas bem definida, paridade entre Tauri (Desktop), Web e Mobile WebView, e uma suíte de testes robusta (353 arquivos de teste, 1.586 testes passando e zero falhas iniciais). A compilação TypeScript (`tsc -b`) e o linter (`eslint`) passam com zero erros.
Os três maiores ganhos identificados nesta revisão são:
1. **Resolução de dependências fantasmas e vulnerabilidades**: eliminação do risco de quebra de build pela dependência oculta `@radix-ui/react-dialog` e saneamento das dependências pesadas e vulneráveis (ex.: `@xenova/transformers`).
2. **Otimização de empacotamento e chunking**: correção da importação estática em modais que anulava o code-splitting dinâmico de `book-metadata-enricher.ts` e modernização da configuração do Vite (`import.meta.dirname`).
3. **Robustez de tipos, dados e conformidade com regras**: eliminação de `any` e casts duplos desnecessários em `ICadernoAPI` e `useFocusTimer`, unificação de rotinas de conversão binária/Base64 (`uint8ArrayToBase64`) no pipeline de sincronização, e tradução de comentários residuais em português para o inglês estrito estipulado no `AGENTS.md`.

---

## Lista de Melhorias Numeradas

### 1. Dependência Fantasma (Undeclared) no WebVersionModal
- **Categoria**: Lógica e correção / Dependências
- **Arquivo e linha**: [`src/components/video-player/WebVersionModal.tsx:2`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/components/video-player/WebVersionModal.tsx#L2)
- **Problema encontrado**: O componente importa `* as Dialog from '@radix-ui/react-dialog'`, porém `@radix-ui/react-dialog` não está declarado em `package.json`. Ele só é resolvido em tempo de execução porque é puxado transitivamente por outras bibliotecas. Se a árvore de dependências for limpa ou alterada, o build falhará imediatamente.
- **Proposta**: Como o `WebVersionModal` é um modal simples e todos os demais modais do projeto usam o componente nativo de modal ou overlay com acessibilidade, substituir pelo componente padrão de modal do projeto ou adicionar formalmente a dependência ao `package.json`. A substituição por código próprio padronizado elimina a dependência externa.
- **Impacto**: Médio
- **Esforço**: Baixo
- **Risco de quebrar algo**: Baixo

### 2. Cast Duplo Desnecessário e Incoerente em useFocusTimer
- **Categoria**: Qualidade do código / Lógica
- **Arquivo e linha**: [`src/store/focus/useFocusTimer.ts:85`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/store/focus/useFocusTimer.ts#L85)
- **Problema encontrado**: A linha executa `id: sessionId as unknown as number`. Contudo, a interface `Session` em `src/components/focus/types.ts:2` já define `id?: number | string;`. A variável `sessionId` é uma string (`string`). Esse cast duplo `as unknown as number` viola a regra de type safety estrita e gera incoerência semântica.
- **Proposta**: Passar diretamente `id: sessionId`, removendo o `as unknown as number` e garantindo tipagem limpa.
- **Impacto**: Médio
- **Esforço**: Baixo
- **Risco de quebrar algo**: Baixo

### 3. Falta do Método setAppIcon no Contrato ICadernoAPI['focus']
- **Categoria**: Arquitetura / Qualidade do código
- **Arquivo e linha**: [`src/api/types.ts:280-288`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/api/types.ts#L280-L288) e [`src/store/focus/useFocusTimer.ts:7-11`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/store/focus/useFocusTimer.ts#L7-L11)
- **Problema encontrado**: Tanto a API Tauri (`src/api/tauri/focus.ts`) quanto a Web (`src/api/web/focus.ts`) implementam `setAppIcon?: (type: 'normal' | 'zzz') => Promise<void>`. No entanto, a interface canônica `ICadernoAPI['focus']` não declarava esse método opcional, forçando o hook `useFocusTimer` a declarar um tipo local estendido (`FocusApiWithIcon`) com cast.
- **Proposta**: Adicionar `setAppIcon?: (type: 'normal' | 'zzz') => Promise<void>;` formalmente em `src/api/types.ts` dentro do bloco `focus?: { ... }` e remover o tipo gambiarra em `useFocusTimer.ts`.
- **Impacto**: Médio
- **Esforço**: Baixo
- **Risco de quebrar algo**: Baixo

### 4. Tipagem Frouxa com [key: string]: any e Retornos any em ICadernoAPI
- **Categoria**: Qualidade do código / Segurança básica
- **Arquivo e linha**: [`src/api/types.ts:223-225, 240, 244, 247, 367, 368, 437, 438, 448`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/api/types.ts#L223-L225)
- **Problema encontrado**: A interface `ICadernoAPI` contém `[key: string]: any;` no final (linha 448) e múltiplos métodos declarados com `Promise<any>` ou argumentos `any` (ex.: `imageCache.get`, `scanTracks`, `listen`, `fetchInfo`). Isso anula a verificação estrita do TypeScript em chamadas para `window.api`.
- **Proposta**: Refinar as assinaturas com tipos estruturados específicos ou `unknown` com validação de tipo, e restringir ou remover o index signature arbitrário `[key: string]: any;`.
- **Impacto**: Alto
- **Esforço**: Médio
- **Risco de quebrar algo**: Médio (requer validação cuidadosa de tipos em chamadas existentes)

### 5. Ineffective Dynamic Import no Módulo de Livros (Library)
- **Categoria**: Desempenho / Arquitetura
- **Arquivo e linha**: [`src/components/library/modals/BookEditModal.tsx:7`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/components/library/modals/BookEditModal.tsx#L7) e [`src/components/library/modals/BookInfoModal.tsx:6`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/components/library/modals/BookInfoModal.tsx#L6)
- **Problema encontrado**: O Vite emite o aviso: `[INEFFECTIVE_DYNAMIC_IMPORT] src/services/library/book-metadata-enricher.ts is dynamically imported by src/components/library/epub/useEpubLoader.ts, src/components/library/hooks/useLibraryData.ts but also statically imported by src/components/library/modals/BookEditModal.tsx, src/components/library/modals/BookInfoModal.tsx, dynamic import will not move module into another chunk.`
  Isso ocorre porque os modais importam `autoEnrichBookMetadata` no topo do arquivo (estaticamente), impedindo o Rollup de isolar o serviço de enriquecimento de metadados em um chunk sob demanda.
- **Proposta**: Converter o import em `BookEditModal.tsx` e `BookInfoModal.tsx` para import dinâmico dentro da função de enriquecimento (`const { autoEnrichBookMetadata } = await import(...)`), mantendo o chunk devidamente isolado e otimizando o carregamento inicial da Biblioteca.
- **Impacto**: Médio
- **Esforço**: Baixo
- **Risco de quebrar algo**: Baixo

### 6. Uso Depreciado de __dirname no vite.config.ts
- **Categoria**: Desempenho / Configuração
- **Arquivo e linha**: [`vite.config.ts:21-22`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/vite.config.ts#L21-L22)
- **Problema encontrado**: O Vite emite aviso durante o build: `__dirname (vite.config.ts:21:23). Use import.meta.dirname instead`. Em módulos ESM (`"type": "module"`), o uso de `__dirname` é obsoleto e incompatível com o futuro `configLoader: 'native'` do Vite.
- **Proposta**: Substituir `resolve(__dirname, 'index.html')` por `resolve(import.meta.dirname, 'index.html')`.
- **Impacto**: Baixo
- **Esforço**: Baixo
- **Risco de quebrar algo**: Baixo

### 7. Conversão Binária/Base64 Ineficiente e Alocação Excessiva no Pipeline de Sync Push
- **Categoria**: Desempenho / Dados e robustez
- **Arquivo e linha**: [`src/services/sync/sync-push.ts:67-73`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/services/sync/sync-push.ts#L67-L73)
- **Problema encontrado**: A compressão de payloads grandes converte `Uint8Array` para base64 dividindo em fatias e invocando `Array.from(chunk)` e `String.fromCodePoint.apply(null, Array.from(chunk))`, seguido de `btoa`. O `Array.from` cria um array JavaScript adicional a cada 8KB, causando overhead de CPU e pressão de Garbage Collection desnecessária. O utilitário [`src/utils/binary.ts`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/utils/binary.ts#L14) já possui `uint8ArrayToBase64`, que é nativo (ECMAScript 2024 `toBase64`) e otimizado com tabela de lookup.
- **Proposta**: Utilizar a função canônica `uint8ArrayToBase64(new Uint8Array(buffer))` em `sync-push.ts`.
- **Impacto**: Médio
- **Esforço**: Baixo
- **Risco de quebrar algo**: Baixo

### 8. Loop Caractere a Caractere Manual na Descompressão do Sync
- **Categoria**: Desempenho / Qualidade do código
- **Arquivo e linha**: [`src/services/sync/sync-decrypt-batch.ts:57-62`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/services/sync/sync-decrypt-batch.ts#L57-L62)
- **Problema encontrado**: O método faz `atob(decryptedJsonOrB64)` e itera com um `for` caractere a caractere preenchendo `bytes[j] = binary_string.charCodeAt(j)`. O projeto já conta com o helper de alta performance `base64ToUint8Array` em `src/utils/binary.ts`.
- **Proposta**: Substituir a iteração manual por `base64ToUint8Array(decryptedJsonOrB64)`.
- **Impacto**: Médio
- **Esforço**: Baixo
- **Risco de quebrar algo**: Baixo

### 9. Acesso a localStorage Desprotegido em focus-sound.ts
- **Categoria**: Dados e robustez / Lógica
- **Arquivo e linha**: [`src/store/focus/focus-sound.ts:6, 46`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/store/focus/focus-sound.ts#L6)
- **Problema encontrado**: As funções `playAlarmSound` e `startProceduralAlarm` chamam `localStorage.getItem('soundEnabled')` diretamente sem bloco `try...catch`. Em navegadores em modo estrito, modo privado ou iframes restritos, o acesso a `localStorage` pode disparar `SecurityError`, interrompendo a execução do alarme do Pomodoro/Focus.
- **Proposta**: Envolver a leitura em função auxiliar segura (ou bloco `try...catch`) com fallback gracioso para o padrão `true`.
- **Impacto**: Médio
- **Esforço**: Baixo
- **Risco de quebrar algo**: Baixo

### 10. Violação da Regra 6 (English Only Comments) em Múltiplos Arquivos
- **Categoria**: Qualidade do código
- **Arquivo e linha**: Múltiplos arquivos (ex.: [`src/components/editor-extensions/CalendarEventWidgetBlock.ts:116`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/components/editor-extensions/CalendarEventWidgetBlock.ts#L116), [`src/components/editor-extensions/bundles/DocumentBundleModal.tsx:216`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/components/editor-extensions/bundles/DocumentBundleModal.tsx#L216), [`src/components/modals/ScrapDeleteModal.tsx:35-47`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/components/modals/ScrapDeleteModal.tsx#L35-L47), [`src/components/editor/hooks/useEditorDropPaste.ts:159-243`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/components/editor/hooks/useEditorDropPaste.ts#L159), [`src/services/image-gc.ts:7, 24`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/services/image-gc.ts#L7))
- **Problema encontrado**: A Regra 6 do `AGENTS.md` determina explicitamente: *"Source Code Comments: All code comments (//, /* */, JSDoc, docstrings) must be written strictly in English."* Foram encontrados dezenas de comentários em português remanescentes no código.
- **Proposta**: Traduzir todos os comentários residuais em português para o inglês claro, objetivo e contextual.
- **Impacto**: Baixo
- **Esforço**: Médio
- **Risco de quebrar algo**: Baixo

### 11. Dependência @xenova/transformers e Riscos de Segurança
- **Categoria**: Dependências / Segurança básica
- **Arquivo e linha**: [`package.json:48`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/package.json#L48) e [`src/services/culture/culture-edge-ai.ts:1`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/services/culture/culture-edge-ai.ts#L1)
- **Problema encontrado**: A biblioteca `@xenova/transformers` é responsável pela grande maioria das vulnerabilidades apontadas pelo `npm audit` (67 vulnerabilidades, incluindo CVEs de severidade alta em `protobufjs`, `sharp` e `onnxruntime-web`). O serviço `culture-edge-ai.ts` já implementa um fallback algorítmico determinístico completo (`generateFallbackVector`), de modo que o app funciona perfeitamente sem o modelo local de 22MB.
- **Proposta**: Avaliar a substituição ou isolamento completo dessa dependência. Por se tratar de mudança funcional relevante no modelo de IA local, registrar como **decisão pendente do usuário**.
- **Impacto**: Alto
- **Esforço**: Médio
- **Risco de quebrar algo**: Alto (decisão pendente do usuário)

### 12. Ausência de Testes Diretos nos Módulos de src/api/tauri
- **Categoria**: Testes
- **Arquivo e linha**: [`src/api/tauri/`](file:///run/media/vini/HD2/BACKUP 05-08-2026/downloads/meus apps/caderno/src/api/tauri/)
- **Problema encontrado**: Há 23 arquivos de implementação específicos do Tauri em `src/api/tauri/` (ex.: `files.ts`, `vault.ts`, `focus.ts`, `calendar.ts`) com 0 testes unitários diretos. Embora `tauri-api.test.ts` faça testes de integração superficiais, as rotinas de tratamento de fallback de erro e serialização não têm testes dedicados.
- **Proposta**: Criar testes unitários com mocks dos plugins `@tauri-apps/plugin-*` para assegurar que os adaptadores Tauri respondem conforme a interface e tratam exceções adequadamente.
- **Impacto**: Médio
- **Esforço**: Médio
- **Risco de quebrar algo**: Baixo

---

## Tabela de Dependências

Avaliação sistemática de todas as 55 dependências de produção declaradas em `package.json`:

| Pacote | Versão Atual | Usos no Código | Fica ou Sai? | Motivo e Justificativa |
| :--- | :--- | :--- | :--- | :--- |
| `@dnd-kit/core` | `^6.3.1` | 13 | **Fica** | Essencial para reordenação drag-and-drop de abas, notas na barra lateral e listas com alta performance. |
| `@dnd-kit/sortable` | `^10.0.0` | 7 | **Fica** | Complemento oficial do dnd-kit para listas ordenáveis com acessibilidade e física fluida. |
| `@dnd-kit/utilities` | `^3.2.2` | 4 | **Fica** | Utilitários de transformação CSS para drag-and-drop. |
| `@ffmpeg/core` | `^0.12.10` | 2 | **Fica** | Núcleo WebAssembly para conversão de vídeo/áudio no navegador sem depender de servidor externo. |
| `@ffmpeg/ffmpeg` | `^0.12.15` | 2 | **Fica** | Wrapper do FFmpeg WebAssembly. Indispensável para o modo Web. |
| `@ffmpeg/util` | `^0.12.2` | 2 | **Fica** | Utilitários de I/O em memória para o FFmpeg. |
| `@floating-ui/react` | `^0.27.19` | 7 | **Fica** | Posicionamento dinâmico (tooltips, popovers, slash menu) com collision detection rigoroso. |
| `@radix-ui/react-dropdown-menu` | `^2.1.19` | 4 | **Fica** | Menus de contexto e botões "mais opções" totalmente acessíveis (WAI-ARIA). |
| `@tauri-apps/api` | `^2.11.1` | 48 | **Fica** | Comunicação nativa IPC com o backend Tauri v2 (Rust). |
| `@tauri-apps/plugin-dialog` | `^2.7.1` | 4 | **Fica** | Diálogos nativos de salvar/abrir arquivo e confirmação no SO. |
| `@tauri-apps/plugin-fs` | `^2.5.1` | 13 | **Fica** | Acesso ao sistema de arquivos local com permissões sandboxadas. |
| `@tauri-apps/plugin-shell` | `^2.3.5` | 2 | **Fica** | Abertura de links externos no navegador padrão do sistema. |
| `@tiptap/extension-code-block-lowlight` | `^3.27.1` | 1 | **Fica** | Destaque de sintaxe de código com `lowlight` no editor. |
| `@tiptap/extension-collaboration` | `^3.27.1` | 1 | **Fica** | Sincronização em tempo real via Yjs CRDTs. |
| `@tiptap/extension-color` | `^3.27.1` | 1 | **Fica** | Suporte a cores de texto personalizadas no editor. |
| `@tiptap/extension-highlight` | `^3.27.1` | 1 | **Fica** | Marcação/destaque de texto (marca-texto). |
| `@tiptap/extension-image` | `^3.27.1` | 1 | **Fica** | Renderização e manipulação de imagens no editor. |
| `@tiptap/extension-link` | `^3.27.1` | 1 | **Fica** | Links interativos e previews de URL no editor. |
| `@tiptap/extension-placeholder` | `^3.27.1` | 1 | **Fica** | Placeholders contextuais ("Digite '/' para comandos..."). |
| `@tiptap/extension-table` | `^3.27.1` | 3 | **Fica** | Tabelas estruturadas dentro das notas. |
| `@tiptap/extension-table-cell` | `^3.27.1` | 1 | **Fica** | Células de tabela do editor. |
| `@tiptap/extension-table-header` | `^3.27.1` | 1 | **Fica** | Cabeçalhos de tabela do editor. |
| `@tiptap/extension-task-item` | `^3.27.1` | 1 | **Fica** | Itens de checklist interativos. |
| `@tiptap/extension-task-list` | `^3.27.1` | 1 | **Fica** | Listas de tarefas estruturadas. |
| `@tiptap/extension-text-style` | `^3.27.1` | 1 | **Fica** | Estilização tipográfica avançada do TipTap. |
| `@tiptap/extension-underline` | `^3.27.1` | 1 | **Fica** | Sublinhado de texto. |
| `@tiptap/pm` | `^3.27.1` | 98 | **Fica** | Primitivas do ProseMirror fundamentais para as extensões customizadas do Synapse. |
| `@tiptap/react` | `^3.27.1` | 75 | **Fica** | Componentes React para integração com TipTap. |
| `@tiptap/starter-kit` | `^3.27.1` | 3 | **Fica** | Extensões básicas (parágrafo, títulos, listas, negrito, etc.). |
| `@xenova/transformers` | `^2.17.2` | 1 | **Avaliar / Decisão** | Gera embeddings semânticos no browser para o Culture Edge AI. Traz vulnerabilidades transitivas e grande volume de dependências (`sharp`, `onnxruntime-web`). |
| `canvas-confetti` | `^1.9.4` | 3 | **Fica** | Efeito leve de celebração (~7KB gzipped) ao concluir quizzes e hábitos. |
| `date-fns` | `^4.4.0` | 8 | **Fica** | Manipulação de datas, formatos e cálculos no calendário e finanças. Tree-shakeable. |
| `dompurify` | `^3.4.12` | 10 | **Fica** | Sanitização rigorosa contra XSS em notas, previews e snapshots HTML. Crítico para a segurança. |
| `emoji-picker-react` | `^4.19.1` | 3 | **Fica** | Seletor de emojis para ícones de páginas e notas estilo Notion. |
| `epubjs` | `^0.3.93` | 14 | **Fica** | Mecanismo de leitura de livros EPUB. Lazily loaded no `EpubReader`. |
| `firebase` | `^12.15.0` | 90 | **Fica** | Autenticação e Firestore E2EE para sincronização em nuvem e colaboração. |
| `highlight.js` | `^11.11.1` | 4 | **Fica** | Parser de sintaxe para blocos de código e visualizador de texto. |
| `htmldiff-js` | `^1.0.5` | 5 | **Fica** | Algoritmo de diff semântico de HTML para o histórico de revisões de notas. |
| `idb` | `^8.0.3` | 49 | **Fica** | Wrapper promise moderno e ultraleve (~2KB) sobre IndexedDB no ambiente Web. |
| `lowlight` | `^3.3.0` | 5 | **Fica** | Integração leve de highlight.js com AST para o TipTap. |
| `lucide-react` | `^1.21.0` | 400 | **Fica** | Biblioteca visual padrão de ícones do Synapse, totalmente tree-shakeable. |
| `mermaid` | `^12.0.0` | 24 | **Fica** | Renderização de diagramas textuais. Lazily loaded sob demanda. |
| `pdfjs-dist` | `^6.0.227` | 22 | **Fica** | Visualização e extração de texto de PDFs. Lazily loaded no `PdfReader`. |
| `react` | `^19.2.6` | 1331 | **Fica** | Framework base do projeto (React 19). |
| `react-dom` | `^19.2.6` | 9 | **Fica** | Renderizador DOM do React. |
| `react-easy-crop` | `^6.0.2` | 2 | **Fica** | Recorte e ajuste de capas de livros e avatares. |
| `react-markdown` | `^10.1.0` | 11 | **Fica** | Renderização de respostas da IA e notas markdown. |
| `recharts` | `^3.9.2` | 6 | **Fica** | Gráficos financeiros e estatísticas de foco/estudo. |
| `rehype-raw` | `^7.0.0` | 2 | **Fica** | Suporte a tags HTML customizadas dentro de Markdown. |
| `remark-gfm` | `^4.0.1` | 9 | **Fica** | Suporte a tabelas, autolinks e strikethrough do GitHub Flavored Markdown. |
| `tesseract.js` | `^7.0.0` | 3 | **Fica** | OCR on-device para PDFs escaneados e imagens. Lazily loaded. |
| `tldraw` | `^5.2.5` | 3 | **Fica** | Quadro branco infinito de diagramação. Lazily loaded no `DiagramEditor`. |
| `ts-fsrs` | `^5.4.1` | 3 | **Fica** | Algoritmo moderno de repetição espaçada FSRS v5. Crítico para os flashcards Anki. |
| `y-prosemirror` | `^1.3.7` | 1 | **Fica** | Conector entre o Yjs CRDT e a árvore de nós do ProseMirror. |
| `yjs` | `^13.6.31` | 25 | **Fica** | Estruturas de dados CRDT para edição concorrente e resolução determinística de conflitos. |

---

## Decisões que Dependem do Usuário

1. **Substituição ou Manutenção de `@xenova/transformers`**:
   - **Situação**: O pacote `@xenova/transformers` é responsável pelas 67 vulnerabilidades apontadas por `npm audit` (via `sharp`, `onnxruntime-web`, `protobufjs`). Ele é usado apenas em `src/services/culture/culture-edge-ai.ts` para download de um modelo MiniLM de 22MB no browser. O serviço já conta com fallback determinístico local baseado em hashing de tokens (`generateFallbackVector`).
   - **Opções**:
     - *Opção A (Recomendada)*: Desinstalar `@xenova/transformers` e adotar o fallback algorítmico já existente ou a API contextual Gemini, eliminando instantaneamente todas as vulnerabilidades do `npm audit` e reduzindo significativamente o tempo de instalação.
     - *Opção B*: Manter `@xenova/transformers` ciente dos alertas do `npm audit` por preferir ter embeddings de rede neural puramente locais na Edge.
2. **Estratégia para a Dependência Fantasma `@radix-ui/react-dialog`**:
   - **Situação**: O `WebVersionModal.tsx` importa `@radix-ui/react-dialog`, mas ele não está no `package.json`.
   - **Opções**:
     - *Opção A (Recomendada)*: Converter `WebVersionModal.tsx` para usar o componente nativo de modal acessível do próprio projeto (`src/components/ui/Modal.tsx`), mantendo paridade visual e eliminando a dependência externa.
     - *Opção B*: Adicionar explicitamente `"@radix-ui/react-dialog": "^1.1.20"` ao `package.json`.

---

## Ordem Sugerida de Execução

As melhorias de baixo e médio risco e alto ganho concreto devem ser aplicadas na seguinte ordem:

1. **Etapa 2 - Atualização do AGENTS.md**:
   - Sincronização do `AGENTS.md` com as convenções do projeto, comandos de validação e estrutura de diretórios em commit dedicado.
2. **Item 1 (Bugs/Riscos de Dependência)**:
   - Resolução da dependência fantasma em `WebVersionModal.tsx` (padronizando para o modal nativo do projeto).
3. **Itens 2, 3 e 4 (Bugs e Robustez de Tipos)**:
   - Remoção do cast duplo `sessionId as unknown as number` em `useFocusTimer.ts`.
   - Adição formal de `setAppIcon` ao contrato `ICadernoAPI['focus']` em `src/api/types.ts`.
   - Limpeza e refinamento de tipagens em `src/api/types.ts`.
4. **Itens 5, 7, 8 e 9 (Desempenho e Robustez de Dados)**:
   - Ajuste dos imports em `BookEditModal.tsx` e `BookInfoModal.tsx` para garantir dynamic import limpo e eliminar o warning do Vite.
   - Uso de `uint8ArrayToBase64` no `sync-push.ts` e `base64ToUint8Array` no `sync-decrypt-batch.ts`.
   - Proteção de acesso a `localStorage` em `focus-sound.ts`.
   - Atualização de `__dirname` para `import.meta.dirname` em `vite.config.ts`.
5. **Item 10 (Qualidade do Código e Padronização de Comentários)**:
   - Tradução de comentários residuais em português para o inglês estrito estipulado no `AGENTS.md`.
6. **Validação Contínua**:
   - Execução de `npm run lint`, `npx tsc -b --noEmit` e testes direcionados a cada commit atômico.

