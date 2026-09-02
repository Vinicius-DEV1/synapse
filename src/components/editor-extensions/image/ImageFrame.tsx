/**
 * ImageFrame.tsx
 *
 * Coordinator modular dos node views de imagem (ResizableImage e EncryptedImage):
 * drag handle, action toolbar, resize handles, caption, and alignment controls.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { GripVertical, ArrowUp, ArrowDown, Plus } from 'lucide-react';

import { useImageResize } from './useImageResize';
import type { ImageSize } from './useImageResize';
import {
  alignToClass,
  copyImageToClipboard,
  downloadImage,
  moveBlockNode,
  normalizeAlign,
  safePos,
} from './imageUtils';
import { findChildIndex, appendToGroup, createGroup } from '../group-layout/groupCommands';
import { selectNodeForDrag } from '../group-layout/DragToGroup';
import { COLUMN_GROUP_SPEC } from '../group-layout/groupSpecs';
import { moveBlockUp, moveBlockDown } from '../moveBlockCommands';
import ImageToolbar from './ImageToolbar';
import ImageResizeHandles from './ImageResizeHandles';
import ImageCaption from './ImageCaption';

interface ImageFrameProps {
  editor: Editor;
  node: PMNode;
  getPos: unknown;
  updateAttributes: (attrs: Record<string, unknown>) => void;
  selected: boolean;
  /** Renderable asset URL (direct src or decrypted blob URL). */
  src: string;
  alt?: string;
  title?: string;
  /** Suggested download basename (without extension). */
  downloadName: string;
  onOpenViewer: () => void;
  onRequestDelete: () => void;
}

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

  // Selection determines what drag-and-drop moves: `selectNodeForDrag` verifies
  // target position matches this node before modifying selection.
  const selectSelf = useCallback(() => {
    const pos = safePos(getPos);
    if (pos === null) return;
    selectNodeForDrag(editor.view, pos, node);
  }, [editor, getPos, node]);

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

  useEffect(() => {
    const el = wrapperRef.current;
    if (el) el.draggable = false;
  }, []);

  const handleMouseDownCapture = useCallback((event: React.MouseEvent) => {
    const el = wrapperRef.current;
    if (!el) return;
    const target = event.target as HTMLElement | null;
    const isControl = !!target?.closest?.('button, input, textarea, .image-node__handle');
    
    if (!isControl) {
      el.draggable = true;
      selectSelf();
    }
  }, [selectSelf]);

  const handleDragEnd = useCallback(() => {
    const el = wrapperRef.current;
    if (el) el.draggable = false;
  }, []);

  // ── Legenda ────────────────────────────────────────────────────────────────
  const captionValue = (node.attrs.caption as string | undefined) ?? '';
  const [captionDraft, setCaptionDraft] = useState(captionValue);
  const captionFocused = useRef(false);

  useEffect(() => {
    if (!captionFocused.current) {
      setCaptionDraft(captionValue);
    }
  }, [captionValue]);

  const handleCaptionChange = useCallback((value: string) => {
    setCaptionDraft(value);
  }, []);

  const flushCaption = useCallback(() => {
    captionFocused.current = false;
    if (captionDraft !== captionValue) {
      updateAttributes({ caption: captionDraft.trim() });
    }
  }, [captionDraft, captionValue, updateAttributes]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleCreateColumn = useCallback(() => {
    const pos = safePos(getPos);
    if (pos === null) return;

    const { view } = editor;
    const paragraphType = view.state.schema.nodes.paragraph;
    if (!paragraphType) return;

    const emptyParagraph = paragraphType.create();
    const groupInfo = findChildIndex(view.state.doc, pos);

    if (groupInfo) {
      appendToGroup(view, groupInfo.groupPos, [emptyParagraph], 'right');
    } else {
      createGroup(view, COLUMN_GROUP_SPEC, pos, [emptyParagraph], 'right');
    }
  }, [editor, getPos]);

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
          loading="lazy"
          decoding="async"
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

        {/* Alça e controles de movimentação discretos */}
        {showChrome && (
          <div
            contentEditable={false}
            className="absolute left-2 top-2 z-20 flex flex-col items-center gap-0.5 rounded-md border border-white/10 bg-dark-bg/90 p-0.5 text-dark-subtext shadow-lg backdrop-blur-xl transition-all"
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const pos = safePos(getPos);
                if (pos !== null && editor) moveBlockUp(editor.view, pos);
              }}
              className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
              title="Subir imagem (Mover para cima)"
            >
              <ArrowUp size={11} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const pos = safePos(getPos);
                if (pos !== null && editor && node) {
                  editor
                    .chain()
                    .focus()
                    .insertContentAt(pos + node.nodeSize, { type: 'paragraph' })
                    .run();
                }
              }}
              className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
              title="Adicionar linha abaixo (+)"
            >
              <Plus size={11} />
            </button>
            <div
              data-image-drag-grip
              data-drag-handle
              onMouseDown={selectSelf}
              title="Arraste para mover a imagem"
              className="p-0.5 cursor-grab active:cursor-grabbing hover:text-white transition-colors"
            >
              <GripVertical size={13} />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const pos = safePos(getPos);
                if (pos !== null && editor) moveBlockDown(editor.view, pos);
              }}
              className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
              title="Descer imagem (Mover para baixo)"
            >
              <ArrowDown size={11} />
            </button>
          </div>
        )}

        {/* Alças de redimensionamento e badge */}
        <ImageResizeHandles
          showChrome={showChrome}
          isResizing={isResizing}
          displayWidth={displayWidth}
          displayHeight={displayHeight}
          onStartResize={startResize}
          onResetSize={resetSize}
        />

        {/* Barra de ferramentas */}
        {showToolbar && (
          <ImageToolbar
            align={align}
            copyState={copyState}
            onSetAlign={setAlign}
            onMove={handleMove}
            onFitToWidth={fitToWidth}
            onResetSize={resetSize}
            onCreateColumn={handleCreateColumn}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onRequestDelete={onRequestDelete}
          />
        )}
      </div>

      {/* Campo de legenda */}
      <ImageCaption
        visible={showToolbar || !!captionDraft}
        value={captionDraft}
        isEditable={editor.isEditable}
        onChange={handleCaptionChange}
        onFocus={() => {
          captionFocused.current = true;
        }}
        onBlur={flushCaption}
      />
    </NodeViewWrapper>
  );
}
