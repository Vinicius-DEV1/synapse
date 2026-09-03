import React from 'react';
import { Type, FileText, Copy, Palette, Trash2 } from 'lucide-react';
import ColorPalettePicker from './ColorPalettePicker';

interface BlockquoteToggleToolbarProps {
  currentColor: string;
  copied: boolean;
  showColors: boolean;
  showConfirm: boolean;
  colorMenuRef: React.RefObject<HTMLDivElement | null>;
  confirmRef: React.RefObject<HTMLDivElement | null>;
  onConvertToCallout: () => void;
  onConvertToPage?: () => void;
  onCopy: () => void;
  onToggleColors: () => void;
  onSelectColor: (color: string) => void;
  onClearColor: () => void;
  onToggleConfirm: () => void;
  onDeleteNode: () => void;
  onCancelDelete: () => void;
}

export default function BlockquoteToggleToolbar({
  currentColor,
  copied,
  showColors,
  showConfirm,
  colorMenuRef,
  confirmRef,
  onConvertToCallout,
  onConvertToPage,
  onCopy,
  onToggleColors,
  onSelectColor,
  onClearColor,
  onToggleConfirm,
  onDeleteNode,
  onCancelDelete,
}: BlockquoteToggleToolbarProps) {
  return (
    <div
      className="absolute top-1 right-1 opacity-0 [.toggle-wrapper:hover:not(:has(.toggle-wrapper:hover))_>_&]:opacity-100 transition-opacity z-50"
      contentEditable={false}
    >
      <div className="flex items-center gap-0.5 bg-dark-bg/80 backdrop-blur-sm border border-white/5 rounded-lg p-0.5 shadow-sm">
        <button
          onClick={onConvertToCallout}
          className="p-1 rounded-md transition-all text-dark-subtext hover:bg-white/10 hover:text-white"
          title="Converter em Callout"
        >
          <Type size={14} />
        </button>

        {onConvertToPage && (
          <button
            onClick={onConvertToPage}
            className="p-1 rounded-md transition-all text-dark-subtext hover:bg-white/10 hover:text-white"
            title="Converter em Página"
          >
            <FileText size={14} />
          </button>
        )}

        <div className="relative">
          <button
            onClick={onCopy}
            className={`p-1 rounded-md transition-all ${
              copied ? 'text-green-400' : 'text-dark-subtext hover:bg-white/10 hover:text-white'
            }`}
            title="Copiar toggle callout"
          >
            <Copy size={14} />
          </button>
          {copied && (
            <div className="absolute bottom-full right-0 mb-1.5 px-2 py-0.5 bg-dark-bg border border-white/10 rounded-md text-[11px] text-white/70 whitespace-nowrap pointer-events-none shadow-lg">
              Copiado!
            </div>
          )}
        </div>

        <div className="relative" ref={colorMenuRef}>
          <button
            onClick={onToggleColors}
            className="p-1 rounded-md transition-all text-dark-subtext hover:bg-white/10 hover:text-white"
            title="Mudar cor do destaque"
          >
            <Palette size={14} />
          </button>
          {showColors && (
            <ColorPalettePicker
              anchorRef={colorMenuRef}
              currentColor={currentColor}
              onSelectColor={onSelectColor}
              onClearColor={onClearColor}
              onClose={onToggleColors}
            />
          )}
        </div>

        <div className="relative" ref={confirmRef}>
          <button
            onClick={onToggleConfirm}
            className="p-1 rounded-md transition-all text-dark-subtext hover:bg-red-500/20 hover:text-red-400"
            title="Excluir destaque"
          >
            <Trash2 size={14} />
          </button>
          {showConfirm && (
            <div className="absolute top-full right-0 mt-1 bg-dark-bg border border-white/10 rounded-lg p-2 shadow-xl z-50 flex flex-col gap-2 min-w-[140px]">
              <span className="text-xs text-white">Excluir destaque?</span>
              <div className="flex gap-1 justify-end">
                <button
                  onClick={onCancelDelete}
                  className="px-2 py-1 text-xs text-dark-subtext hover:text-white rounded hover:bg-white/5"
                >
                  Não
                </button>
                <button
                  onClick={onDeleteNode}
                  className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded"
                >
                  Sim
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
