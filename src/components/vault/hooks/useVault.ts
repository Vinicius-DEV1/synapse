import { useState, useEffect, useCallback, useMemo } from 'react';
import type { VaultGroup, VaultItem } from '../../../types';
import { triggerToast } from '../../ui/ToastContext';

/**
 * Hook de gerenciamento de estado e operações do Cofre de Senhas.
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

  // Estados de menu de contexto
  const [groupContextMenu, setGroupContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const g = (await window.api?.vault?.getGroups()) || [];
      const i = (await window.api?.vault?.getItems(selectedGroupId || undefined)) || [];
      setGroups(g);
      setItems(i);
    } catch (e: any) {
      console.error('Erro ao carregar dados do cofre:', e);
      triggerToast(e.message || 'Erro ao carregar dados do cofre', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateGroup = useCallback(async () => {
    const name = prompt('Nome do Grupo:');
    if (!name || !name.trim()) return;
    try {
      const newGroup = {
        id: crypto.randomUUID(),
        name: name.trim(),
        icon: 'Folder',
        color: '#3b82f6',
        position: groups.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      await window.api?.vault?.upsertGroup(newGroup);
      triggerToast('Grupo criado com sucesso!', 'success');
      loadData();
    } catch (e: any) {
      console.error('Erro ao criar grupo:', e);
      triggerToast(e.message || 'Erro ao criar grupo', 'error');
    }
  }, [groups.length, loadData]);

  const handleEditGroup = useCallback(async (group: VaultGroup) => {
    const newName = prompt('Novo nome para o grupo:', group.name);
    if (!newName || newName.trim() === group.name) return;
    try {
      await window.api?.vault?.upsertGroup({ ...group, name: newName.trim() });
      triggerToast('Grupo renomeado com sucesso!', 'success');
      loadData();
    } catch (e: any) {
      console.error('Erro ao editar grupo:', e);
      triggerToast(e.message || 'Erro ao editar grupo', 'error');
    }
  }, [loadData]);

  const handleDeleteGroup = useCallback(async (group: VaultGroup) => {
    if (confirm(`Tem certeza que deseja apagar o grupo "${group.name}"?\nOs itens dentro dele NÃO serão apagados, mas ficarão sem grupo.`)) {
      try {
        await window.api?.vault?.deleteGroup(group.id);
        if (selectedGroupId === group.id) setSelectedGroupId(null);
        triggerToast('Grupo excluído com sucesso.', 'info');
        loadData();
      } catch (e: any) {
        console.error('Erro ao excluir grupo:', e);
        triggerToast(e.message || 'Erro ao excluir grupo', 'error');
      }
    }
  }, [selectedGroupId, loadData]);

  const handleSelectItem = useCallback((item: VaultItem) => {
    setViewMode('list');
    setSelectedItem(item);
    setIsEditingItem(false);
  }, []);

  const handleDeleteItem = useCallback(async (id: string) => {
    if (confirm('Tem certeza que deseja apagar este item?')) {
      try {
        await window.api?.vault?.deleteItem(id);
        setSelectedItem(null);
        triggerToast('Item excluído do cofre.', 'info');
        loadData();
      } catch (e: any) {
        console.error('Erro ao excluir item:', e);
        triggerToast(e.message || 'Erro ao excluir item do cofre', 'error');
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
    handleCreateGroup,
    handleEditGroup,
    handleDeleteGroup,
    handleSelectItem,
    handleDeleteItem,
    filteredItems,
  };
}
