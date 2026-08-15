import React, { useEffect } from 'react';
import { Shield } from 'lucide-react';
import { VaultItemForm } from './VaultItemForm';
import { VaultSecurityDashboard } from './VaultSecurityDashboard';
import { VaultSidebar } from './VaultSidebar';
import { VaultItemList } from './VaultItemList';
import { VaultItemDetails } from './VaultItemDetails';
import { useVault } from './hooks/useVault';

export default function VaultView() {
  const {
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
    dragOverGroupId,
    groupContextMenu,
    setGroupContextMenu,
    loadData,
    handleCreateGroup,
    handleEditGroup,
    handleDeleteGroup,
    handleSelectItem,
    handleDeleteItem,
    filteredItems,
  } = useVault();

  // Fechar context menu se clicar fora
  useEffect(() => {
    const handleClick = () => setGroupContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [setGroupContextMenu]);

  return (
    <div className="flex h-full bg-dark-bg text-dark-text font-sans" onClick={() => setGroupContextMenu(null)}>
      {/* PAINEL 1: Grupos (Esquerda) */}
      <VaultSidebar
        groups={groups}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        viewMode={viewMode}
        setViewMode={setViewMode}
        dragOverGroupId={dragOverGroupId}
        groupContextMenu={groupContextMenu}
        setGroupContextMenu={setGroupContextMenu}
        handleCreateGroup={handleCreateGroup}
        handleEditGroup={handleEditGroup}
        handleDeleteGroup={handleDeleteGroup}
      />

      {viewMode === 'security' ? (
        <VaultSecurityDashboard items={items} onEditItem={handleSelectItem} />
      ) : (
        <>
          {/* PAINEL 2: Lista de Itens (Meio) */}
          <VaultItemList
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredItems={filteredItems}
            selectedItem={selectedItem}
            isLoading={isLoading}
            handleSelectItem={handleSelectItem}
            onNewItem={() => {
              setSelectedItem(null);
              setIsEditingItem(true);
            }}
          />

          {/* PAINEL 3: Detalhes do Item (Direita) */}
          <div className="flex-1 flex flex-col bg-dark-bg overflow-y-auto relative">
            {!selectedItem && !isEditingItem ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-dark-subtext">
                <Shield size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">Cofre de Senhas</p>
                <p className="text-sm opacity-60">Selecione um item ou crie um novo</p>
              </div>
            ) : isEditingItem ? (
              <VaultItemForm
                item={selectedItem}
                groups={groups}
                groupId={selectedGroupId}
                onSave={async () => {
                  setIsEditingItem(false);
                  await loadData();
                  if (selectedItem?.id) {
                    const updated = await window.api?.vault?.getItem(selectedItem.id);
                    setSelectedItem(updated || null);
                  }
                }}
                onCancel={() => {
                  setIsEditingItem(false);
                }}
              />
            ) : selectedItem ? (
              <VaultItemDetails
                item={selectedItem}
                onEdit={() => setIsEditingItem(true)}
                onDelete={() => handleDeleteItem(selectedItem.id)}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
