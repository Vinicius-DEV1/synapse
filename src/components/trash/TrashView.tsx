import React from 'react';
import { useTrash } from './hooks/useTrash';
import { TrashHeader } from './ui/TrashHeader';
import { TrashEmptyConfirmModal } from './ui/TrashEmptyConfirmModal';
import { TrashFilterTabs } from './ui/TrashFilterTabs';
import { TrashTable } from './ui/TrashTable';

export default function TrashView() {
  const {
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
  } = useTrash();

  return (
    <div className="flex-1 flex flex-col bg-dark-bg text-dark-text p-8 overflow-y-auto relative" style={{ height: '100dvh' }}>
      <div className="max-w-6xl mx-auto w-full space-y-8 flex flex-col h-full">
        
        {/* Header */}
        <TrashHeader
          totalItems={items.length}
          onOpenEmptyConfirm={() => setShowEmptyConfirm(true)}
        />

        {/* Empty Trash Confirmation */}
        <TrashEmptyConfirmModal
          isOpen={showEmptyConfirm}
          totalItems={items.length}
          isEmptying={isEmptying}
          onClose={() => setShowEmptyConfirm(false)}
          onConfirm={handleEmptyTrash}
        />

        {/* Filter Tabs */}
        <TrashFilterTabs
          currentFilter={filter}
          onSelectFilter={setFilter}
        />

        {/* Trashed Items Table */}
        <TrashTable
          loading={loading}
          items={filteredItems}
          processingId={processingId}
          isEmptying={isEmptying}
          onRestore={handleRestore}
          onHardDelete={handleHardDelete}
        />
        
      </div>
    </div>
  );
}
