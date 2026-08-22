/**
 * editorBackupStore.ts
 *
 * `window.__cadernoEditorBackup` maintains the latest in-memory HTML/CRDT snapshot
 * per page — used by `useEditorSync` to restore newly edited content if component
 * remounts before autosave finishes persisting.
 *
 * Idempotent accessor eliminating module evaluation order dependencies.
 */
export function getEditorBackupMap(): Map<string | null, { html: string; crdt: string }> {
  window.__cadernoEditorBackup ??= new Map();
  return window.__cadernoEditorBackup;
}
