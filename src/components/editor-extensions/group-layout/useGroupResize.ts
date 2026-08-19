/**
 * useGroupResize.ts
 *
 * Redimensionamento das colunas de um grupo.
 *
 * Dois cuidados sustentam o resto do arquivo:
 *
 *  • As alças são posicionadas medindo o vão real entre as colunas no DOM.
 *    Derivar a posição das larguras em % ignora o `gap` e erra o lugar.
 *
 *  • Durante o arrasto só o DOM é tocado; a gravação acontece uma vez só, no
 *    `pointerup`. Uma transação por `mousemove` significaria escrita no Y.Doc e
 *    serialização do documento inteiro a ~60fps.
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
  /** Largura do wrapper, medida junto com os vãos. */
  wrapperWidth: number;
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
  // Vãos e largura num state só: são medidos na mesma passada e mudam juntos,
  // então separá-los custaria dois renders por remedição.
  const [metrics, setMetrics] = useState<{ offsets: number[]; width: number }>({
    offsets: [],
    width: 0,
  });
  const [isResizing, setIsResizing] = useState(false);
  const [previewWidths, setPreviewWidths] = useState<number[] | null>(null);

  const childCount = node.childCount;

  const getChildElements = useCallback((): HTMLElement[] => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return [];
    let content: Element | null = wrapper.querySelector('.group-layout__content');
    if (!content) return [];
    const reactContainer = content.querySelector(':scope > [data-node-view-content-react]');
    if (reactContainer) {
      content = reactContainer;
    }
    return Array.from(content.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement
    );
  }, [wrapperRef]);

  const remeasure = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const children = getChildElements();

    if (children.length <= 1) {
      setMetrics((prev) =>
        prev.offsets.length === 0 && Math.abs(prev.width - wrapperRect.width) < 0.5
          ? prev
          : { offsets: [], width: wrapperRect.width }
      );
      return;
    }

    const offsets: number[] = [];
    for (let i = 0; i < children.length - 1; i += 1) {
      const current = children[i].getBoundingClientRect();
      const next = children[i + 1].getBoundingClientRect();
      offsets.push((current.right + next.left) / 2 - wrapperRect.left);
    }

    setMetrics((prev) => {
      const sameWidth = Math.abs(prev.width - wrapperRect.width) < 0.5;
      const sameOffsets =
        prev.offsets.length === offsets.length &&
        prev.offsets.every((value, i) => Math.abs(value - offsets[i]) < 0.5);
      return sameWidth && sameOffsets ? prev : { offsets, width: wrapperRect.width };
    });
  }, [wrapperRef, getChildElements]);

  /*
   * `node` é um objeto novo a cada transação, então usá-lo como dependência
   * remediria o grupo a cada tecla digitada em qualquer lugar do documento. O
   * que muda o layout é o número de colunas e as larguras.
   */
  const widthSignature = getWidths(spec, node).join(',');

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure, childCount, widthSignature]);

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

    /*
     * O MutationObserver só reata o ResizeObserver quando o CONJUNTO de colunas
     * muda. Observar a subárvore é necessário (o Tiptap injeta um <div> entre o
     * wrapper e as colunas reais), mas sem o filtro cada tecla digitada dentro
     * de uma coluna dispararia remedição e re-render do grupo inteiro.
     */
    const touchesChildren = (records: MutationRecord[]) =>
      records.some((record) =>
        [...record.addedNodes, ...record.removedNodes].some(
          (candidate) =>
            candidate instanceof HTMLElement &&
            (candidate.matches(GROUP_CHILD_SELECTOR) ||
              candidate.querySelector(GROUP_CHILD_SELECTOR) !== null)
        )
      );

    const mutationObserver =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver((records) => {
            if (touchesChildren(records)) schedule();
          })
        : null;
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

        // O preview escreve `style.flex` direto no DOM. Sem limpar, ele
        // sobrevive ao arrasto e diverge do atributo — largura fantasma quando
        // `setChildWidths` não dispara nada ou o filho tem node view próprio.
        left.style.flex = '';
        right.style.flex = '';

        const pos = getPos();
        if (typeof pos === 'number') setChildWidths(view, pos, latest);
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', finish);
      document.addEventListener('pointercancel', finish);
    },
    [enabled, getChildElements, spec, node, view, getPos, remeasure]
  );

  return {
    handleOffsets: metrics.offsets,
    wrapperWidth: metrics.width,
    isResizing,
    previewWidths,
    startResize,
    remeasure,
  };
}
