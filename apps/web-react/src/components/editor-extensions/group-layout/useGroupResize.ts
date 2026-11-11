/**
 * useGroupResize.ts
 *
 * Group column resize mechanics and handle positioning.
 *
 * Two core safeguards support this module:
 *
 *  • Handles are positioned by measuring actual DOM gaps between columns.
 *    Deriving position solely from percentage widths disregards flex gap and offsets alignment.
 *
 *  • Only local DOM is modified during active drag; ProseMirror transaction commits once on
 *    `pointerup` to avoid 60fps Y.Doc serialization.
 */

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { GroupSpec } from './groupSpecs';
import { getWidths, setChildWidths } from './groupCommands';

const MIN_PERCENT = 12;

/**
 * Common selector for group child flex items (e.g. `columnBlock` DOM node or `linkPreview` TipTap wrapper).
 */
export const GROUP_CHILD_SELECTOR = '[data-group-child]';

interface UseGroupResizeOptions {
  spec: GroupSpec;
  node: PMNode;
  view: EditorView;
  getPos: () => number | undefined;
  /** Root DOM element of node view. */
  wrapperRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}

export interface GroupResizeState {
  /** Distance in px from left edge of wrapper for each column gap. */
  handleOffsets: number[];
  /** Total wrapper width measured alongside column gaps. */
  wrapperWidth: number;
  isResizing: boolean;
  /** Column widths displayed during active resize (null when idle). */
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
  // Gaps and width in single state: measured in same pass and change together,
  // separating them would cause two renders per remeasurement.
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
   * `node` is a fresh object on every transaction; using it as effect dependency
   * would trigger re-measurements on every keystroke. Effect observes column count
   * and serialized width signatures instead.
   */
  const widthSignature = getWidths(spec, node).join(',');

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure, childCount, widthSignature]);

  /**
   * Columns are mounted by ProseMirror AFTER this effect runs — single-pass
   * measurement left newly created groups without dividers until next resize.
   * Child element mutations are observed to handle dynamic mounting.
   */
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // `setTimeout` rather than `requestAnimationFrame`: rAF does not fire in hidden/minimized tabs,
    // which would leave layout without dividers until first interaction.
    // Measuring in a macrotask after commit is sufficient.
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
     * MutationObserver reattaches ResizeObserver only when column set
     * changes. Observing subtree is required because TipTap inserts internal containers.
     * wrapper e as colunas reais), mas sem o filtro cada tecla digitada dentro
     * re-measuring only when column layout geometry genuinely updates.
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

        // Direct DOM preview - no transactions during drag.
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
          /* already released */
        }

        setIsResizing(false);
        setPreviewWidths(null);

        // Preview writes `style.flex` directly to DOM. Without cleanup, it persists.
        // sobrevive ao arrasto e diverge do atributo — largura fantasma quando
        // `setChildWidths` triggers nothing or child has its own node view.
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
