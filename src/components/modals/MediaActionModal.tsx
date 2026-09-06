import { useEffect } from 'react';
import { Film, BookOpen, X, ExternalLink, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface MediaActionModalProps {
  isOpen: boolean;
  mediaId: string;
  mediaType: 'video' | 'book';
  title: string;
  onClose: () => void;
}

export default function MediaActionModal({ isOpen, mediaId, mediaType, title, onClose }: MediaActionModalProps) {
  const { state, dispatch } = useStore();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleOpenSameTab = () => {
    onClose();
    dispatch({ 
      type: 'UPDATE_TAB_MODULE', 
      tabId: state.activeTabId, 
      module: mediaType === 'video' ? 'video' : 'library',
      bookId: mediaId,
      moduleState: { videoId: mediaId }
    });
  };

  const handleOpenNewTab = () => {
    onClose();
    const newTabId = 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    dispatch({
      type: 'ADD_TAB',
      tab: {
        id: newTabId,
        module: mediaType === 'video' ? 'video' : 'library',
        pageId: null,
        bookId: mediaId,
        unsavedContent: null,
        scrollY: 0,
        moduleState: { videoId: mediaId }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" 
      contentEditable={false}
      onClick={onClose}
    >
      <div 
        className="bg-dark-card border border-white/10 rounded-xl shadow-2xl flex flex-col w-[400px] overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h3 className="text-white font-medium flex items-center gap-2">
            {mediaType === 'video' ? <Film size={18} className="text-purple-400" /> : <BookOpen size={18} className="text-blue-400" />}
            Abrir {mediaType === 'video' ? 'Vídeo' : 'Livro'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-dark-subtext hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <p className="text-dark-subtext text-sm">
            Como deseja abrir <strong>{title || (mediaType === 'video' ? 'o vídeo' : 'o livro')}</strong>?
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleOpenSameTab}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-brand-500/30 transition-all text-left"
            >
              <div className="w-8 h-8 rounded bg-brand-500/10 flex items-center justify-center shrink-0">
                <ArrowRight size={16} className="text-brand-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-white font-medium">Abrir nesta Guia</span>
                <span className="text-xs text-dark-subtext">Substitui a visualização atual</span>
              </div>
            </button>

            <button
              onClick={handleOpenNewTab}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all text-left"
            >
              <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center shrink-0">
                <ExternalLink size={16} className="text-purple-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-white font-medium">Abrir em Nova Guia</span>
                <span className="text-xs text-dark-subtext">Mantém esta anotação aberta</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
