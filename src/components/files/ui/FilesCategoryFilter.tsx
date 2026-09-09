import React from 'react';
import {
  Layers,
  FileText,
  BookOpen,
  Image as ImageIcon,
  Film,
  FileCode,
  Archive,
  AlignLeft,
} from 'lucide-react';
import type { FileCategoryFilter } from '../hooks/useFilesExplorer';
import type { FileItem } from '../../../types';
import { detectFileType } from '../../../utils/file-type-detector';

interface FilesCategoryFilterProps {
  activeCategory: FileCategoryFilter;
  onSelectCategory: (cat: FileCategoryFilter) => void;
  files: FileItem[];
}

interface CategoryOption {
  id: FileCategoryFilter;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'Todos', icon: Layers },
  { id: 'pdf', label: 'PDFs', icon: FileText },
  { id: 'epub', label: 'E-books', icon: BookOpen },
  { id: 'image', label: 'Imagens', icon: ImageIcon },
  { id: 'video', label: 'Vídeos', icon: Film },
  { id: 'text', label: 'Textos', icon: AlignLeft },
  { id: 'code', label: 'Códigos', icon: FileCode },
  { id: 'archive', label: 'Compactados', icon: Archive },
];

export const FilesCategoryFilter: React.FC<FilesCategoryFilterProps> = ({
  activeCategory,
  onSelectCategory,
  files,
}) => {
  // Compute counts per category for the current file scope
  const counts = React.useMemo(() => {
    const map: Record<FileCategoryFilter, number> = {
      all: files.length,
      pdf: 0,
      epub: 0,
      image: 0,
      video: 0,
      text: 0,
      code: 0,
      archive: 0,
    };

    for (const f of files) {
      const type = f.file_type || detectFileType(f.name);
      if (type in map && type !== 'all') {
        map[type as FileCategoryFilter]++;
      }
    }
    return map;
  }, [files]);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-4 border-b border-white/[0.04] bg-zinc-950/40 scrollbar-none select-none">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const count = counts[cat.id];
        const isActive = activeCategory === cat.id;

        // Don't show specific categories with 0 items, unless it's currently active or 'all'
        if (cat.id !== 'all' && count === 0 && !isActive) {
          return null;
        }

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
              isActive
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                : 'bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 border border-white/[0.04]'
            }`}
          >
            <Icon size={12} className={isActive ? 'text-brand-400' : 'text-zinc-400'} />
            <span>{cat.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isActive
                  ? 'bg-brand-500/30 text-white font-mono'
                  : 'bg-white/[0.04] text-zinc-500 font-mono'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
