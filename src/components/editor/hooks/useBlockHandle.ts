import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { draggableBlockAt } from '../../editor-extensions/topLevelBlock';
import { endExternalDrag, startExternalBlockDrag } from '../../editor-extensions/group-layout';
import { moveBlockUp, moveBlockDown } from '../../editor-extensions/moveBlockCommands';
import { triggerToast } from '../../ui/ToastContext';

/** Pixel distance between floating handle and left block boundary. */
const BLOCK_HANDLE_GAP = 24;

/**
 * Block-level node types providing internal drag handles.
 * Standard textblocks (paragraphs, headings, lists) always use external floating handle.
 */
const OWN_DRAG_HANDLE_NODES = new Set([
  'linkPreview',
  'image',
  'resizableImage',
  'encryptedImage',
  'codeBlock',
  'codeBlockLowlight',
  'blockquoteToggle',
  'toggleBlock',
  'horizontalRule',
  'questionBlock',
]);

export interface BlockHandleState {
  anchor: { x: number; y: number } | null;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBelow: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onChangeColor: (color: string, isBackground: boolean) => void;
}

/**
 * Manages lifecycle and positioning of floating block handle in the editor.
 * Supports block selection, drag-and-drop, and context operations.
 */
export function useBlockHandle(
  editor: Editor | null,
  containerRef: React.RefObject<HTMLElement | null>
): BlockHandleState {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const posRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const menuOpenRef = useRef(false);

  const forceHide = useCallback(() => {
    menuOpenRef.current = false;
    posRef.current = null;
    setAnchor(null);
  }, []);

  const hide = useCallback(() => {
    if (menuOpenRef.current) return;
    posRef.current = null;
    setAnchor(null);
  }, []);

  const onMenuOpenChange = useCallback((open: boolean) => {
    menuOpenRef.current = open;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!editor || !container) return;

    const overHandle = (node: EventTarget | null) =>
      node instanceof HTMLElement && !!node.closest('.block-handle');

    let rafId: number | null = null;
    let lastEvent: MouseEvent | null = null;
    let hideTimer: number | null = null;

    const clearHideTimer = () => {
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const scheduleHide = () => {
      clearHideTimer();
      hideTimer = window.setTimeout(() => {
        hide();
      }, 250);
    };

    const processMouseMove = () => {
      rafId = null;
      if (!lastEvent) return;
      const event = lastEvent;

      if (draggingRef.current || menuOpenRef.current) return;

      const view = editor.view;
      if (!view.editable) {
        hide();
        return;
      }

      if (overHandle(event.target)) {
        clearHideTimer();
        return;
      }

      const editorRect = view.dom.getBoundingClientRect();
      
      // Allows a margin of up to 60px on the left and 30px on the right
      const isInsideZone =
        event.clientX >= editorRect.left - 60 &&
        event.clientX <= editorRect.right + 30 &&
        event.clientY >= editorRect.top - 10 &&
        event.clientY <= editorRect.bottom + 10;

      if (!isInsideZone) {
        scheduleHide();
        return;
      }

      clearHideTimer();

      // Projects X coordinate into editable area if cursor is in margin/gutter
      const probeX = Math.min(
        Math.max(event.clientX, editorRect.left + 8),
        editorRect.right - 8
      );

      const block = draggableBlockAt(view, probeX, event.clientY);
      if (!block) {
        scheduleHide();
        return;
      }

      // Early exit if block hasn't changed to prevent layout thrashing
      if (posRef.current === block.pos) return;

      const rect = block.dom.getBoundingClientRect();
      if (rect.height === 0) {
        scheduleHide();
        return;
      }

      // If block has its own internal handle (non-textblock), suppress floating handle
      if (!block.node.isTextblock && OWN_DRAG_HANDLE_NODES.has(block.node.type.name)) {
        hide();
        return;
      }

      posRef.current = block.pos;
      setAnchor({ x: Math.max(4, rect.left - BLOCK_HANDLE_GAP), y: rect.top + 2 });
    };

    const onMouseMove = (event: MouseEvent) => {
      lastEvent = event;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(processMouseMove);
      }
    };

    const onMouseLeave = (event: MouseEvent) => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (draggingRef.current) return;
      if (overHandle(event.relatedTarget)) return;
      scheduleHide();
    };

    const hideUnlessDragging = () => {
      clearHideTimer();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (!draggingRef.current) hide();
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('scroll', hideUnlessDragging, true);
    editor.on('update', hideUnlessDragging);

    return () => {
      clearHideTimer();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('scroll', hideUnlessDragging, true);
      editor.off('update', hideUnlessDragging);
    };
  }, [editor, containerRef, hide]);

  const onDragStart = useCallback(
    (event: React.DragEvent) => {
      const abort = () => event.preventDefault();

      const pos = posRef.current;
      if (!editor || pos === null) return abort();

      const view = editor.view;
      const node = view.state.doc.nodeAt(pos);
      if (!node) return abort();

      if (!startExternalBlockDrag(view, pos, event.clientX)) return abort();
      draggingRef.current = true;

      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', node.textContent || ' ');

      const dom = view.nodeDOM(pos);
      if (dom instanceof HTMLElement) {
        event.dataTransfer.setDragImage(dom, 12, 12);
      }
    },
    [editor]
  );

  const onDragEnd = useCallback(() => {
    draggingRef.current = false;
    if (editor) endExternalDrag(editor.view);
    forceHide();
  }, [editor, forceHide]);

  const onDelete = useCallback(() => {
    try {
      const pos = posRef.current;
      if (!editor || pos === null) return;
      const node = editor.view.state.doc.nodeAt(pos);
      if (!node) return;
      editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
      forceHide();
    } catch (err) {
      console.error('[BlockHandle] Erro ao excluir bloco:', err);
      triggerToast('Falha ao excluir o bloco.', 'error');
    }
  }, [editor, forceHide]);

  const onMoveUp = useCallback(() => {
    const pos = posRef.current;
    if (!editor || pos === null) return;
    moveBlockUp(editor.view, pos);
    forceHide();
  }, [editor, forceHide]);

  const onMoveDown = useCallback(() => {
    const pos = posRef.current;
    if (!editor || pos === null) return;
    moveBlockDown(editor.view, pos);
    forceHide();
  }, [editor, forceHide]);

  const onAddBelow = useCallback(() => {
    const pos = posRef.current;
    if (!editor || pos === null) return;
    const node = editor.view.state.doc.nodeAt(pos);
    if (!node) return;
    editor
      .chain()
      .focus()
      .insertContentAt(pos + node.nodeSize, { type: 'paragraph' })
      .run();
    forceHide();
  }, [editor, forceHide]);

  const onChangeColor = useCallback(
    (color: string, isBackground: boolean) => {
      const pos = posRef.current;
      if (!editor || pos === null) return;
      const { state, view } = editor;
      const { doc, schema } = state;
      const node = doc.nodeAt(pos);
      if (!node) return;

      if (node.isTextblock) {
        const from = pos + 1;
        const to = pos + node.nodeSize - 1;

        if (from === to) {
          editor.chain().focus().setTextSelection(from).run();
          if (isBackground) {
            if (color !== 'transparent' && color !== 'default' && schema.marks.highlight) {
              editor.chain().setHighlight({ color }).run();
            } else {
              editor.chain().unsetHighlight().run();
            }
          } else {
            if (color !== 'inherit' && color !== 'default') {
              editor.chain().setColor(color).run();
            } else {
              editor.chain().unsetColor().run();
            }
          }
        } else {
          const tr = state.tr;
          if (isBackground) {
            if (schema.marks.highlight) {
              tr.removeMark(from, to, schema.marks.highlight);
              if (color !== 'transparent' && color !== 'default') {
                tr.addMark(from, to, schema.marks.highlight.create({ color }));
              }
            }
          } else {
            if (schema.marks.textStyle) {
              tr.removeMark(from, to, schema.marks.textStyle);
              if (color !== 'inherit' && color !== 'default') {
                tr.addMark(from, to, schema.marks.textStyle.create({ color }));
              }
            }
          }
          view.dispatch(tr);
        }
      } else if (node.attrs && ('color' in node.attrs || 'bgColor' in node.attrs)) {
        const attrName = isBackground && 'bgColor' in node.attrs ? 'bgColor' : 'color';
        const tr = view.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          [attrName]: color,
        });
        view.dispatch(tr);
      }

      forceHide();
    },
    [editor, forceHide]
  );

  return { anchor, onDragStart, onDragEnd, onDelete, onMoveUp, onMoveDown, onAddBelow, onMenuOpenChange, onChangeColor };
}
