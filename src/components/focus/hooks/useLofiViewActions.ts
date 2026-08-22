import { useState } from 'react';
import type { LofiItem } from '../../../types';
import { uploadNewLofi, deleteLofiCompletely, deleteLofiLocal, renameLofi } from '../../../services/lofi-manager';
import { triggerToast } from '../../ui/ToastContext';

interface UseLofiViewActionsProps {
  lofis: LofiItem[];
  activeLofi: LofiItem | null;
  setActiveLofi: (lofi: LofiItem | null) => void;
  isPlayingLofi: boolean;
  setIsPlayingLofi: (playing: boolean) => void;
  loadLofis: () => Promise<void>;
  masterKey?: CryptoKey;
}

export function useLofiViewActions({
  lofis,
  activeLofi,
  setActiveLofi,
  isPlayingLofi,
  setIsPlayingLofi,
  loadLofis,
  masterKey
}: UseLofiViewActionsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const handleBulkDeleteCompletely = async () => {
    if (!confirm(`Tem certeza que deseja mover para a Lixeira ${selectedIds.size} lofi(s)?`)) return;
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const item = lofis.find(l => l.id === id);
      if (item) {
        try {
          await deleteLofiCompletely(item);
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
  };

  const handleBulkDeleteLocal = async () => {
    if (!confirm(`Tem certeza que deseja apagar LOCALMENTE ${selectedIds.size} lofi(s)?`)) return;
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const item = lofis.find(l => l.id === id);
      if (item) {
        try {
          await deleteLofiLocal(item);
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
      if (activeLofi?.id === lofi.id) {
        setActiveLofi(null);
        setIsPlayingLofi(false);
      }
    } catch (err) {
      console.error("Erro ao deletar Lofi", err);
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
      if (activeLofi?.id === lofi.id) {
        setActiveLofi(null);
        setIsPlayingLofi(false);
      }
    } catch (err) {
      console.error("Erro ao deletar Lofi local", err);
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
    selectedIds,
    setSelectedIds,
    handleImport,
    handleToggleSelect,
    handleBulkDeleteCompletely,
    handleBulkDeleteLocal,
    handleDeleteCompletely,
    handleDeleteLocal,
    handleRename,
    togglePlay
  };
}
