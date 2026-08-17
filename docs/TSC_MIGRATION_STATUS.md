# Status: ativação do `tsc` no build — RETOMAR AQUI

Contexto para quem continuar. Sessão anterior parou por falta de tokens do
usuário, não porque o trabalho terminou.

## O objetivo

O usuário pediu: analisar e consertar bugs de drag-and-drop/agrupamento em
colunas no editor (Tiptap), sem gambiarra. Isso foi feito e commitado em
13 commits atômicos anteriores (ver `git log`, prefixo `fix(group-layout)`,
`feat(editor)`, etc — tudo antes do commit `da22e93`).

No processo, descobrimos que **a verificação de tipos do projeto está
desligada**: `package.json` → script `build` roda `tsc && vite build`, mas
`tsconfig.json` raiz tem `"files": []` e só referencia os outros dois configs
via `references`. `tsc` sem a flag `-b` **não segue `references`** — logo
compila zero arquivos e sempre sai com exit 0. Rodando do jeito certo:

```bash
npx tsc --noEmit -p tsconfig.app.json
```

... apareceram **671 erros reais** (confirmado, não é ruído de configuração
solta — `skipLibCheck: true` já está ativo, `tsconfig.node.json` sozinho está
100% limpo).

Usuário aprovou corrigir tudo antes de ativar o `tsc -b` de verdade no build
(ver a pergunta feita via `AskUserQuestion` e a resposta "Corrigir tudo agora").

## Estado atual (commit `da22e93`)

**671 → 284 erros.** Lista completa e atualizada dos 284 restantes está em
`docs/tsc-remaining-errors.txt` (gerado com o comando acima). **Rode o comando
de novo antes de continuar** — o número pode ter mudado se algo mais tocou o
repo nesse meio tempo.

### Divisão de trabalho usada (5 fatias, arquivos não sobrepostos)

O trabalho foi paralelizado em 5 agentes background, cada um com uma lista
fixa de arquivos e a mesma regra: **nunca usar `any`/`@ts-ignore`/cast só pra
calar o compilador** — corrigir de verdade, ou documentar por que não deu e
deixar o erro registrado. Quando a causa raiz é um tipo compartilhado fora do
escopo do agente (ex.: `ICadernoAPI` em `src/api/types.ts`, `CardDraft` em
`src/components/anki/types.ts`, `LibraryBook` em `src/types/library.ts`), a
convenção usada foi **`declare module` local ou tipo estendido pontual,
comentado**, nunca editar o arquivo de tipo compartilhado por fora do escopo
(pra não conflitar com outro agente mexendo nele ao mesmo tempo).

