/**
 * editorBackupStore.ts
 *
 * `window.__cadernoEditorBackup` guarda, por página, o HTML/CRDT mais recente
 * que o editor produziu — usado por `useEditorSync` para recuperar conteúdo
 * recém-editado quando o componente remonta antes do autosave persistir.
 *
 * Antes o Map era criado por um side effect no topo do módulo de
 * `useEditorSync.ts`, e `useEditorSave.ts` confiava que aquele módulo já tinha
 * sido importado primeiro para o Map existir — verdade hoje (Editor.tsx importa
 * useEditorSync antes de useEditorSave), mas é uma invariante silenciosa entre
 * dois arquivos sem relação direta. Este acessor idempotente elimina a
 * dependência de ordem de import.
 */
export function getEditorBackupMap(): Map<string | null, { html: string; crdt: string }> {
  window.__cadernoEditorBackup ??= new Map();
  return window.__cadernoEditorBackup;
}
