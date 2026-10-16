import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { FileItem, FileFolder } from '../../types';
import { getValidAccessToken, deleteFromDrive } from '../../services/drive';
import { Portal } from '../ui/Portal';
import { triggerToast } from '../ui/ToastContext';
import { useTranslation } from '../../i18n';

interface DeleteModalProps {
  item?: FileItem | FileFolder;
  isFolder?: boolean;
  items?: Array<{ item: FileItem | FileFolder; isFolder: boolean }>;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteModal({ item, isFolder, items, onClose, onDeleted }: DeleteModalProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [keepInDrive, setKeepInDrive] = useState(false);

  const list = items || (item ? [{ item, isFolder: !!isFolder }] : []);
  const isBulk = list.length > 1;
  const hasDriveFile = list.some(x => !x.isFolder && (x.item as FileItem).drive_file_id);
  const foldersCount = list.filter(x => x.isFolder).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        e.stopPropagation();
        onClose();
      }
    };
    const handleBackPress = (e: Event) => {
      if (!isDeleting) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [isDeleting, onClose]);

  const handleDelete = async () => {
    if (!window.api.files) return;
    setIsDeleting(true);
    let driveDeleteFailed = false;

    try {
      for (const entry of list) {
        if (entry.isFolder) {
          await window.api.files.folders.delete(entry.item.id);
        } else {
          const fileItem = entry.item as FileItem;

          // Remove from database and delete local file via backend
          await window.api.files.delete(fileItem.id);
          
          // Delete from Google Drive if requested
          if (!keepInDrive && fileItem.drive_file_id) {
            try {
              const token = await getValidAccessToken();
              if (token) {
                await deleteFromDrive(token, fileItem.drive_file_id);
              }
            } catch (e) {
              console.warn("Failed to delete from Drive", e);
              driveDeleteFailed = true;
            }
          }
        }
      }

      if (driveDeleteFailed) {
        triggerToast('Item(ns) excluído(s) localmente, mas houve falha ao remover do Google Drive.', 'error', 4000);
      } else {
        triggerToast(isBulk ? `${list.length} itens excluídos.` : 'Item excluído.', 'info');
      }
      onDeleted();
    } catch (e: unknown) {
      console.error("Delete failed", e);
      const msg = e instanceof Error ? e.message : "Falha ao excluir item(ns).";
      triggerToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-dark-card border border-red-500/20 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        <div className="flex flex-col items-center justify-center p-6 gap-4">
          <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white mb-1">
              {isBulk ? t('files.confirmDeleteBulk', { count: list.length }) : (list[0]?.isFolder ? t('files.confirmDeleteSingle', { name: t('files.folder') }) : t('files.confirmDeleteSingle', { name: t('files.file') }))}
            </h2>
            <p className="text-dark-subtext text-sm">
              {isBulk ? (
                <>{t('files.confirmDeleteBulkPrompt', { count: list.length })}</>
              ) : (
                <>{t('files.confirmDeleteSinglePrompt', { name: list[0]?.item.name })}</>
              )}
              {foldersCount > 0 && t('files.folderOrphanWarning')}
            </p>
          </div>

          {hasDriveFile && (
            <div className="w-full mt-2 flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <input 
                type="checkbox" 
                id="keepInDrive" 
                checked={keepInDrive} 
                onChange={e => setKeepInDrive(e.target.checked)}
                className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="keepInDrive" className="text-sm text-dark-subtext cursor-pointer">
                {t('files.keepInDrive')}
              </label>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-white/10 bg-dark-bg/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors"
          >
            {t('files.cancel')}
          </button>
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            {isDeleting ? t('files.deleting') : t('files.deleteConfirmBtn')}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
