import type { ICadernoAPI } from './api/types';

declare global {
  interface Window {
    api: ICadernoAPI;
    __TAURI_INTERNALS__?: Record<string, unknown>;
    __cadernoModuleKeys?: Record<string, unknown>;
    /**
     * Pending encrypted image files waiting for upload to finish, keyed by
     * temporary ID (`uploading_...`). Populated in `useEditorDropPaste` and
     * `BlobImageInterceptor`; read in `EncryptedImage` to recover original File
     * when node view remounts before upload completes.
     */
    __pendingImageUploads?: Map<string, File>;
    /**
     * In-memory editor content backup per page, used by `useEditorSync`
     * to recover recently edited CRDT state when the component remounts
     * before autosave persists (e.g. quick tab switching).
     */
    __cadernoEditorBackup?: Map<string | null, { html: string; crdt: string }>;
  }
}

export {};
