import React, { useRef, useEffect } from 'react';

/**
 * Handles mouse wheel events on horizontally scrollable containers (e.g. code blocks, tables),
 * ensuring smooth vertical page scrolling is never blocked when the mouse cursor is over them.
 *
 * 1. If user indicates horizontal intent (holding Shift or trackpad horizontal swipe |deltaX| > |deltaY|):
 *    - If holding Shift with deltaY, translates vertical wheel movement into horizontal scrollLeft.
 *    - If natural horizontal swipe (deltaX), allows the container to scroll horizontally.
 * 2. If user indicates vertical intent:
 *    - Prevents Linux / WebKitGTK / Chromium from trapping/latching the scroll gesture on the horizontal container.
 *    - Forwards vertical scroll to the nearest scrollable ancestor (.overflow-y-auto or #page-view-scroll).
 */
export function handleScrollableWheel(
  e: WheelEvent,
  container: HTMLElement,
  parentSelector = '#page-view-scroll, .overflow-y-auto'
): void {
  // 1. Check for intentional horizontal scrolling:
  // Either holding Shift (standard desktop convention) or trackpad gesture predominantly horizontal
  const isHorizontalIntent = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);

  if (isHorizontalIntent) {
    // Translate Shift + vertical wheel into horizontal code scroll
    if (e.shiftKey && Math.abs(e.deltaY) > 0 && Math.abs(e.deltaX) === 0) {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 0) {
        e.preventDefault();
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 35;
        else if (e.deltaMode === 2) delta *= 100;
        container.scrollLeft += delta;
      }
    }
    return;
  }

  // 2. Vertical scroll intent:
  // Prevent Linux / WebKitGTK / Chromium from hijacking deltaY or latching the scroll gesture.
  // Forward vertical scroll to nearest scrollable parent container.
  const scrollParent =
    container.closest<HTMLElement>(parentSelector) ||
    document.querySelector<HTMLElement>('#page-view-scroll, [data-scroll-container]');

  if (scrollParent) {
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 35;
    else if (e.deltaMode === 2) delta *= 100;

    if (delta !== 0) {
      e.preventDefault();
      scrollParent.scrollTop += delta;
    }
  }
}

interface ScrollableElementProps<T extends HTMLElement> extends React.HTMLAttributes<T> {
  parentSelector?: string;
  children?: React.ReactNode;
}

/**
 * ScrollablePre: Reusable <pre> wrapper that enables horizontal scrolling for wide code blocks
 * while seamlessly forwarding vertical wheel events to the parent scroll container.
 */
export function ScrollablePre({
  children,
  className = '',
  parentSelector,
  ...props
}: ScrollableElementProps<HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const onWheel = (e: WheelEvent) => {
      handleScrollableWheel(e, pre, parentSelector);
    };

    pre.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      pre.removeEventListener('wheel', onWheel);
    };
  }, [parentSelector]);

  return (
    <pre
      ref={preRef}
      className={`${className} overflow-y-hidden`}
      {...props}
    >
      {children}
    </pre>
  );
}

/**
 * ScrollableDiv: Reusable <div> wrapper for horizontally scrollable elements (e.g. markdown tables)
 * that forwards vertical wheel events to the parent scroll container.
 */
export function ScrollableDiv({
  children,
  className = '',
  parentSelector,
  ...props
}: ScrollableElementProps<HTMLDivElement>) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const div = divRef.current;
    if (!div) return;

    const onWheel = (e: WheelEvent) => {
      handleScrollableWheel(e, div, parentSelector);
    };

    div.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      div.removeEventListener('wheel', onWheel);
    };
  }, [parentSelector]);

  return (
    <div
      ref={divRef}
      className={`${className} overflow-y-hidden`}
      {...props}
    >
      {children}
    </div>
  );
}
