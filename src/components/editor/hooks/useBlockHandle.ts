import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { draggableBlockAt } from '../../editor-extensions/topLevelBlock';
import { endExternalDrag, startExternalBlockDrag } from '../../editor-extensions/group-layout';
import { moveBlockUp, moveBlockDown } from '../../editor-extensions/moveBlockCommands';
import { triggerToast } from '../../ui/ToastContext';

/** Distância em pixels entre a alça flutuante e a borda esquerda do bloco. */
const BLOCK_HANDLE_GAP = 26;

/**
 * Tipos de nós de nível de bloco que implementam sua própria alça de arrasto interna.
 * Textblocks comuns (parágrafos, títulos, listas) sempre usam a alça flutuante externa.
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
}

/**
 * Hook que gerencia o posicionamento e ciclo de vida da alça flutuante de blocos.
 * Permite selecionar, arrastar e gerenciar opções de blocos do editor.
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

    const onMouseMove = (event: MouseEvent) => {
      if (draggingRef.current || menuOpenRef.current) return;

      const view = editor.view;
      if (!view.editable) {
        hide();
        return;
      }

      if (overHandle(event.target)) return;

      const editorRect = view.dom.getBoundingClientRect();
      if (event.clientY < editorRect.top || event.clientY > editorRect.bottom) {
        hide();
        return;
      }

      // Projeta a coordenada X para dentro da área editável caso o cursor esteja na margem
      const probeX = Math.min(
        Math.max(event.clientX, editorRect.left + 8),
        editorRect.right - 8
      );

      const block = draggableBlockAt(view, probeX, event.clientY);
      if (!block) {
        hide();
        return;
      }

      const rect = block.dom.getBoundingClientRect();
      if (rect.height === 0) {
        hide();
        return;
      }

      // Se for um bloco com alça interna própria (não-textblock), suprime a alça flutuante
      if (!block.node.isTextblock && OWN_DRAG_HANDLE_NODES.has(block.node.type.name)) {
        hide();
        return;
      }

      if (posRef.current === block.pos) return;
      posRef.current = block.pos;
      setAnchor({ x: Math.max(4, rect.left - BLOCK_HANDLE_GAP), y: rect.top + 2 });
    };

    const onMouseLeave = (event: MouseEvent) => {
      if (draggingRef.current) return;
      if (overHandle(event.relatedTarget)) return;
      hide();
    };

    const hideUnlessDragging = () => {
      if (!draggingRef.current) hide();
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('scroll', hideUnlessDragging, true);
    editor.on('update', hideUnlessDragging);

    return () => {
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

  return { anchor, onDragStart, onDragEnd, onDelete, onMoveUp, onMoveDown, onAddBelow, onMenuOpenChange };
}