| Lote | Escopo | Status |
|---|---|---|
| A | `components/library/**`, `components/video-player/**`, `services/video/**` | video-player + services/video **completos**. library: **~15 arquivos feitos**, faltam `EpubReader.tsx`, `epub/EpubContext.tsx`, `epub/EpubHighlightMenu.tsx` (maior bloco, ~20 erros), `epub/EpubSidebars.tsx`, `epub/hooks/useEpubHighlightActions.ts`, `epub/useEpubLoader.ts`, `epub/useEpubTheme.ts`, `hooks/useLibraryData.ts`, `LibraryView.tsx` (1 erro só), `PdfReader.tsx`, `pdf/hooks/*`, `ui/CoverPickerSection.tsx` |
| B | `components/anki/**`, `components/practice/**`, `components/settings/**` | practice **completo**. anki/settings: maioria feita, bloqueados por 3 gaps de tipo fora do escopo (ver abaixo) |
| C | `services/sync/**`, `components/files/**`, `components/culture/**`, `api/web/**`, `hooks/useSync.ts` | files/culture/api-web/useSync **completos**. sync: `sync-utils.ts` trivial pendente (1 import morto), `sync-pdf.ts` quase pronto (2 erros), **`sync-pull.ts` não iniciado (33 erros, é o maior bloco do projeto)**, `sync-push.ts` não iniciado (6 erros) |
| D | `components/focus/**`, `store/focus/**`, `store/FocusContext.tsx`, `components/layout/**`, `components/vault/**`, `components/calendar/**` | **completo e verificado** (confirmado por tsc filtrado, zero erros nesses paths) |
| E | resto disperso (ai-sidebar, AuthScreen, trash, home, ui/, notifications, diagrams, finance, services diversos, api/tauri, utils/pdf-cover.ts, hooks/use*Actions) | maioria feita. Pendente: `services/image-drive.ts` (3), `services/lofi-manager.ts` (10 — mesmo padrão de `declare module` que já funcionou em outros arquivos do lote deve resolver), `services/stats-manager.ts` (1), `services/storage.ts` (1, falta `return`), `services/culture.ts` (3), `services/ffmpeg-web.ts` (1), `hooks/useAIActions.ts` (1), `hooks/usePageActions.ts` (1), `utils/pdf-cover.ts` (1), e 1 erro documentado (não forçado) em `AiSidebar.tsx` que precisa mexer em `usePageMentions.ts`/`useAiChatSubmit.ts` (fora do escopo original) |
| Núcleo (eu, sessão principal) | `components/editor/**`, `components/editor-extensions/**`, `components/Editor.tsx`, `App.tsx`, `main.tsx`, `store/useStore.tsx`, `store/commands.ts`, `tauri-api.ts`, `types/core.ts` | **App.tsx: 3 erros pendentes**, entrelaçados com `usePageActions.ts` (lote E) e `GlobalModals.tsx`/`useSync.ts` (lotes D/C) — precisam ser revisitados juntos agora que esses arquivos foram corrigidos, deve ser rápido. `editor-extensions/`: a maioria feita, sobrou `BlockquoteToggle.tsx` (4 erros, cast de `EventTarget`→`Node` do ProseMirror — não banal, ver abaixo), `CalendarEventModal.tsx` (2, campo `type_`→`type`), `YouTubePlaylistModal.tsx` (`SyncApi.push` não existe — mesmo padrão dos outros `declare module`), `quiz/**` (alguns arquivos), `links/LinkPreviewBlock.tsx` (3, `ICadernoAPI.os` não existe) |

### Achados importantes (não são só "erro de tipo", são bugs reais que os agentes corrigiram)

- **`SetupModal`/`AlarmSetupModal` do editor**: o botão X/cancelar não fazia
  nada. `EditorModalHost.tsx` passava `isOpen`/`onClose` — props que esses
  componentes nunca declararam (eles usam `onCancel`, obrigatório, nunca
  recebido). Corrigido — ver commit `da22e93`.
- **`FolderModal.tsx`** (lote C): `folders.update()` retorna `Promise<number>`
  (contagem de linhas afetadas), mas o código tratava o retorno como o objeto
  da pasta. Corrigido.
- **`video.local_path`** (lote A): typo — campo real em `VideoItem` é
  `file_path`. Estava quebrando silenciosamente em algum fluxo de vídeo.
- **`useAlarmScheduler.ts`** (lote D): chamava `toggleAlarm`/`saveAlarm`, que
  não existem na API real — substituído por `updateAlarm`/`createAlarm`.
- **`useFocusTimer.ts`** (lote D): `window.api.setAppIcon` apontava pra um
  caminho que não existe — corrigido para `window.api.focus.setAppIcon`.
- **`store/useStore.tsx`**: `state.activeModule` não existe mais em
  `AppState` (migrou pra `Tab.module`, por aba) — o código persistia
  `undefined` há quem sabe quanto tempo. Removido (dead code real).

### Gaps de tipo compartilhado que várias fatias bateram na mesma parede

Se for arrumar a raiz em vez de ficar remendando com `declare module` em cada
arquivo, esses são os arquivos certos pra editar (cada um listado por quem
bateu nele):

1. **`src/api/types.ts`** (`ICadernoAPI`) — faltam, entre outros:
   `anki.migrateToNotes/updateDeckSettings/getDeckSettings/importDeck/
   exportDeckRecursive/getReviews/getCardIntervals`, `log`, `drive.
   openExternalUrl/getCredentials/saveCredentials`, `lofi.*`,
   `video.onDownloadProgress/getStreamPort/cancelConversion/
   generateWebVersion`, `sync.getRowsByIds/getTable`, `files.saveLocal` com 2
   parâmetros. Todos **existem de verdade** nas implementações
   (`api/tauri/*.ts` / `api/web/*.ts`), só faltam na interface.
