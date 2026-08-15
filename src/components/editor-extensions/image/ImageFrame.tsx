/**
 * ImageFrame.tsx
 *
 * Chrome compartilhado dos node views de imagem (ResizableImage e
 * EncryptedImage): alça de arrasto, barra de ações, alças de redimensionamento,
 * legenda e alinhamento.
 *
 * Antes esse código estava duplicado nos dois arquivos e já tinha divergido —
 * qualquer correção precisava ser feita duas vezes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  GripVertical,
  Maximize2,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { useImageResize } from './useImageResize';
import type { ImageSize, ResizeHandle } from './useImageResize';
import {
  alignToClass,
  copyImageToClipboard,
  downloadImage,
  moveBlockNode,
  normalizeAlign,
  safePos,
} from './imageUtils';

interface ImageFrameProps {
  editor: Editor;
  node: PMNode;
  getPos: unknown;
  updateAttributes: (attrs: Record<string, unknown>) => void;
  selected: boolean;
  /** URL renderizável (src direto, ou blob URL descriptografada). */
  src: string;
  alt?: string;
  title?: string;
  /** Nome base sugerido no download (sem extensão). */
  downloadName: string;
  onOpenViewer: () => void;
  onRequestDelete: () => void;
}

const HANDLES: Array<{ handle: ResizeHandle; className: string; cursor: string }> = [
  { handle: 'nw', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
  { handle: 'ne', className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
  { handle: 'sw', className: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
  { handle: 'se', className: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
];

const EDGE_HANDLES: Array<{ handle: ResizeHandle; className: string; cursor: string }> = [
  { handle: 'w', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-8', cursor: 'ew-resize' },
  { handle: 'e', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-1.5 h-8', cursor: 'ew-resize' },
];

export default function ImageFrame({
  editor,
  node,
  getPos,
  updateAttributes,
  selected,
  src,
  alt,
  title,
  downloadName,
  onOpenViewer,
  onRequestDelete,
}: ImageFrameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [hovered, setHovered] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle');

  const align = normalizeAlign(node.attrs.align);
  const width: number | null = node.attrs.width ? Number(node.attrs.width) : null;
  const height: number | null = node.attrs.height ? Number(node.attrs.height) : null;

  const selectSelf = useCallback(() => {
    const pos = safePos(getPos);
    if (pos === null) return;
    try {
      editor.commands.setNodeSelection(pos);
    } catch {
      /* posição já inválida — ignora em vez de derrubar o node view */
    }
  }, [editor, getPos]);

  const commitSize = useCallback(
    (size: ImageSize) => updateAttributes({ width: size.width, height: size.height }),
    [updateAttributes]
  );

  const { isResizing, displayWidth, displayHeight, startResize, resetSize, fitToWidth } =
    useImageResize({
      imgRef,
      boundsRef: wrapperRef,
      width,
      height,
      onCommit: commitSize,
      onStart: selectSelf,
      enabled: editor.isEditable,
    });

  // ── Arrasto ────────────────────────────────────────────────────────────────
  // O ProseMirror marca o wrapper inteiro como `draggable`, o que fazia
  // QUALQUER clique-e-mover sobre a imagem iniciar um arrasto — a origem da
  // sensação de "a imagem sai do lugar sozinha" ao tentar apenas selecioná-la.
  //
  // Aqui o wrapper só passa a ser arrastável quando o clique começa na alça.
  // O atributo `data-drag-handle` fica no wrapper (e não na alça) porque o
  // evento `dragstart` é disparado no elemento arrastável, não no filho
  // pressionado — com ele na alça, o Tiptap não reconheceria o arrasto e não
  // criaria a NodeSelection nem a imagem de arrasto.
  useEffect(() => {
    const el = wrapperRef.current;
    if (el) el.draggable = false;
  }, []);

  const handleMouseDownCapture = useCallback((event: React.MouseEvent) => {
    const el = wrapperRef.current;
    if (!el) return;
    const target = event.target as HTMLElement | null;
    el.draggable = !!target?.closest?.('[data-image-drag-grip]');
  }, []);

  const handleDragEnd = useCallback(() => {
    const el = wrapperRef.current;
    if (el) el.draggable = false;
  }, []);

  // ── Legenda ────────────────────────────────────────────────────────────────
  // Estado local + debounce: gravar a cada tecla criava uma transação
  // ProseMirror (e um passo de undo) por caractere.
  const [captionDraft, setCaptionDraft] = useState<string>(node.attrs.caption || '');
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionFocused = useRef(false);

  useEffect(() => {
    if (!captionFocused.current) setCaptionDraft(node.attrs.caption || '');
  }, [node.attrs.caption]);

  useEffect(() => {
    return () => {
      if (captionTimer.current) clearTimeout(captionTimer.current);
    };
  }, []);

  const handleCaptionChange = useCallback(
    (value: string) => {
      setCaptionDraft(value);
      if (captionTimer.current) clearTimeout(captionTimer.current);
      captionTimer.current = setTimeout(() => updateAttributes({ caption: value }), 400);
    },
    [updateAttributes]
  );

  const flushCaption = useCallback(() => {
    captionFocused.current = false;
    if (captionTimer.current) {
      clearTimeout(captionTimer.current);
      captionTimer.current = null;
    }
    if (captionDraft !== (node.attrs.caption || '')) updateAttributes({ caption: captionDraft });
  }, [captionDraft, node.attrs.caption, updateAttributes]);

  // ── Ações ──────────────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    try {
      await copyImageToClipboard(src);
      setCopyState('ok');
    } catch (err) {
      console.error('[ImageFrame] Falha ao copiar imagem:', err);
      setCopyState('fail');
    }
    setTimeout(() => setCopyState('idle'), 1600);
  }, [src]);

  const handleDownload = useCallback(() => {
    downloadImage(src, downloadName).catch((err) =>
      console.error('[ImageFrame] Falha ao baixar imagem:', err)
    );
  }, [src, downloadName]);

  const handleMove = useCallback(
    (direction: -1 | 1) => {
      const pos = safePos(getPos);
      if (pos === null) return;
      moveBlockNode(editor, pos, direction);
    },
    [editor, getPos]
  );

  const setAlign = useCallback(
    (value: 'left' | 'center' | 'right') => {
      selectSelf();
      updateAttributes({ align: value });
    },
    [selectSelf, updateAttributes]
  );

  const showChrome = editor.isEditable && (selected || hovered || isResizing);
  const showToolbar = editor.isEditable && selected && !isResizing;

  const imageStyle: React.CSSProperties = {
    width: displayWidth ? `${displayWidth}px` : 'auto',
    height: displayHeight ? `${displayHeight}px` : 'auto',
    maxWidth: '100%',
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      as="div"
      data-align={align}
      data-drag-handle
      className={`image-node group relative block w-fit max-w-full my-3 ${alignToClass(align)} ${
        isResizing ? 'select-none' : ''
      }`}
      onMouseDownCapture={handleMouseDownCapture}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div ref={innerRef} className="relative inline-block max-w-full leading-[0]">
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          title={title || undefined}
          style={imageStyle}
          draggable={false}
          className={`image-node__img rounded-md border transition-shadow ${
            selected ? 'border-brand-500/60 ring-2 ring-brand-500' : 'border-white/10'
          }`}
          onMouseDown={selectSelf}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onOpenViewer();
          }}
        />

        {/* Alça de arrasto dedicada — a única forma de mover a imagem com o mouse */}
        {showChrome && (
          <div
            data-image-drag-grip
            contentEditable={false}
            title="Arraste para mover a imagem"
            className="absolute left-2 top-2 z-20 flex h-7 w-6 cursor-grab items-center justify-center rounded-md border border-white/10 bg-dark-bg/85 text-dark-subtext shadow-lg backdrop-blur-xl transition-colors hover:text-white active:cursor-grabbing"
          >
            <GripVertical size={14} />
          </div>
        )}

        {/* Alças de redimensionamento */}
        {showChrome && (
          <>
            {HANDLES.map(({ handle, className, cursor }) => (
              <div
                key={handle}
                contentEditable={false}
                style={{ cursor }}
                className={`absolute z-20 h-3 w-3 rounded-full border border-white bg-brand-500 shadow-sm ${className}`}
                onPointerDown={(event) => startResize(event, handle)}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  resetSize();
                }}
              />
            ))}
            {EDGE_HANDLES.map(({ handle, className, cursor }) => (
              <div
                key={handle}
                contentEditable={false}
                style={{ cursor }}
                className={`absolute z-20 rounded-sm border border-white bg-brand-500 shadow-sm ${className}`}
                onPointerDown={(event) => startResize(event, handle)}
              />
            ))}
          </>
        )}

        {/* Indicador de tamanho durante o arrasto */}
        {isResizing && displayWidth && (
          <div
            contentEditable={false}
            className="pointer-events-none absolute bottom-2 right-2 z-30 rounded-md bg-dark-bg/90 px-2 py-1 font-mono text-[11px] text-white shadow-lg backdrop-blur-xl"
          >
            {Math.round(displayWidth)}
            {displayHeight ? ` × ${Math.round(displayHeight)}` : ''} px
          </div>
        )}

        {/* Barra de ações — acima da imagem, para não cobrir o conteúdo */}
        {showToolbar && (
          <div
            contentEditable={false}
            className="absolute bottom-full right-0 z-30 mb-2 flex items-center gap-0.5 rounded-lg border border-white/10 bg-dark-bg/95 p-1 shadow-2xl backdrop-blur-xl"
            onMouseDown={(event) => event.preventDefault()}
          >
            <ToolbarButton title="Alinhar à esquerda" active={align === 'left'} onClick={() => setAlign('left')}>
              <AlignLeft size={14} />
            </ToolbarButton>
            <ToolbarButton title="Centralizar" active={align === 'center'} onClick={() => setAlign('center')}>
              <AlignCenter size={14} />
            </ToolbarButton>
            <ToolbarButton title="Alinhar à direita" active={align === 'right'} onClick={() => setAlign('right')}>
              <AlignRight size={14} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton title="Mover para cima (Alt+↑)" onClick={() => handleMove(-1)}>
              <ChevronUp size={14} />
            </ToolbarButton>
            <ToolbarButton title="Mover para baixo (Alt+↓)" onClick={() => handleMove(1)}>
              <ChevronDown size={14} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton title="Ocupar toda a largura" onClick={fitToWidth}>
              <Maximize2 size={14} />
            </ToolbarButton>
            <ToolbarButton title="Restaurar tamanho original" onClick={resetSize}>
              <RotateCcw size={14} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              title={copyState === 'ok' ? 'Copiada!' : copyState === 'fail' ? 'Falha ao copiar' : 'Copiar imagem'}
              active={copyState === 'ok'}
              danger={copyState === 'fail'}
              onClick={handleCopy}
            >
              <Copy size={14} />
            </ToolbarButton>
            <ToolbarButton title="Baixar" onClick={handleDownload}>
              <Download size={14} />
            </ToolbarButton>
            <ToolbarButton title="Excluir" danger onClick={onRequestDelete}>
              <Trash2 size={14} />
            </ToolbarButton>
          </div>
        )}
      </div>

      {/* Legenda */}
      {(showToolbar || captionDraft) && (
        <div className="mt-1.5 w-full" contentEditable={false}>
          <input
            type="text"
            value={captionDraft}
            readOnly={!editor.isEditable}
            onFocus={() => {
              captionFocused.current = true;
            }}
            onChange={(event) => handleCaptionChange(event.target.value)}
            onBlur={flushCaption}
            placeholder="Escreva uma legenda..."
            className="w-full rounded border-none bg-transparent px-2 py-1 text-center text-sm text-dark-subtext placeholder-white/20 focus:text-white focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px bg-white/10" />;
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
