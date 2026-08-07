import { Plus } from 'lucide-react';
import type { Page } from '../types';

interface SubPageGridProps {
  pages: Page[];
  onNavigate: (pageId: string) => void;
  onCreatePage: () => void;
}

export default function SubPageGrid({ pages, onNavigate, onCreatePage }: SubPageGridProps) {
  return (
    <div className="mb-6">
      <div className="text-xs font-medium text-dark-subtext mb-2 uppercase tracking-wider">
        Sub-páginas
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => onNavigate(page.id)}
            className="flex items-center gap-2 p-3 rounded-xl bg-dark-card/50 hover:bg-white/5 border border-white/5 hover:border-brand-500/30 transition-all text-left group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">{page.icon}</span>
            <span className="truncate text-sm text-dark-text font-medium">{page.title}</span>
          </button>
        ))}
        <button
          onClick={onCreatePage}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/10 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-dark-subtext hover:text-brand-400 group"
        >
          <Plus size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Nova Sub-página</span>
        </button>
      </div>
    </div>
  );
}
