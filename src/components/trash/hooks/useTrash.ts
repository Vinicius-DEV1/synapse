import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../../../store/useStore';
import { hardDeleteLofiPermanently } from '../../../services/lofi-manager';

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
    } catch (e) {
      console.error("Erro ao carregar lixeira:", e);
      setItems([]);
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
        if (item.item_type === 'page') {
          window.dispatchEvent(new Event('app-sync-trigger'));
        }
        if (item.item_type === 'lofi') {
          window.dispatchEvent(new Event('app-sync-trigger'));
        }
      }
    } catch (e) {
      console.error(e);
      alert("Falha ao restaurar.");
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
            return;
          }
        } catch (err) {
          console.warn("Erro ao excluir permanentemente lofi:", err);
        }
      }

      if (window.api?.trash?.deletePermanently) {
        await window.api.trash.deletePermanently(item.id, item.item_type);
        setItems(prev => prev.filter(i => i.id !== item.id));
      } else {
        alert("Função ainda não implementada no backend");
      }
    } catch (e) {
      console.error(e);
      alert("Falha ao excluir.");
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
        setItems([]);
        setShowEmptyConfirm(false);
      }
    } catch (e) {
      console.error(e);
      alert("Falha ao esvaziar lixeira.");
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
