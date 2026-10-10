import { useEffect } from 'react';
import { Shield } from 'lucide-react';
import { VaultItemForm } from './VaultItemForm';
import { VaultSecurityDashboard } from './VaultSecurityDashboard';
import { VaultSidebar } from './VaultSidebar';
import { VaultItemList } from './VaultItemList';
import { VaultItemDetails } from './VaultItemDetails';
import { VaultGroupModal } from './ui/VaultGroupModal';
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
    groupContextMenu,
    setGroupContextMenu,
    loadData,
    refreshSelectedItem,
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
  } = useVault();

  useEffect(() => {
    const handleClick = () => setGroupContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [setGroupContextMenu]);

  useEffect(() => {
    const handleBack = (e: Event) => {
      if (selectedItem || isEditingItem) {
        e.preventDefault();
        setSelectedItem(null);
        setIsEditingItem(false);
      }
    };
    window.addEventListener('caderno-back-press', handleBack);
    return () => window.removeEventListener('caderno-back-press', handleBack);
  }, [selectedItem, isEditingItem, setSelectedItem, setIsEditingItem]);

  return (
    <div className="flex h-full bg-dark-bg text-dark-text font-sans overflow-hidden" onClick={() => setGroupContextMenu(null)}>
      {/* PAINEL 1: Grupos (Esquerda) */}
      <VaultSidebar
        groups={groups}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        viewMode={viewMode}
        setViewMode={setViewMode}
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
            onReorderItems={handleReorderItems}
            onNewItem={() => {
              setSelectedItem(null);
              setIsEditingItem(true);
            }}
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
            className={selectedItem || isEditingItem ? 'hidden md:flex' : 'flex'}
          />

          {/* PAINEL 3: Detalhes do Item (Direita) */}
          <div className={`flex-1 flex flex-col bg-dark-bg overflow-y-auto relative ${
            !selectedItem && !isEditingItem ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Mobile Back Button to list */}
            {(selectedItem || isEditingItem) && (
              <div className="flex md:hidden items-center justify-between p-3 border-b border-white/5 shrink-0 bg-dark-card/40">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setIsEditingItem(false);
                  }}
                  className="text-xs text-brand-400 font-medium hover:underline flex items-center gap-1 active:scale-95"
                >
                  ← Voltar para lista
                </button>
                <span className="text-xs text-dark-subtext font-medium truncate max-w-[200px]">
                  {selectedItem?.label || (isEditingItem ? 'Novo Item' : '')}
                </span>
              </div>
            )}
            {!selectedItem && !isEditingItem ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-dark-subtext">
                <Shield size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">Cofre de Senhas</p>
                <p className="text-sm opacity-60">Selecione um item ou crie um novo</p>
              </div>
            ) : isEditingItem ? (
              <VaultItemForm
                key={selectedItem?.id || 'new'}
                item={selectedItem}
                groups={groups}
                groupId={selectedGroupId}
                onSave={async () => {
                  setIsEditingItem(false);
                  await loadData();
                  if (selectedItem?.id) {
                    await refreshSelectedItem(selectedItem.id);
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

      {/* Modal para criar/editar grupos com cores personalizadas */}
      {groupModal && (
        <VaultGroupModal
          isOpen={groupModal.isOpen}
          group={groupModal.group}
          onClose={handleCloseGroupModal}
          onSave={handleSaveGroupModal}
        />
      )}
    </div>
  );
}
