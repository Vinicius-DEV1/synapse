import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { VaultGroup, VaultItem } from '../../../types';
import { triggerToast } from '../../ui/ToastContext';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

/**
 * State management and operations hook for Password Vault.
 */
export function useVault() {
  const [groups, setGroups] = useState<VaultGroup[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [viewMode, setViewMode] = useState<'list' | 'security'>('list');
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Context menu state for groups
  const [groupContextMenu, setGroupContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  // Request counter to guard against race conditions on rapid navigation
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const api = window.api?.vault;
      if (!api) {
        console.warn('[Vault] Vault API is not available');
        return;
      }

      // Fetch groups and items concurrently
      const [g, i] = await Promise.all([
        api.getGroups(),
        api.getItems(selectedGroupId || undefined),
      ]);

      // Only update state if this is still the freshest in-flight request
      if (requestIdRef.current === currentRequestId) {
        setGroups(g || []);
        setItems(i || []);
      }
    } catch (error: unknown) {
      if (requestIdRef.current === currentRequestId) {
        const message = getErrorMessage(error, 'Erro ao carregar dados do cofre');
        console.error('[Vault] Error loading vault data:', error);
        triggerToast(message, 'error');
      }
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  }, [selectedGroupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshSelectedItem = useCallback(async (id: string): Promise<VaultItem | null> => {
    try {
      const api = window.api?.vault;
      if (!api) return null;
      const updated = await api.getItem(id);
      if (updated) {
        setSelectedItem(updated);
      }
      return updated;
    } catch (error: unknown) {
      console.error('[Vault] Error refreshing selected item:', error);
      return null;
    }
  }, []);

  // Modal state for creating/editing groups
  const [groupModal, setGroupModal] = useState<{ isOpen: boolean; group?: VaultGroup | null } | null>(null);

  const createGroup = useCallback(async (name: string, color = '#3b82f6'): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const newGroup: VaultGroup = {
        id: crypto.randomUUID(),
        name: trimmed,
        icon: 'Folder',
        color,
        position: groups.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      await window.api?.vault?.upsertGroup(newGroup);
      triggerToast('Grupo criado com sucesso!', 'success');
      await loadData();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Erro ao criar grupo');
      console.error('[Vault] Error creating group:', error);
      triggerToast(message, 'error');
    }
  }, [groups.length, loadData]);

  const handleCreateGroup = useCallback(() => {
    setGroupModal({ isOpen: true, group: null });
  }, []);

  const editGroup = useCallback(async (group: VaultGroup, newName: string, newColor?: string): Promise<void> => {
    const trimmed = newName.trim();
    const finalColor = newColor || group.color || '#3b82f6';
    if (!trimmed) return;
    if (trimmed === group.name && finalColor === group.color) return;
    try {
      await window.api?.vault?.upsertGroup({ ...group, name: trimmed, color: finalColor });
      triggerToast('Grupo atualizado com sucesso!', 'success');
      await loadData();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Erro ao editar grupo');
      console.error('[Vault] Error editing group:', error);
      triggerToast(message, 'error');
    }
  }, [loadData]);

  const handleEditGroup = useCallback((group: VaultGroup) => {
    setGroupModal({ isOpen: true, group });
  }, []);

  const handleCloseGroupModal = useCallback(() => {
    setGroupModal(null);
  }, []);

  const handleSaveGroupModal = useCallback(async (name: string, color: string) => {
    if (groupModal?.group) {
      await editGroup(groupModal.group, name, color);
    } else {
      await createGroup(name, color);
    }
  }, [groupModal, editGroup, createGroup]);

  const handleReorderItems = useCallback(async (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) return;
    const newItems = [...items];
    const [moved] = newItems.splice(sourceIndex, 1);
    if (!moved) return;
    newItems.splice(targetIndex, 0, moved);
    setItems(newItems);

    const updates = newItems.map((it, idx) => ({ id: it.id, position: idx }));
    try {
      await window.api?.vault?.reorderItems(updates);
    } catch (err: unknown) {
      console.error('[Vault] Failed to persist items reorder:', err);
      triggerToast('Erro ao salvar nova ordem dos itens', 'error');
      await loadData();
    }
  }, [items, loadData]);

  const deleteGroup = useCallback(async (groupId: string): Promise<void> => {
    try {
      await window.api?.vault?.deleteGroup(groupId);
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
      triggerToast('Grupo excluído com sucesso.', 'info');
      await loadData();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Erro ao excluir grupo');
      console.error('[Vault] Error deleting group:', error);
      triggerToast(message, 'error');
    }
  }, [selectedGroupId, loadData]);

  const handleDeleteGroup = useCallback(async (group: VaultGroup) => {
    if (window.confirm(`Tem certeza que deseja apagar o grupo "${group.name}"?\nOs itens dentro dele NÃO serão apagados, mas ficarão sem grupo.`)) {
      await deleteGroup(group.id);
    }
  }, [deleteGroup]);

  const handleSelectItem = useCallback((item: VaultItem) => {
    setViewMode('list');
    setSelectedItem(item);
    setIsEditingItem(false);
  }, []);

  const handleDeleteItem = useCallback(async (id: string) => {
    if (window.confirm('Tem certeza que deseja apagar este item?')) {
      try {
        await window.api?.vault?.deleteItem(id);
        setSelectedItem(null);
        triggerToast('Item excluído do cofre.', 'info');
        await loadData();
      } catch (error: unknown) {
        const message = getErrorMessage(error, 'Erro ao excluir item do cofre');
        console.error('[Vault] Error deleting item:', error);
        triggerToast(message, 'error');
      }
    }
  }, [loadData]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i => 
      i.label.toLowerCase().includes(q) || 
      (i.username && i.username.toLowerCase().includes(q)) ||
      (i.url && i.url.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  return {
    groups,
    items,
    selectedGroupId,
    setSelectedGroupId,
    selectedItem,
    setSelectedItem,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    isEditingItem,
    setIsEditingItem,
    isLoading,
    groupContextMenu,
    setGroupContextMenu,
    loadData,
    refreshSelectedItem,
    createGroup,
    editGroup,
    deleteGroup,
    handleCreateGroup,
    handleEditGroup,
    handleDeleteGroup,
    groupModal,
    handleCloseGroupModal,
    handleSaveGroupModal,
    handleReorderItems,
    handleSelectItem,
    handleDeleteItem,
    filteredItems,
  };
}
