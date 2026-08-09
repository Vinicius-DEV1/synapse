import { Plus, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Page } from '../types';
import { useStore } from '../store/useStore';

interface SubPageGridProps {
  pages: Page[];
  onNavigate: (pageId: string) => void;
  onCreatePage: () => void;
}

function SubPageItem({ page, onNavigate }: { page: Page; onNavigate: (pageId: string) => void }) {
  const { state } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const childPages = state.pages
    .filter((p: Page) => p.parent_id === page.id)
    .sort((a: Page, b: Page) => a.sort_order - b.sort_order);

  const hasChildren = childPages.length > 0;

  return (
    <div 
      className="flex flex-col gap-2 w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => onNavigate(page.id)}
        className="flex items-center gap-2 p-3 w-full rounded-xl bg-dark-card/50 hover:bg-white/5 border border-white/5 hover:border-brand-500/30 transition-all text-left group"
      >
        <span className="text-xl group-hover:scale-110 transition-transform shrink-0">{page.icon}</span>
        <span className="truncate text-sm text-dark-text font-medium flex-1">{page.title}</span>
        
        {hasChildren && (
          <div 
            className={`p-1 rounded transition-all ${isHovered || expanded ? 'opacity-100 hover:bg-white/10' : 'opacity-0'}`}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            title={expanded ? "Recolher subpáginas" : "Expandir subpáginas"}
          >
            <ChevronDown size={16} className={`transition-transform text-dark-subtext group-hover:text-white ${expanded ? 'rotate-0' : '-rotate-90'}`} />
          </div>
        )}
      </button>
      
      {expanded && hasChildren && (
        <div className="ml-4 pl-3 border-l border-white/10 flex flex-col gap-2 animate-fade-in">
          {childPages.map(child => (
            <SubPageItem key={child.id} page={child} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubPageGrid({ pages, onNavigate, onCreatePage }: SubPageGridProps) {
  return (
    <div className="mb-6">
      <div className="text-xs font-medium text-dark-subtext mb-2 uppercase tracking-wider">
        Sub-páginas
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-start">
        {pages.map((page) => (
          <SubPageItem key={page.id} page={page} onNavigate={onNavigate} />
        ))}
        <button
          onClick={onCreatePage}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/10 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-dark-subtext hover:text-brand-400 group h-[50px]"
        >
          <Plus size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Nova Sub-página</span>
        </button>
      </div>
    </div>
  );
}
