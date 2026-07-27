import { useState, useEffect, useCallback, useMemo } from 'react';
import type { VaultGroup, VaultItem } from '../../../types';

export function useVault() {
  const [groups, setGroups] = useState<VaultGroup[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [viewMode, setViewMode] = useState<'list' | 'security'>('list');
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Drag and Drop States
  const [draggedGroup, setDraggedGroup] = useState<VaultGroup | null>(null);
  const [draggedItem, setDraggedItem] = useState<VaultItem | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  
  // Context Menu States
  const [groupContextMenu, setGroupContextMenu] = useState<{ id: string, x: number, y: number } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const g = await window.api?.vault?.getGroups() || [];
      const i = await window.api?.vault?.getItems(selectedGroupId || undefined) || [];
      setGroups(g);
      setItems(i);
    } catch (e) {
      console.error("Erro ao carregar cofre:", e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateGroup = useCallback(async () => {
    const name = prompt("Nome do Grupo:");
    if (!name) return;
    const newGroup = {
      id: crypto.randomUUID(),
      name,
      icon: 'Folder',
      color: '#3b82f6',
      position: groups.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await window.api?.vault?.upsertGroup(newGroup);
    loadData();
  }, [groups.length, loadData]);

  const handleEditGroup = useCallback(async (group: VaultGroup) => {
    const newName = prompt("Novo nome para o grupo:", group.name);
    if (!newName || newName === group.name) return;
    await window.api?.vault?.upsertGroup({ ...group, name: newName });
    loadData();
  }, [loadData]);

  const handleDeleteGroup = useCallback(async (group: VaultGroup) => {
    if (confirm(`Tem certeza que deseja apagar o grupo "${group.name}"?\nOs itens dentro dele NÃO serão apagados, mas ficarão sem grupo.`)) {
      await window.api?.vault?.deleteGroup(group.id);
      if (selectedGroupId === group.id) setSelectedGroupId(null);
      loadData();
    }
  }, [selectedGroupId, loadData]);

  const handleSelectItem = useCallback((item: VaultItem) => {
    setViewMode('list');
    setSelectedItem(item);
    setIsEditingItem(false);
  }, []);

  const handleDeleteItem = useCallback(async (id: string) => {
    if (confirm("Tem certeza que deseja apagar este item?")) {
      await window.api?.vault?.deleteItem(id);
      setSelectedItem(null);
      loadData();
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
    
    // DND
    draggedGroup, setDraggedGroup,
    draggedItem, setDraggedItem,
    dragOverGroupId, setDragOverGroupId,
    
    // Context Menu
    groupContextMenu, setGroupContextMenu,

    // Methods
    loadData,
    handleCreateGroup,
    handleEditGroup,
    handleDeleteGroup,
    handleSelectItem,
    handleDeleteItem,
    filteredItems
  };
}
