import { useState } from 'react';
import type { LofiItem } from '../../../types';
import { 
  deleteLofiCompletely, 
  deleteLofiLocal, 
  downloadLofiToLocal 
} from '../../../services/lofi-manager';
import { triggerToast } from '../../ui/ToastContext';

interface UseLofiBulkActionsProps {
  lofis: LofiItem[];
  activeLofi: LofiItem | null;
  setActiveLofi: (lofi: LofiItem | null) => void;
  setIsPlayingLofi: (playing: boolean) => void;
  loadLofis: () => Promise<void>;
  masterKey?: CryptoKey;
  fallbackKey?: CryptoKey;
  setDownloadingId: (id: string | null) => void;
  setDownloadProgress: (progress: number) => void;
}

export function useLofiBulkActions({
  lofis,
  activeLofi,
  setActiveLofi,
  setIsPlayingLofi,
  loadLofis,
  masterKey,
  fallbackKey,
  setDownloadingId,
  setDownloadProgress,
}: UseLofiBulkActionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkDownloadStatus, setBulkDownloadStatus] = useState<string>('');

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

  const handleBulkDownloadToLocal = async () => {
    if (!window.api?.lofi) {
      triggerToast('Download local só está disponível no ambiente Desktop.', 'error');
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
      } catch (err: unknown) {
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
      triggerToast('Falha ao baixar faixas para uso offline.', 'error');
    }
  };

  const handleBulkDeleteCompletely = async () => {
    const msg = `Tem certeza que deseja mover para a Lixeira ${selectedIds.size} lofi(s)?`;
    const confirmed = window.api?.app?.showConfirm
      ? (await window.api.app.showConfirm({
          title: 'Mover Lofis para a Lixeira',
          message: msg,
          kind: 'warning',
        })) === 1
      : typeof window !== 'undefined' && typeof window.confirm === 'function' && window.confirm(msg);
    if (!confirmed) return;
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
        } catch (err: unknown) {
          console.error('Erro ao deletar Lofi:', err);
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
    const msg = `Tem certeza que deseja apagar LOCALMENTE ${selectedIds.size} lofi(s)?`;
    const confirmed = window.api?.app?.showConfirm
      ? (await window.api.app.showConfirm({
          title: 'Apagar Lofis Locais',
          message: msg,
          kind: 'warning',
        })) === 1
      : typeof window !== 'undefined' && typeof window.confirm === 'function' && window.confirm(msg);
    if (!confirmed) return;
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
        } catch (err: unknown) {
          console.error('Erro ao deletar Lofi local:', err);
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

  return {
    selectedIds,
    setSelectedIds,
    isBulkDownloading,
    bulkDownloadStatus,
    handleToggleSelect,
    handleBulkDownloadToLocal,
    handleBulkDeleteCompletely,
    handleBulkDeleteLocal,
  };
}
