import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, MoreHorizontal } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Page } from '../types';
import EmojiPopover from './EmojiPopover';

interface SidebarItemProps {
  page: Page;
  depth: number;
  activePageId: string | null;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  isSearchResult?: boolean;
}

export default function SidebarItem({
  page,
  depth,
  activePageId,
  onCreatePage,
  onUpdatePage,
  isSearchResult,
}: SidebarItemProps) {
  const { state, dispatch } = useStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExpanded = state.expandedNodes.includes(page.id);
  const children = state.pages
    .filter((p) => p.parent_id === page.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const hasChildren = children.length > 0;
  const isActive = activePageId === page.id;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!isEditing) {
      dispatch({ type: 'NAVIGATE_IN_TAB', pageId: page.id });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_NODE', nodeId: page.id });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: 'SHOW_CONTEXT_MENU', x: e.clientX, y: e.clientY, pageId: page.id });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(page.title);
  };

  const handleRenameSubmit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== page.title) {
      onUpdatePage(page.id, { title: trimmed });
    }
    setIsEditing(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setEditTitle(page.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div
        className={`group flex items-center gap-1 px-2 py-[5px] rounded-lg cursor-pointer transition-all text-[13px] ${
          isActive
            ? 'bg-brand-500/15 text-brand-300'
            : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-[18px] flex-shrink-0" />
        )}

        {/* Icon */}
        <EmojiPopover onEmojiSelect={(emoji) => onUpdatePage(page.id, { icon: emoji })}>
          <span className="flex-shrink-0 text-sm">{page.icon}</span>
        </EmojiPopover>

        {/* Title */}
        {isEditing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            className="flex-1 min-w-0 bg-white/10 border border-brand-500/50 rounded px-1.5 py-0.5 text-xs text-dark-text outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{page.title}</span>
        )}

        {/* Action buttons (visible on hover) */}
        {isHovered && !isEditing && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreatePage(page.id);
              }}
              className="p-0.5 rounded hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-colors"
              title="Nova sub-página"
            >
              <Plus size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'SHOW_CONTEXT_MENU', x: e.clientX, y: e.clientY, pageId: page.id });
              }}
              className="p-0.5 rounded hover:bg-white/10 text-dark-subtext hover:text-dark-text transition-colors"
              title="Mais opções"
            >
              <MoreHorizontal size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && !isSearchResult && hasChildren && (
        <div>
          {children.map((child) => (
            <SidebarItem
              key={child.id}
              page={child}
              depth={depth + 1}
              activePageId={activePageId}
              onCreatePage={onCreatePage}
              onUpdatePage={onUpdatePage}
              isSearchResult={isSearchResult}
            />
          ))}
        </div>
      )}
    </div>
  );
}
