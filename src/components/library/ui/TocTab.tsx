import React from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';

export interface TocItem {
  title: string;
  pageNumber: number;
  level: number;
  children?: TocItem[];
}

interface TocTabProps {
  tocItems: TocItem[];
  currentChapterPage: number;
  expandedItems: Set<string>;
  onToggleExpand: (key: string) => void;
  onNavigate: (page: number) => void;
}

export function TocTab({
  tocItems,
  currentChapterPage,
  expandedItems,
  onToggleExpand,
  onNavigate,
}: TocTabProps) {
  if (tocItems.length === 0) {
    return (
      <div className="text-center py-8 px-3">
        <BookOpen size={28} className="text-dark-subtext/30 mx-auto mb-2" />
        <p className="text-xs text-dark-subtext/60">
          Este PDF não possui sumário embutido
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <TocItemList
        items={tocItems}
        currentChapterPage={currentChapterPage}
        expandedItems={expandedItems}
        onToggleExpand={onToggleExpand}
        onNavigate={onNavigate}
        depth={0}
      />
    </div>
  );
}

function TocItemList({
  items,
  currentChapterPage,
  expandedItems,
  onToggleExpand,
  onNavigate,
  depth,
}: {
  items: TocItem[];
  currentChapterPage: number;
  expandedItems: Set<string>;
  onToggleExpand: (key: string) => void;
  onNavigate: (page: number) => void;
  depth: number;
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item, idx) => {
        const key = `${depth}-${idx}-${item.pageNumber}`;
        const isCurrent = item.pageNumber === currentChapterPage;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.has(key);

        return (
          <div key={key}>
            <div
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${
                isCurrent
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'hover:bg-white/[0.04] text-dark-text/80'
              }`}
              style={{ paddingLeft: `${8 + depth * 16}px` }}
              onClick={() => onNavigate(item.pageNumber)}
            >
              {hasChildren && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleExpand(key); }}
                  className="p-0.5 rounded hover:bg-white/10 transition-all"
                >
                  <ChevronRight
                    size={12}
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
              )}
              {!hasChildren && <div className="w-4" />}

              <span className="flex-1 text-xs truncate">{item.title}</span>
              <span className="text-[10px] text-dark-subtext/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.pageNumber}
              </span>
            </div>

            {hasChildren && isExpanded && (
              <TocItemList
                items={item.children!}
                currentChapterPage={currentChapterPage}
                expandedItems={expandedItems}
                onToggleExpand={onToggleExpand}
                onNavigate={onNavigate}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function flattenTocPages(items: TocItem[]): number[] {
  const pages: number[] = [];
  for (const item of items) {
    pages.push(item.pageNumber);
    if (item.children) {
      pages.push(...flattenTocPages(item.children));
    }
  }
  return pages.sort((a, b) => a - b);
}
