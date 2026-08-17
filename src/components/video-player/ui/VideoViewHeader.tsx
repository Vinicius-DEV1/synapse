import { PlaySquare, LayoutGrid, List, AlignJustify, MonitorPlay, Plus } from 'lucide-react';

interface VideoViewHeaderProps {
  viewMode: 'grid' | 'list' | 'compact';
  onViewModeChange: (mode: 'grid' | 'list' | 'compact') => void;
  onOpenYoutubeModal: () => void;
  onOpenUploadModal: () => void;
}

export function VideoViewHeader({
  viewMode,
  onViewModeChange,
  onOpenYoutubeModal,
  onOpenUploadModal
}: VideoViewHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-dark-card/30">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-500/10 rounded-xl text-brand-400">
          <PlaySquare size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Player Video</h1>
          <p className="text-sm text-dark-subtext">Seus vídeos e estudos interativos</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-dark-card border border-white/10 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'
            }`}
            title="Visualização em Grade"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-white/10 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'
            }`}
            title="Visualização em Lista"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => onViewModeChange('compact')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'compact' ? 'bg-white/10 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'
            }`}
            title="Visualização Compacta"
          >
            <AlignJustify size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenYoutubeModal}
            className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/30 text-white text-sm font-medium rounded-lg transition-colors border border-white/10"
            title="Baixar do YouTube"
          >
            <MonitorPlay size={16} className="text-red-500" />
            <span className="hidden sm:inline">YouTube</span>
          </button>
          <button 
            onClick={onOpenUploadModal}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-brand-500/20"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Importar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
