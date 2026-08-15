import React from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronUp,
  Columns2,
  Copy,
  Download,
  Maximize2,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface ImageToolbarProps {
  align: 'left' | 'center' | 'right';
  copyState: 'idle' | 'ok' | 'fail';
  onSetAlign: (align: 'left' | 'center' | 'right') => void;
  onMove: (direction: -1 | 1) => void;
  onFitToWidth: () => void;
  onResetSize: () => void;
  onCreateColumn: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onRequestDelete: () => void;
}

export default function ImageToolbar({
  align,
  copyState,
  onSetAlign,
  onMove,
  onFitToWidth,
  onResetSize,
  onCreateColumn,
  onCopy,
  onDownload,
  onRequestDelete,
}: ImageToolbarProps) {
  return (
    <div
      contentEditable={false}
      className="absolute bottom-full right-0 z-30 mb-2 flex items-center gap-0.5 rounded-lg border border-white/10 bg-dark-bg/95 p-1 shadow-2xl backdrop-blur-xl"
      onMouseDown={(event) => event.preventDefault()}
    >
      <ToolbarButton title="Alinhar à esquerda" active={align === 'left'} onClick={() => onSetAlign('left')}>
        <AlignLeft size={14} />
      </ToolbarButton>
      <ToolbarButton title="Centralizar" active={align === 'center'} onClick={() => onSetAlign('center')}>
        <AlignCenter size={14} />
      </ToolbarButton>
      <ToolbarButton title="Alinhar à direita" active={align === 'right'} onClick={() => onSetAlign('right')}>
        <AlignRight size={14} />
      </ToolbarButton>

      <span className="mx-0.5 h-4 w-px bg-white/10" />

      <ToolbarButton title="Mover para cima (Alt+↑)" onClick={() => onMove(-1)}>
        <ChevronUp size={14} />
      </ToolbarButton>
      <ToolbarButton title="Mover para baixo (Alt+↓)" onClick={() => onMove(1)}>
        <ChevronDown size={14} />
      </ToolbarButton>

      <span className="mx-0.5 h-4 w-px bg-white/10" />

      <ToolbarButton title="Ocupar toda a largura" onClick={onFitToWidth}>
        <Maximize2 size={14} />
      </ToolbarButton>
      <ToolbarButton title="Restaurar tamanho original" onClick={onResetSize}>
        <RotateCcw size={14} />
      </ToolbarButton>

      <span className="mx-0.5 h-4 w-px bg-white/10" />

      <ToolbarButton title="Criar coluna de texto ao lado" onClick={onCreateColumn}>
        <Columns2 size={14} />
      </ToolbarButton>

      <span className="mx-0.5 h-4 w-px bg-white/10" />

      <ToolbarButton
        title={copyState === 'ok' ? 'Copiada!' : copyState === 'fail' ? 'Falha ao copiar' : 'Copiar imagem'}
        active={copyState === 'ok'}
        danger={copyState === 'fail'}
        onClick={onCopy}
      >
        <Copy size={14} />
      </ToolbarButton>
      <ToolbarButton title="Baixar" onClick={onDownload}>
        <Download size={14} />
      </ToolbarButton>
      <ToolbarButton title="Excluir" danger onClick={onRequestDelete}>
        <Trash2 size={14} />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
  active,
  danger,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`rounded p-1.5 transition-colors ${
        danger
          ? 'text-dark-subtext hover:bg-red-500/15 hover:text-red-400'
          : active
            ? 'bg-brand-500/20 text-brand-300'
            : 'text-dark-subtext hover:bg-white/10 hover:text-brand-300'
      }`}
    >
      {children}
    </button>
  );
}
