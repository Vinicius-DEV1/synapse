import React from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import type { Page } from '../../../types';
import { isValidHierarchyMove } from '../../../utils/hierarchy';

export interface TreeNode {
  page: Page;
  children: TreeNode[];
  level: number;
}

interface MovePageTreeNodeProps {
  node: TreeNode;
  allPages: Page[];
  sourcePageId: string;
  effectiveSelectedId: string | null;
  currentParentId: string | null;
  expandedNodes: Set<string>;
  onToggleExpand: (pageId: string, e: React.MouseEvent) => void;
  onSelect: (pageId: string) => void;
  onSubmit: () => void;
}

export function MovePageTreeNode({
  node,
  allPages,
  sourcePageId,
  effectiveSelectedId,
  currentParentId,
  expandedNodes,
  onToggleExpand,
  onSelect,
  onSubmit,
}: MovePageTreeNodeProps) {
  const { page, children, level } = node;
  const isExpanded = expandedNodes.has(page.id);
  const hasChildren = children.length > 0;
  const isSelected = effectiveSelectedId === page.id;
  const isCurrentParent = currentParentId === page.id;
  const isSelfOrDescendant = !isValidHierarchyMove(allPages, sourcePageId, page.id);

  return (
    <div className="flex flex-col select-none">
      <div
        onClick={() => !isSelfOrDescendant && onSelect(page.id)}
        onDoubleClick={() => !isSelfOrDescendant && !isCurrentParent && onSubmit()}
        style={{ paddingLeft: `${Math.max(level * 16 + 8, 8)}px` }}
        className={`flex items-center justify-between py-2 pr-3 rounded-lg text-sm transition-colors group cursor-pointer ${
          isSelfOrDescendant
            ? 'opacity-35 cursor-not-allowed bg-transparent'
            : isSelected
            ? 'bg-brand-500/20 text-brand-300 font-medium border border-brand-500/30'
            : 'text-dark-text hover:bg-white/5 border border-transparent'
        }`}
        title={isSelfOrDescendant ? 'Não é possível mover para si mesma ou subpáginas' : undefined}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => onToggleExpand(page.id, e)}
              className="p-1 -ml-1 text-dark-subtext hover:text-white rounded transition-colors"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <span className="text-base shrink-0">{page.icon || (hasChildren ? '📁' : '📄')}</span>
          <span className="truncate font-medium">{page.title || 'Sem Título'}</span>

          {isCurrentParent && (
            <span className="text-[10px] bg-white/10 text-dark-subtext px-1.5 py-0.5 rounded font-normal shrink-0">
              Local Atual
            </span>
          )}
          {page.id === sourcePageId && (
            <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded font-normal shrink-0">
              Página Alvo
            </span>
          )}
        </div>

        {isSelected && <Check size={16} className="text-brand-400 shrink-0 ml-2" />}
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {children.map((child) => (
            <MovePageTreeNode
              key={child.page.id}
              node={child}
              allPages={allPages}
              sourcePageId={sourcePageId}
              effectiveSelectedId={effectiveSelectedId}
              currentParentId={currentParentId}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onSubmit={onSubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
