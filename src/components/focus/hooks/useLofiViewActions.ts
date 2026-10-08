import { useState } from 'react';
import type { LofiItem } from '../../../types';
import { 
  uploadNewLofi, 
  deleteLofiCompletely, 
  deleteLofiLocal, 
  renameLofi,
  downloadLofiToLocal 
} from '../../../services/lofi-manager';
import { triggerToast } from '../../ui/ToastContext';
import { useLofiBulkActions } from './useLofiBulkActions';

interface UseLofiViewActionsProps {
  lofis: LofiItem[];
  activeLofi: LofiItem | null;
  setActiveLofi: (lofi: LofiItem | null) => void;
  isPlayingLofi: boolean;
  setIsPlayingLofi: (playing: boolean) => void;
  loadLofis: () => Promise<void>;
  masterKey?: CryptoKey;
  fallbackKey?: CryptoKey;
}

export function useLofiViewActions({
  lofis,
  activeLofi,
  setActiveLofi,
  isPlayingLofi,
  setIsPlayingLofi,
  loadLofis,
  masterKey,
  fallbackKey
}: UseLofiViewActionsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const {
    selectedIds,
    setSelectedIds,
    isBulkDownloading,
    bulkDownloadStatus,
    handleToggleSelect,
    handleBulkDownloadToLocal,
    handleBulkDeleteCompletely,
    handleBulkDeleteLocal,
  } = useLofiBulkActions({
    lofis,
    activeLofi,
    setActiveLofi,
    setIsPlayingLofi,
    loadLofis,
    masterKey,
    fallbackKey,
    setDownloadingId,
    setDownloadProgress,
  });

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,video/*';
    input.multiple = true;
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      const files = Array.from(target?.files || []);
      if (!files.length) return;
      
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatusText(`Enviando (${i + 1}/${files.length})`);
        setProgress(0);
        try {
          let duration: number | undefined;
          try {
            const url = URL.createObjectURL(file);
            duration = await new Promise<number | undefined>((resolve) => {
              const audio = new Audio(url);
              audio.onloadedmetadata = () => {
                resolve(audio.duration);
                URL.revokeObjectURL(url);
              };
              audio.onerror = () => resolve(undefined);
            });
          } catch (durErr: unknown) {
            console.warn('Could not extract duration', durErr);
          }

          await uploadNewLofi(file, duration, masterKey, (p) => setProgress(p));
          triggerToast(`Estação "${file.name}" importada com sucesso!`, 'success');
        } catch (err: unknown) {
          console.error('Erro ao importar Lofi', err);
          const message = err instanceof Error ? err.message : `Erro ao importar Lofi: ${file.name}`;
          triggerToast(message, 'error', 5000);
        }
      }
      await loadLofis();
      window.dispatchEvent(new Event('app-sync-trigger'));
      setIsUploading(false);
      setUploadStatusText('');
    };
    input.click();
  };

  const handleDownloadToLocal = async (lofi: LofiItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.api?.lofi) {
      triggerToast('Download local só está disponível no ambiente Desktop.', 'error');
      return;
    }
    if (!lofi.drive_file_id) {
      triggerToast('Esta faixa não possui arquivo correspondente na nuvem.', 'error');
      return;
    }

    setDownloadingId(lofi.id);
    setDownloadProgress(0);
    triggerToast(`Iniciando download de "${lofi.title}"...`, 'info', 2000);

    try {
      await downloadLofiToLocal(
        lofi, 
        (percent) => setDownloadProgress(percent),
        masterKey, 
        fallbackKey
      );
      await loadLofis();
      window.dispatchEvent(new Event('app-sync-trigger'));
      triggerToast(`Faixa "${lofi.title}" baixada para uso offline com sucesso!`, 'success');
    } catch (err: unknown) {
      console.error('Erro ao baixar Lofi para uso local:', err);
      const message = err instanceof Error ? err.message : `Erro ao baixar "${lofi.title}" para uso offline`;
      triggerToast(message, 'error', 5000);
    } finally {
      setDownloadingId(null);
      setDownloadProgress(0);
    }
  };

  const handleDeleteCompletely = async (lofi: LofiItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Tem certeza que deseja mover para a Lixeira o lofi "${lofi.title}"?`)) {
      setDeletingId(null);
      return;
    }
    try {
      await deleteLofiCompletely(lofi);
      await loadLofis();
      window.dispatchEvent(new Event('app-sync-trigger'));
      triggerToast(`"${lofi.title}" movido para a Lixeira.`, 'success');
      if (activeLofi?.id === lofi.id) {
        setActiveLofi(null);
        setIsPlayingLofi(false);
      }
    } catch (err: unknown) {
      console.error('Erro ao deletar Lofi', err);
      const message = err instanceof Error ? err.message : 'Erro ao mover para a Lixeira.';
      triggerToast(message, 'error');
    }
    setDeletingId(null);
  };

  const handleDeleteLocal = async (lofi: LofiItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Tem certeza que deseja apagar LOCALMENTE o lofi "${lofi.title}"?`)) {
      setDeletingId(null);
      return;
    }
    try {
      await deleteLofiLocal(lofi);
      await loadLofis();
      window.dispatchEvent(new Event('app-sync-trigger'));
      triggerToast(`Arquivo local de "${lofi.title}" apagado com sucesso.`, 'success');
      if (activeLofi?.id === lofi.id) {
        setActiveLofi(null);
        setIsPlayingLofi(false);
      }
    } catch (err: unknown) {
      console.error('Erro ao deletar Lofi local', err);
      const message = err instanceof Error ? err.message : 'Erro ao apagar arquivo local.';
      triggerToast(message, 'error');
    }
    setDeletingId(null);
  };

  const handleRename = async (lofi: LofiItem, newTitle: string) => {
    try {
      await renameLofi(lofi, newTitle);
      await loadLofis();
      window.dispatchEvent(new Event('app-sync-trigger'));
    } catch (err: unknown) {
      console.error('Erro ao renomear Lofi:', err);
    }
  };

  const togglePlay = (lofi: LofiItem) => {
    if (activeLofi?.id === lofi.id) {
      setIsPlayingLofi(!isPlayingLofi);
    } else {
      setActiveLofi(lofi);
      setIsPlayingLofi(true);
    }
  };

  return {
    isUploading,
    progress,
    uploadStatusText,
    deletingId,
    setDeletingId,
    downloadingId,
    downloadProgress,
    isBulkDownloading,
    bulkDownloadStatus,
    selectedIds,
    setSelectedIds,
    handleImport,
    handleToggleSelect,
    handleDownloadToLocal,
    handleBulkDownloadToLocal,
    handleBulkDeleteCompletely,
    handleBulkDeleteLocal,
    handleDeleteCompletely,
    handleDeleteLocal,
    handleRename,
    togglePlay
  };
}
