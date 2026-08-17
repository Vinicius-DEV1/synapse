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
  /** A alça avisa quando abre/fecha o menu — ver `menuOpenRef`. */
  onMenuOpenChange: (open: boolean) => void;
}

export function useBlockHandle(
  editor: Editor | null,
  containerRef: React.RefObject<HTMLElement | null>
): BlockHandleState {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const posRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  /*
   * Com o menu aberto a alça não pode sumir. O menu é filho dela, mas fica
   * deslocado alguns pixels para o lado: ao atravessar essa fresta o ponteiro
   * passa sobre o conteúdo do editor, o que escondia a alça — e o menu junto,
   * antes de dar tempo de clicar em nada dentro dele.
   */
  const menuOpenRef = useRef(false);

  /** Esconde de verdade, ignorando o menu. Usado quando o bloco deixa de existir. */
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

    /** O ponteiro está sobre a própria alça (ou o menu que ela abre)? */
    const overHandle = (node: EventTarget | null) =>
      node instanceof HTMLElement && !!node.closest('.block-handle');

    const onMouseMove = (event: MouseEvent) => {
      // Durante o arrasto a alça é a fonte do evento: não pode se mover nem sumir.
      // Com o menu aberto ela também fica ancorada onde está.
      if (draggingRef.current || menuOpenRef.current) return;

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
      // Sem o piso a alça cai em x negativo quando o editor encosta na borda
      // esquerda da janela — fora da tela e impossível de pegar.
      setAnchor({ x: Math.max(4, rect.left - HANDLE_GAP), y: rect.top + 2 });
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
      // Se não dá para arrastar, o arrasto precisa ser CANCELADO. Sem o
      // preventDefault o navegador inicia mesmo assim, com o dataTransfer vazio
      // e sem `view.dragging`: um arrasto fantasma, que ao ser solto não move
      // nada e ainda atravessa os handlers como se fosse legítimo.
      const abort = () => event.preventDefault();

      const pos = posRef.current;
      if (!editor || pos === null) return abort();

      const view = editor.view;
      const node = view.state.doc.nodeAt(pos);
      if (!node) return abort();

      // Seleciona o nó, marca o arrasto como MOVER interno e registra a origem.
      // Mora na extensão porque é o protocolo de arrasto do editor: a alça vive
      // fora do `view.dom` e nenhum `dragstart` do ProseMirror dispara para ela.
      if (!startExternalBlockDrag(view, pos)) return abort();
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
    forceHide();
  }, [editor, forceHide]);

  const onDelete = useCallback(() => {
    const pos = posRef.current;
    if (!editor || pos === null) return;
    const node = editor.view.state.doc.nodeAt(pos);
    if (!node) return;
    editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
    // `forceHide` e não `hide`: o menu ainda está aberto neste instante (a alça
    // só o fecha depois do callback), e o bloco que a ancorava acabou de sumir.
    forceHide();
  }, [editor, forceHide]);

  return { anchor, onDragStart, onDragEnd, onDelete, onMenuOpenChange };
}
