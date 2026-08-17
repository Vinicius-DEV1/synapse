/**
 * useBlockHandle.ts
 *
 * A alça flutuante que aparece à esquerda do bloco sob o cursor.
 *
 * O componente `BlockHandle` existia há tempos, completo, e nunca foi importado
 * por ninguém — era código morto. Sem ele, `paragraph`, `heading` e listas (que
 * não declaram `draggable` nem têm node view com `data-drag-handle`) não tinham
 * como ser arrastados: só os widgets se moviam, e um layout de colunas com
 * texto só nascia arrastando um widget SOBRE o texto, nunca o contrário.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { topLevelBlockAt } from '../../editor-extensions/topLevelBlock';
import { endExternalDrag, startExternalBlockDrag } from '../../editor-extensions/group-layout';

/** Distância entre a alça e a borda esquerda do bloco. */
const HANDLE_GAP = 26;

export interface BlockHandleState {
  anchor: { x: number; y: number } | null;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onDelete: () => void;
}

export function useBlockHandle(
  editor: Editor | null,
  containerRef: React.RefObject<HTMLElement | null>
): BlockHandleState {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const posRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const hide = useCallback(() => {
    posRef.current = null;
    setAnchor(null);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!editor || !container) return;

    /** O ponteiro está sobre a própria alça (ou o menu que ela abre)? */
    const overHandle = (node: EventTarget | null) =>
      node instanceof HTMLElement && !!node.closest('.block-handle');

    const onMouseMove = (event: MouseEvent) => {
      // Durante o arrasto a alça é a fonte do evento: não pode se mover nem sumir.
      if (draggingRef.current) return;

      const view = editor.view;
      if (!view.editable) {
        hide();
        return;
      }

      // Sem isto a alça desaparece justamente quando o cursor vai pegá-la:
      // ela fica fora do bloco, então `topLevelBlockAt` não acharia nada.
      if (overHandle(event.target)) return;

      const editorRect = view.dom.getBoundingClientRect();
      if (event.clientY < editorRect.top || event.clientY > editorRect.bottom) {
        hide();
        return;
      }

      // O cursor costuma estar na margem esquerda, FORA do editor. Procuramos o
      // bloco pela linha, trazendo o x para dentro da área de conteúdo.
      const probeX = Math.min(
        Math.max(event.clientX, editorRect.left + 8),
        editorRect.right - 8
      );
      const block = topLevelBlockAt(view, probeX, event.clientY);
      if (!block) {
        hide();
        return;
      }

      const rect = block.dom.getBoundingClientRect();
      if (rect.height === 0) {
        hide();
        return;
      }

      // `hide()` zera posRef, entao a alca reaparece sozinha quando volta ao
      // mesmo bloco — nao ha por que observar o `anchor` aqui (o que reassinaria
      // todos os listeners a cada bloco percorrido).
      if (posRef.current === block.pos) return;
      posRef.current = block.pos;
      setAnchor({ x: rect.left - HANDLE_GAP, y: rect.top + 2 });
    };

    const onMouseLeave = (event: MouseEvent) => {
      if (draggingRef.current) return;
      if (overHandle(event.relatedTarget)) return;
      hide();
    };

    // Rolar e editar movem os blocos sem gerar `mousemove`; a alça ficaria
    // ancorada num lugar que não corresponde mais a bloco nenhum.
    const onScroll = () => {
      if (!draggingRef.current) hide();
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('scroll', onScroll, true);
    editor.on('update', hide);

    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('scroll', onScroll, true);
      editor.off('update', hide);
    };
  }, [editor, containerRef, hide]);

  const onDragStart = useCallback(
    (event: React.DragEvent) => {
      const pos = posRef.current;
      if (!editor || pos === null) return;

      const view = editor.view;
      const node = view.state.doc.nodeAt(pos);
      if (!node) return;

      // Seleciona o nó, marca o arrasto como MOVER interno e registra a origem.
      // Mora na extensão porque é o protocolo de arrasto do editor: a alça vive
      // fora do `view.dom` e nenhum `dragstart` do ProseMirror dispara para ela.
      if (!startExternalBlockDrag(view, pos)) return;
      draggingRef.current = true;

      event.dataTransfer.effectAllowed = 'move';
      // O Firefox não inicia arrasto nenhum com o dataTransfer vazio.
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
    hide();
  }, [editor, hide]);

  const onDelete = useCallback(() => {
    const pos = posRef.current;
    if (!editor || pos === null) return;
    const node = editor.view.state.doc.nodeAt(pos);
    if (!node) return;
    editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
    hide();
  }, [editor, hide]);

  return { anchor, onDragStart, onDragEnd, onDelete };
}
