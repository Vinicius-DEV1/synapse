/**
 * useGroupResize.ts
 *
 * Redimensionamento das colunas de um grupo.
 *
 * Dois cuidados que a versão anterior não tinha:
 *
 *  • As alças são posicionadas a partir do DOM real, medindo o vão entre as
 *    colunas. Antes usavam `left: <soma das larguras>%`, ignorando o `gap` —
 *    com 2+ colunas a alça ficava visivelmente fora do vão.
 *
 *  • Durante o arrasto só o DOM é tocado. A versão anterior chamava
 *    `setNodeMarkup` a cada `mousemove`, ou seja uma transação ProseMirror +
 *    escrita no Y.Doc + serialização do documento inteiro a ~60fps.
 *    A gravação acontece uma única vez, no `pointerup`.
 */

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { GroupSpec } from './groupSpecs';
import { getWidths, setChildWidths } from './groupCommands';

const MIN_PERCENT = 12;

/**
 * Marcador comum a todos os filhos de grupo. Precisa apontar para o elemento
 * que de fato é o flex-item: para `columnBlock` é o próprio node (sem node
 * view), para `linkPreview` é o wrapper externo criado pelo Tiptap.
 */
export const GROUP_CHILD_SELECTOR = '[data-group-child]';

interface UseGroupResizeOptions {
  spec: GroupSpec;
  node: PMNode;
  view: EditorView;
  getPos: () => number | undefined;
  /** Elemento raiz do node view. */
  wrapperRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}

export interface GroupResizeState {
  /** Distância, em px a partir da borda esquerda do wrapper, de cada vão. */
  handleOffsets: number[];
  isResizing: boolean;
  /** Larguras mostradas durante o arrasto (null quando parado). */
  previewWidths: number[] | null;
  startResize: (event: React.PointerEvent, gutterIndex: number) => void;
  remeasure: () => void;
}

export function useGroupResize({
  spec,
  node,
  view,
  getPos,
  wrapperRef,
  enabled,
}: UseGroupResizeOptions): GroupResizeState {
  const [handleOffsets, setHandleOffsets] = useState<number[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [previewWidths, setPreviewWidths] = useState<number[] | null>(null);

  const childCount = node.childCount;

  /**
   * O `NodeViewContent` do Tiptap sobrescreve qualquer `ref` recebido e o
   * contentDOM real é um <div> injetado dentro dele — por isso as colunas são
   * localizadas a partir do wrapper, e não por `children`.
   */
  const getChildElements = useCallback((): HTMLElement[] => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return [];
    return Array.from(wrapper.querySelectorAll<HTMLElement>(GROUP_CHILD_SELECTOR)).filter(
      (el) => el.closest('[data-group-root]') === wrapper
    );
  }, [wrapperRef]);

  const remeasure = useCallback(() => {
    const wrapper = wrapperRef.current;
    const children = getChildElements();
    if (!wrapper || children.length < 2) {
      setHandleOffsets((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const wrapperLeft = wrapper.getBoundingClientRect().left;
    const offsets: number[] = [];
    for (let i = 0; i < children.length - 1; i += 1) {
      const current = children[i].getBoundingClientRect();
      const next = children[i + 1].getBoundingClientRect();
      offsets.push((current.right + next.left) / 2 - wrapperLeft);
    }

    setHandleOffsets((prev) =>
      prev.length === offsets.length && prev.every((value, i) => Math.abs(value - offsets[i]) < 0.5)
        ? prev
        : offsets
    );
  }, [wrapperRef, getChildElements]);

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure, childCount, node]);

  /**
   * As colunas são montadas pelo ProseMirror DEPOIS deste efeito rodar — medir
   * só uma vez deixava o grupo recém-criado sem divisores até a próxima
   * mudança de tamanho. Por isso observamos também a inserção dos filhos.
   */
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // `setTimeout` e não `requestAnimationFrame`: rAF não dispara em aba
    // oculta/minimizada, e o layout ficaria sem divisores até a primeira
    // interação. Medir num macrotask depois do commit é suficiente.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        observeChildren();
        remeasure();
      }, 0);
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => schedule()) : null;

    const observeChildren = () => {
      if (!resizeObserver) return;
      resizeObserver.disconnect();
      resizeObserver.observe(wrapper);
      getChildElements().forEach((el) => resizeObserver.observe(el));
    };

    const mutationObserver =
      typeof MutationObserver !== 'undefined' ? new MutationObserver(() => schedule()) : null;
    mutationObserver?.observe(wrapper, { childList: true, subtree: true });

    observeChildren();
    schedule();

    return () => {
      if (timer !== null) clearTimeout(timer);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [wrapperRef, getChildElements, remeasure]);

  const startResize = useCallback(
    (event: React.PointerEvent, gutterIndex: number) => {
      if (!enabled || event.button !== 0) return;

      const children = getChildElements();
      const left = children[gutterIndex];
      const right = children[gutterIndex + 1];
      if (!left || !right) return;

      event.preventDefault();
      event.stopPropagation();

      const target = event.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        /* alguns navegadores recusam a captura; os listeners globais cobrem */
      }

      const widths = getWidths(spec, node);
      const startX = event.clientX;
      const startLeft = widths[gutterIndex];
      const startRight = widths[gutterIndex + 1];
      const pairTotal = startLeft + startRight;
      const pairPixels = left.getBoundingClientRect().width + right.getBoundingClientRect().width;

      document.body.style.cursor = 'col-resize';
      setIsResizing(true);

      let latest = widths.slice();
      let frame: number | null = null;

      const onMove = (moveEvent: PointerEvent) => {
        if (pairPixels <= 0) return;

        const delta = ((moveEvent.clientX - startX) / pairPixels) * pairTotal;
        let nextLeft = startLeft + delta;
        let nextRight = startRight - delta;

        if (nextLeft < MIN_PERCENT) {
          nextLeft = MIN_PERCENT;
          nextRight = pairTotal - MIN_PERCENT;
        } else if (nextRight < MIN_PERCENT) {
          nextRight = MIN_PERCENT;
          nextLeft = pairTotal - MIN_PERCENT;
        }

        latest = widths.slice();
        latest[gutterIndex] = nextLeft;
        latest[gutterIndex + 1] = nextRight;

        // Preview direto no DOM — nenhuma transação durante o arrasto.
        left.style.flex = `${nextLeft} 1 0%`;
        right.style.flex = `${nextRight} 1 0%`;

        if (frame === null) {
          frame = requestAnimationFrame(() => {
            frame = null;
            setPreviewWidths(latest.slice());
            remeasure();
          });
        }
      };

      const finish = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', finish);
        document.removeEventListener('pointercancel', finish);
        document.body.style.cursor = '';
        if (frame !== null) cancelAnimationFrame(frame);

        try {
          target.releasePointerCapture(event.pointerId);
        } catch {
          /* já liberado */
        }

        setIsResizing(false);
        setPreviewWidths(null);

        const pos = getPos();
        if (typeof pos === 'number') setChildWidths(view, pos, latest);
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', finish);
      document.addEventListener('pointercancel', finish);
    },
    [enabled, getChildElements, spec, node, view, getPos, remeasure]
  );

  return { handleOffsets, isResizing, previewWidths, startResize, remeasure };
}
