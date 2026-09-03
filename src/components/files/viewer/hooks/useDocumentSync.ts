import { useState, useCallback } from 'react';
import type { FileItem } from '../../../../types';
import { getValidAccessToken } from '../../../../services/drive/drive-auth';
import { updateInDrive, uploadToDrive } from '../../../../services/drive/drive-operations';
import { encryptFile } from '../../../../services/storage';
import { triggerToast } from '../../../ui/ToastContext';

interface UseDocumentSyncOptions {
  item: FileItem;
  masterKey?: CryptoKey | null;
  onContentUpdated?: (newContent: string) => void;
}

export function useDocumentSync({ item, masterKey, onContentUpdated }: UseDocumentSyncOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveDocument = useCallback(
    async (newText: string): Promise<boolean> => {
      setIsSaving(true);
      setSaveError(null);

      // 1. Optimistic UI update for 0ms perceived latency
      onContentUpdated?.(newText);

      try {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(newText);
        let newLocalPath = item.local_path;

        // 2. Persist to local filesystem (Desktop / Tauri)
        if (typeof window !== 'undefined' && window.api?.files?.saveLocal) {
          try {
            newLocalPath = await window.api.files.saveLocal(item.name, bytes);
          } catch (localErr) {
            console.error('[useDocumentSync] Failed to save local file:', localErr);
            throw new Error('Falha ao gravar arquivo no disco local.');
          }
        }

        // 3. Update Database Record
        const updatedItem: FileItem = {
          ...item,
          file_size: bytes.length,
          local_path: newLocalPath || item.local_path,
          updated_at: new Date().toISOString(),
        };

        if (typeof window !== 'undefined' && window.api?.files?.update) {
          await window.api.files.update(updatedItem);
        }

        // 4. Background Google Drive Synchronization
        let driveUploadSuccess = false;
        let wasDriveOffline = false;

        try {
          const token = await getValidAccessToken();
          if (token) {
            setIsSyncingDrive(true);

            let uploadBuffer: ArrayBuffer = bytes.buffer as ArrayBuffer;
            let driveFileName = item.name;

            if (masterKey) {
              uploadBuffer = await encryptFile(bytes.buffer as ArrayBuffer, masterKey);
              driveFileName = item.name.endsWith('.enc') ? item.name : `${item.name}.enc`;
            }

            if (item.drive_file_id) {
              await updateInDrive(token, item.drive_file_id, uploadBuffer);
              driveUploadSuccess = true;
            } else {
              const newDriveId = await uploadToDrive(token, driveFileName, uploadBuffer, 'root');
              if (newDriveId) {
                updatedItem.drive_file_id = newDriveId;
                if (typeof window !== 'undefined' && window.api?.files?.update) {
                  await window.api.files.update(updatedItem);
                }
                driveUploadSuccess = true;
              }
            }
          } else {
            wasDriveOffline = true;
          }
        } catch (driveErr) {
          console.warn('[useDocumentSync] Google Drive background sync warning:', driveErr);
          wasDriveOffline = true;
        } finally {
          setIsSyncingDrive(false);
        }

        // 5. Notify the rest of the application
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('caderno-file-updated', {
              detail: { fileId: item.id, item: updatedItem },
            })
          );
        }

        if (driveUploadSuccess) {
          triggerToast('Documento salvo e sincronizado com o Drive!', 'success');
        } else if (wasDriveOffline) {
          triggerToast('Documento salvo localmente. Sincronização com o Drive pendente.', 'info');
        } else {
          triggerToast('Documento salvo com sucesso!', 'success');
        }

        return true;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Falha ao salvar o documento.';
        console.error('[useDocumentSync] Save error:', err);
        setSaveError(errorMsg);
        triggerToast(errorMsg, 'error');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [item, masterKey, onContentUpdated]
  );

  return {
    isSaving,
    isSyncingDrive,
    saveError,
    saveDocument,
  };
}
