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
    <div className="w-full h-full bg-dark-bg text-dark-text overflow-y-auto custom-scrollbar relative">
      <div className="max-w-6xl mx-auto flex flex-col min-h-full">
        
        {/* Header (Scrolls away) */}
        <div className="px-5 md:px-8 pt-8 pb-6 shrink-0">
          <TrashHeader
            totalItems={items.length}
            onOpenEmptyConfirm={() => setShowEmptyConfirm(true)}
          />
        </div>

        {/* Empty Trash Confirmation */}
        <TrashEmptyConfirmModal
          isOpen={showEmptyConfirm}
          totalItems={items.length}
          isEmptying={isEmptying}
          onClose={() => setShowEmptyConfirm(false)}
          onConfirm={handleEmptyTrash}
        />

        {/* Sticky Filter Tabs */}
        <div className="sticky top-0 z-20 px-5 md:px-8 py-3 bg-dark-bg/95 backdrop-blur-md border-b border-white/5">
          <TrashFilterTabs
            currentFilter={filter}
            onSelectFilter={setFilter}
          />
        </div>

        {/* Trashed Items Table Content */}
        <div className="flex-1 px-5 md:px-8 pb-8 mt-4">
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
    </div>
  );
}
