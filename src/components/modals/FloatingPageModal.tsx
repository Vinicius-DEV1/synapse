import React, { useEffect, useRef } from 'react';
import { Maximize2, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import PageView from './page-view/PageView';
import { Portal } from '../ui/Portal';

interface FloatingPageModalProps {
  pageId: string;
  onClose: () => void;
  onExpand: (pageId: string) => void;
  onUpdateContent: any;
  onCreatePage: any;
  onCreateLinkedPage: any;
  onUpdatePage: any;
}

export default function FloatingPageModal({
  pageId,
  onClose,
  onExpand,
  onUpdateContent,
  onCreatePage,
  onCreateLinkedPage,
  onUpdatePage
}: FloatingPageModalProps) {
  const { state } = useStore();
  const modalRef = useRef<HTMLDivElement>(null);

  const page = state.pages.find(p => p.id === pageId) || null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!page) return null;

  return (
    <Portal>
      <div 
      className="fixed inset-0 z-[99999] bg-dark-bg/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="w-full max-w-4xl h-[85vh] bg-dark-bg border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden relative"
      >
        {/* Header toolbar */}
        <div className="absolute top-4 right-6 flex items-center gap-2 z-50">
          <button
            onClick={() => onExpand(pageId)}
            className="p-2 rounded-lg bg-dark-card/80 border border-white/5 hover:bg-white/10 text-dark-subtext hover:text-white transition-colors backdrop-blur-md"
            title="Expandir 100%"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-dark-card/80 border border-white/5 hover:bg-red-500/20 text-dark-subtext hover:text-red-400 transition-colors backdrop-blur-md"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative pt-4">
          <PageView
            page={page}
            onUpdateContent={onUpdateContent}
            onCreatePage={onCreatePage}
            onCreateLinkedPage={onCreateLinkedPage}
            onUpdatePage={onUpdatePage}
          />
        </div>
      </div>
    </div>
    </Portal>
  );
}
