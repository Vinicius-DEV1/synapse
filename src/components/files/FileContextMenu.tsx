import { useEffect, useRef } from 'react';
import type { FileItem } from '../../types';
import { Eye, Info, Trash2, ArrowRightCircle, Download } from 'lucide-react';

interface FileContextMenuProps {
  x: number;
  y: number;
  item: FileItem;
  onClose: () => void;
  onView: (item: FileItem) => void;
  onInfo: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onGoToOrigin?: (item: FileItem) => void;
  onDownload: (item: FileItem) => void;
}

export default function FileContextMenu({ x, y, item, onClose, onView, onInfo, onDelete, onRename, onMove, onGoToOrigin, onDownload }: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Slight delay to avoid triggering on the right-click itself
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 10);
    
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  // Prevent menu from going off-screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 250);

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 w-48 bg-dark-card border border-white/10 rounded-xl shadow-2xl py-2 flex flex-col"
      style={{ left: adjustedX, top: adjustedY }}
      onContextMenu={e => e.preventDefault()}
    >
      <div className="px-3 py-1 mb-1 border-b border-white/5">
        <p className="text-xs font-medium text-dark-subtext truncate" title={item.name}>{item.name}</p>
      </div>
      
      <button 
        onClick={() => { onView(item); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
      >
        <Eye size={16} className="text-brand-400" />
        <span>Visualizar</span>
      </button>

      <button 
        onClick={() => { onDownload(item); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
      >
        <Download size={16} className="text-emerald-400" />
        <span>Baixar Descriptografado</span>
      </button>

      <button 
        onClick={() => { onRename(item); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
        <span>Renomear</span>
      </button>

      <button 
        onClick={() => { onMove(item); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M2 12h20"></path><path d="m15 5 7 7-7 7"></path></svg>
        <span>Mover para...</span>
      </button>

      {onGoToOrigin && (
        <button 
          onClick={() => { onGoToOrigin(item); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
        >
          <ArrowRightCircle size={16} className="text-blue-400" />
          <span>Ir até Widget</span>
        </button>
      )}

      <button 
        onClick={() => { onInfo(item); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
      >
        <Info size={16} className="text-yellow-400" />
        <span>Informações</span>
      </button>

      <div className="h-px bg-white/10 my-1 mx-2" />

      <button 
        onClick={() => { onDelete(item); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
      >
        <Trash2 size={16} />
        <span>Excluir Arquivo</span>
      </button>
    </div>
  );
}
