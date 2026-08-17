import type { ICadernoAPI } from './api/types';

declare global {
  interface Window {
    api: ICadernoAPI;
    __TAURI_INTERNALS__?: Record<string, unknown>;
    __cadernoModuleKeys?: Record<string, unknown>;
    /**
     * Arquivos de imagem esperando o upload criptografado terminar, indexados
     * pelo ID temporário (`uploading_...`). Populado em `useEditorDropPaste` e
     * `BlobImageInterceptor`; lido em `EncryptedImage` para recuperar o File
     * original quando o node view remonta antes do upload terminar.
     */
    __pendingImageUploads?: Map<string, File>;
    /**
     * Backup em memória do conteúdo do editor por página, usado por
     * `useEditorSync` para recuperar um CRDT recém-editado quando o componente
     * remonta antes do autosave persistir (ex.: troca rápida de aba).
     */
    __cadernoEditorBackup?: Map<string | null, { html: string; crdt: string }>;
  }
}

export {};