2. **`src/components/anki/types.ts`** (`CardDraft`) — falta `video_clip: {
   path, startMs, endMs }` e `tts_text: string` (usados de verdade em
   `AudioPreview.tsx`/`useCardEditorForm.ts`; já existe até um cast
   `(draft as any).video_clip` confirmando que o gap é antigo).
3. **`src/utils/settings.ts`** (`AppSettings`) — falta `autoLockMinutes`
   (usado em `AutoLockSection.tsx`, nem existe no objeto de defaults).
4. **`src/types/library.ts`** (`LibraryBook`) — falta `current_page` e
   `reading_preferences` (usados de verdade no fluxo de leitura epub/pdf).
5. **`src/types/store.ts`** (`Tab['module']`) — falta `'settings'` como valor
   possível (usado em `Sidebar.tsx` e em outros lugares).

Se alguém for arrumar isso na raiz, é seguro — são campos **aditivos**
(opcionais), sem mudança de comportamento, e destravam vários arquivos de
uma vez.

### O caso mais espinhoso: `BlockquoteToggle.tsx`

`event.target as Node` está dando erro porque o `Node` importado ali é o
`Node` do **ProseMirror** (`@tiptap/pm/model`), não o `Node` do DOM — import
ambíguo/sombreado. A correção não é um cast, é garantir que o import certo
(`Node` do lib.dom, não precisa nem importar, é global) está sendo usado no
lugar certo. Não cheguei a resolver — só documentando o diagnóstico.

### `sync-pull.ts` (33 erros, o maior bloco)

Ninguém tocou ainda. O agente do lote C leu os erros e mapeou (não mudou
lógica):
- `SyncApi.getRowsByIds` não existe no tipo (existe na implementação real).
- ~15 ocorrências de `cloudData` tipado como `unknown` (provavelmente vem de
  `doc.data()` do Firestore — precisa tipar o retorno).
- `ICadernoAPI.log` não existe (~10 ocorrências).
- Um `TS2339` esquisito em `{}.updated_at`/`{}.created_at` linha ~305,
  possivelmente o mesmo bug de inferência de `Map` visto e corrigido em
  `anki-notes.ts` (tipar a tupla do `.map()` explicitamente resolveu lá).

**Instrução original pra esse arquivo**: é lógica crítica de sync/CRDT,
corrigir SÓ tipo, nunca lógica. Se aparecer algo que cheira a bug de lógica
de verdade (não só tipagem), documentar e não mexer sozinho.

## Como retomar

1. Rode `npx tsc --noEmit -p tsconfig.app.json 2>&1 | tee docs/tsc-remaining-errors.txt`
   pra confirmar o número atual (era 284 no commit `da22e93`).
2. Ataque por arquivo, seguindo a tabela acima. `sync-pull.ts` e a leitura
   epub/pdf (`EpubHighlightMenu.tsx`, `PdfReader.tsx`) são os blocos maiores.
3. Depois de zerar os 284, resolva os 5 gaps de tipo compartilhado (seção
   acima) OU garanta que cada `declare module` pontual continua funcionando.
4. **Só então** troque o script `build` em `package.json`:
   ```json
   "build": "tsc -b && vite build",
   ```
   e rode `npm run build` inteiro pra confirmar.
5. Commits atômicos — o usuário pediu isso explicitamente. Um commit por
   arquivo ou por grupo pequeno relacionado, não um commit gigante (o
   `da22e93` já é uma exceção, feito sob pressão de tempo/tokens).

## Também pendente da tarefa original (drag-and-drop), fora do escopo do tsc

Do plano aprovado antes desta fase de tipos — ainda não feito:
- [x] Trocar `useBlockHandle.ts` caseiro pela extensão oficial
  `@tiptap/extension-drag-handle-react` (usuário pediu para NÃO fazer no momento, **SKIPPED**).
- [x] Instalar `@tiptap/extension-text-style` + `@tiptap/extension-color` pra
  ligar o submenu "Cor do bloco" do `BlockHandle.tsx`.
- [x] Escrever suíte de testes (`vitest`, não instalado) pro `group-layout/`.
- [x] Fase 5 do plano original (relaxar schema `columnBlock{1,5}`, resolver
  `GroupBlock` legado).
