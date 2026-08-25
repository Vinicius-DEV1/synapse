import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../../../store/useStore';
import { hardDeleteLofiPermanently } from '../../../services/lofi-manager';
import { triggerToast } from '../../ui/ToastContext';

export interface TrashItem {
  id: string;
  title: string;
  item_type: string;
  deleted_at: string;
}

export function useTrash() {
  const { dispatch } = useStore();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isEmptying, setIsEmptying] = useState(false);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      if (window.api?.trash) {
        const res = await window.api.trash.getAll();
        setItems(res || []);
      }
    } catch (e: any) {
      console.error("Erro ao carregar lixeira:", e);
      setItems([]);
      triggerToast(e.message || 'Erro ao carregar itens da lixeira', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleRestore = useCallback(async (item: TrashItem) => {
    setProcessingId(item.id);
    try {
      if (window.api?.trash) {
        await window.api.trash.restore(item.id, item.item_type);
        setItems(prev => prev.filter(i => i.id !== item.id));
        if (item.item_type === 'page' || item.item_type === 'lofi') {
          window.dispatchEvent(new Event('app-sync-trigger'));
        }
        triggerToast(`"${item.title}" restaurado com sucesso!`, 'success');
      }
    } catch (e: any) {
      console.error(e);
      triggerToast(e.message || "Falha ao restaurar item.", 'error');
    } finally {
      setProcessingId(null);
    }
  }, [dispatch]);

  const handleHardDelete = useCallback(async (item: TrashItem) => {
    if (!confirm(`Excluir permanentemente "${item.title}"? Esta ação não pode ser desfeita.`)) return;
    
    setProcessingId(item.id);
    try {
      if (item.item_type === 'lofi' && window.api?.sync) {
        try {
          const rows = await window.api.sync.getTable('lofis');
          const lofi = rows?.find((r: any) => r.id === item.id);
          if (lofi) {
            await hardDeleteLofiPermanently(lofi);
            setItems(prev => prev.filter(i => i.id !== item.id));
            window.dispatchEvent(new Event('app-sync-trigger'));
            triggerToast(`"${item.title}" excluído permanentemente.`, 'info');
            return;
          }
        } catch (err) {
          console.warn("Erro ao excluir permanentemente lofi:", err);
        }
      }

      if (window.api?.trash?.deletePermanently) {
        await window.api.trash.deletePermanently(item.id, item.item_type);
        if (item.item_type === 'page' && window.api?.imageCache?.cleanupOrphans) {
          await window.api.imageCache.cleanupOrphans().catch(() => {});
        }
        setItems(prev => prev.filter(i => i.id !== item.id));
        triggerToast(`"${item.title}" excluído permanentemente.`, 'info');
      } else {
        triggerToast("Função de exclusão permanente não disponível.", 'error');
      }
    } catch (e: any) {
      console.error(e);
      triggerToast(e.message || "Falha ao excluir item permanentemente.", 'error');
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleEmptyTrash = useCallback(async () => {
    setIsEmptying(true);
    try {
      if (window.api?.sync) {
        try {
          const rows = await window.api.sync.getTable('lofis');
          const trashed = rows?.filter((r: any) => r.deleted_at);
          if (trashed) {
            for (const lofi of trashed) {
              await hardDeleteLofiPermanently(lofi).catch(() => {});
            }
          }
        } catch (err) {}
      }

      if (window.api?.trash?.empty) {
        await window.api.trash.empty();
        if (window.api?.imageCache?.cleanupOrphans) {
          await window.api.imageCache.cleanupOrphans().catch(() => {});
        }
        setItems([]);
        setShowEmptyConfirm(false);
        triggerToast("Lixeira esvaziada com sucesso!", 'success');
      }
    } catch (e: any) {
      console.error(e);
      triggerToast(e.message || "Falha ao esvaziar lixeira.", 'error');
    } finally {
      setIsEmptying(false);
    }
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(i => {
      if (filter === 'notes') return i.item_type === 'page';
      if (filter === 'flashcards') return i.item_type === 'anki_deck' || i.item_type === 'anki_card';
      if (filter === 'files') return i.item_type === 'file';
      if (filter === 'finance') return i.item_type === 'finance';
      if (filter === 'vault') return i.item_type === 'vault';
      if (filter === 'lofi') return i.item_type === 'lofi';
      return true;
    });
  }, [items, filter]);

  return {
    items,
    loading,
    filter,
    setFilter,
    processingId,
    isEmptying,
    showEmptyConfirm,
    setShowEmptyConfirm,
    filteredItems,
    handleRestore,
    handleHardDelete,
    handleEmptyTrash,
  };
}
