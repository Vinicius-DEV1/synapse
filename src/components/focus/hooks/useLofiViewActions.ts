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
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkDownloadStatus, setBulkDownloadStatus] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,video/*';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
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
            duration = await new Promise((resolve) => {
              const audio = new Audio(url);
              audio.onloadedmetadata = () => {
                resolve(audio.duration);
                URL.revokeObjectURL(url);
              };
              audio.onerror = () => resolve(undefined);
            });
          } catch (e) {
            console.warn("Could not extract duration", e);
          }

          await uploadNewLofi(file, duration, masterKey, (p) => setProgress(p));
          triggerToast(`Estação "${file.name}" importada com sucesso!`, 'success');
        } catch (err: any) {
          console.error("Erro ao importar Lofi", err);
          triggerToast(err.message || `Erro ao importar Lofi: ${file.name}`, 'error', 5000);
        }
      }
      await loadLofis();
      window.dispatchEvent(new Event('app-sync-trigger'));
      setIsUploading(false);
      setUploadStatusText('');
    };
    input.click();
  };

  const handleToggleSelect = (lofi: LofiItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(lofi.id)) {
        next.delete(lofi.id);
      } else {
        next.add(lofi.id);
      }
      return next;
    });
  };

  const handleDownloadToLocal = async (lofi: LofiItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.api?.lofi) {
      triggerToast("Download local só está disponível no ambiente Desktop.", "error");
      return;
    }
    if (!lofi.drive_file_id) {
      triggerToast("Esta faixa não possui arquivo correspondente na nuvem.", "error");
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
    } catch (err: any) {
      console.error("Erro ao baixar Lofi para uso local:", err);
      triggerToast(err?.message || `Erro ao baixar "${lofi.title}" para uso offline`, 'error', 5000);
    } finally {
      setDownloadingId(null);
      setDownloadProgress(0);
    }
  };

  const handleBulkDownloadToLocal = async () => {
    if (!window.api?.lofi) {
      triggerToast("Download local só está disponível no ambiente Desktop.", "error");
      return;
    }

    const itemsToDownload = lofis.filter(l => selectedIds.has(l.id) && !l.is_local && l.drive_file_id);
    if (itemsToDownload.length === 0) return;

    setIsBulkDownloading(true);
    let successCount = 0;

    for (let i = 0; i < itemsToDownload.length; i++) {
      const item = itemsToDownload[i];
      setDownloadingId(item.id);
      setDownloadProgress(0);
      setBulkDownloadStatus(`Baixando (${i + 1}/${itemsToDownload.length})`);
      try {
        await downloadLofiToLocal(
          item, 
          (percent) => setDownloadProgress(percent),
          masterKey, 
          fallbackKey
        );
        successCount++;
      } catch (err: any) {
        console.error(`Erro ao baixar "${item.title}" em lote:`, err);
      }
    }

    setDownloadingId(null);
    setDownloadProgress(0);
    setIsBulkDownloading(false);
    setBulkDownloadStatus('');
    setSelectedIds(new Set());
    await loadLofis();
    window.dispatchEvent(new Event('app-sync-trigger'));

    if (successCount > 0) {
      triggerToast(`${successCount} faixa(s) baixada(s) para uso offline com sucesso!`, 'success');
    } else {
      triggerToast("Falha ao baixar faixas para uso offline.", 'error');
    }
  };

  const handleBulkDeleteCompletely = async () => {
    if (!confirm(`Tem certeza que deseja mover para a Lixeira ${selectedIds.size} lofi(s)?`)) return;
    const ids = Array.from(selectedIds);
    let count = 0;
    for (const id of ids) {
      const item = lofis.find(l => l.id === id);
      if (item) {
        try {
          await deleteLofiCompletely(item);
          count++;
          if (activeLofi?.id === item.id) {
            setActiveLofi(null);
            setIsPlayingLofi(false);
          }
        } catch (err) {
          console.error("Erro ao deletar Lofi:", err);
        }
      }
    }
    setSelectedIds(new Set());
    await loadLofis();
    window.dispatchEvent(new Event('app-sync-trigger'));
    if (count > 0) {
      triggerToast(`${count} lofi(s) movido(s) para a Lixeira.`, 'success');
    }
  };

  const handleBulkDeleteLocal = async () => {
    if (!confirm(`Tem certeza que deseja apagar LOCALMENTE ${selectedIds.size} lofi(s)?`)) return;
    const ids = Array.from(selectedIds);
    let count = 0;
    for (const id of ids) {
      const item = lofis.find(l => l.id === id);
      if (item) {
        try {
          await deleteLofiLocal(item);
          count++;
          if (activeLofi?.id === item.id) {
            setActiveLofi(null);
            setIsPlayingLofi(false);
          }
        } catch (err) {
          console.error("Erro ao deletar Lofi local:", err);
        }
      }
    }
    setSelectedIds(new Set());
    await loadLofis();
    window.dispatchEvent(new Event('app-sync-trigger'));
    if (count > 0) {
      triggerToast(`${count} lofi(s) apagado(s) localmente.`, 'success');
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
    } catch (err: any) {
      console.error("Erro ao deletar Lofi", err);
      triggerToast(err?.message || "Erro ao mover para a Lixeira.", 'error');
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
    } catch (err: any) {
      console.error("Erro ao deletar Lofi local", err);
      triggerToast(err?.message || "Erro ao apagar arquivo local.", 'error');
    }
    setDeletingId(null);
  };

  const handleRename = async (lofi: LofiItem, newTitle: string) => {
    try {
      await renameLofi(lofi, newTitle);
      await loadLofis();
      window.dispatchEvent(new Event('app-sync-trigger'));
    } catch (err) {
      console.error("Erro ao renomear Lofi:", err);
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
