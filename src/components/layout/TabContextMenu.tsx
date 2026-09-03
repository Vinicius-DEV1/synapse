import { useEffect, useRef } from 'react';
import { Pin, PinOff, X, Copy, Plus, ArrowRight } from 'lucide-react';
import type { Tab } from '../../types';

interface TabContextMenuProps {
  x: number;
  y: number;
  tab: Tab;
  tabCount: number;
  hasTabsToRight: boolean;
  onTogglePin: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseTabsToRight: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onNewTab: () => void;
  onClose: () => void;
}

export default function TabContextMenu({
  x,
  y,
  tab,
  tabCount,
  hasTabsToRight,
  onTogglePin,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onDuplicateTab,
  onNewTab,
  onClose,
}: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Adjust coordinates so the menu stays fully inside viewport boundaries
  const adjustedX = Math.max(8, Math.min(x, window.innerWidth - 210));
  const adjustedY = Math.max(8, Math.min(y, window.innerHeight - 250));

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-52 bg-dark-card border border-white/10 rounded-xl shadow-2xl py-1 text-xs select-none animate-scale-in"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Fixar / Desfixar aba */}
      <button
        onClick={() => {
          onTogglePin(tab.id);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-dark-text hover:bg-white/5 hover:text-white transition-colors"
      >
        {tab.isPinned ? (
          <>
            <PinOff size={14} className="text-brand-400" />
            <span>Desfixar aba</span>
          </>
        ) : (
          <>
            <Pin size={14} className="text-brand-400" />
            <span>Fixar aba</span>
          </>
        )}
      </button>

      <div className="h-px bg-white/5 my-1 mx-2" />

      {/* Nova aba */}
      <button
        onClick={() => {
          onNewTab();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-dark-text hover:bg-white/5 hover:text-white transition-colors"
      >
        <Plus size={14} className="text-dark-subtext" />
        <span>Nova aba</span>
      </button>

      {/* Duplicar aba */}
      <button
        onClick={() => {
          onDuplicateTab(tab.id);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-dark-text hover:bg-white/5 hover:text-white transition-colors"
      >
        <Copy size={14} className="text-dark-subtext" />
        <span>Duplicar aba</span>
      </button>

      <div className="h-px bg-white/5 my-1 mx-2" />

      {/* Fechar aba */}
      <button
        onClick={() => {
          onCloseTab(tab.id);
          onClose();
        }}
        disabled={tabCount <= 1}
        className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors ${
          tabCount <= 1
            ? 'opacity-40 cursor-not-allowed text-dark-subtext'
            : 'text-dark-text hover:bg-white/5 hover:text-white'
        }`}
      >
        <X size={14} className="text-dark-subtext" />
        <span>Fechar aba</span>
      </button>

      {/* Fechar outras abas */}
      {tabCount > 1 && (
        <button
          onClick={() => {
            onCloseOtherTabs(tab.id);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-dark-text hover:bg-white/5 hover:text-white transition-colors"
        >
          <X size={14} className="text-dark-subtext" />
          <span>Fechar outras abas</span>
        </button>
      )}

      {/* Fechar abas à direita */}
      {hasTabsToRight && (
        <button
          onClick={() => {
            onCloseTabsToRight(tab.id);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-dark-text hover:bg-white/5 hover:text-white transition-colors"
        >
          <ArrowRight size={14} className="text-dark-subtext" />
          <span>Fechar abas à direita</span>
        </button>
      )}
    </div>
  );
}
