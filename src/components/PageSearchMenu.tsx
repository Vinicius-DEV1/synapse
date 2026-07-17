import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';

interface PageSearchMenuProps {
  x: number;
  y: number;
  query: string;
  onSelect: (pageId: string | 'new', pageTitle: string) => void;
  onClose: () => void;
}

export default function PageSearchMenu({ x, y, query, onSelect, onClose }: PageSearchMenuProps) {
  const { state } = useStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredPages = state.pages.filter(p => 
    p.title.toLowerCase().includes(query.toLowerCase())
  );

  const options = [
    ...filteredPages.map(p => ({ id: p.id, title: p.title || 'Sem título', icon: p.icon || '📄' })),
    { id: 'new', title: `Criar página "${query || 'Nova'}"`, icon: '✨' }
  ];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + options.length) % options.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (options[selectedIndex]) {
          onSelect(options[selectedIndex].id, options[selectedIndex].id === 'new' ? query : options[selectedIndex].title);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [options, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
  const MENU_MAX_HEIGHT = 320;
  const CURSOR_OFFSET = 24;
  
  const willOverflowBottom = y + MENU_MAX_HEIGHT > viewportHeight;
  
  const positionStyle: React.CSSProperties = {
    left: x,
    maxHeight: MENU_MAX_HEIGHT
  };

  if (willOverflowBottom) {
    positionStyle.bottom = viewportHeight - (y - CURSOR_OFFSET);
  } else {
    positionStyle.top = y;
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 bg-dark-bg border border-white/10 rounded-lg shadow-xl overflow-hidden animate-fade-in flex flex-col"
      style={positionStyle}
    >
      <div className="px-3 py-2 text-xs font-semibold text-dark-subtext uppercase tracking-wider bg-dark-card/50 border-b border-white/5">
        Referenciar Página
      </div>
      <div className="overflow-y-auto custom-scrollbar p-1">
        {options.map((opt, index) => {
          const isSelected = index === selectedIndex;
          
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id, opt.id === 'new' ? query : opt.title)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-dark-text text-sm">
                {opt.icon}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium text-dark-text truncate">{opt.title}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
