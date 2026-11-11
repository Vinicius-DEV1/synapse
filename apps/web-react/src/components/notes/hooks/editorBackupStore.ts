import { LruMap } from '../../../utils/lru-cache';

/**
 * editorBackupStore.ts
 *
 * `window.__cadernoEditorBackup` maintains the latest in-memory HTML/CRDT snapshot
 * per page (capped at 30 pages via LRU eviction) — used by `useEditorSync` to restore
 * newly edited content if component remounts before autosave finishes persisting.
 *
 * Idempotent accessor eliminating module evaluation order dependencies.
 */
export function getEditorBackupMap(): Map<string | null, { html: string; crdt: string }> {
  window.__cadernoEditorBackup ??= new LruMap<string | null, { html: string; crdt: string }>(30);
  return window.__cadernoEditorBackup;
}
