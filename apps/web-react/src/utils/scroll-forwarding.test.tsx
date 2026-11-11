import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { handleScrollableWheel, ScrollablePre, ScrollableDiv } from './scroll-forwarding';

describe('scroll-forwarding utility', () => {
  let parentContainer: HTMLDivElement;
  let childElement: HTMLPreElement;

  beforeEach(() => {
    parentContainer = document.createElement('div');
    parentContainer.className = 'overflow-y-auto';
    parentContainer.scrollTop = 50;

    childElement = document.createElement('pre');
    parentContainer.appendChild(childElement);
    document.body.appendChild(parentContainer);
  });

  it('forwards vertical scroll events to nearest scroll parent and prevents default', () => {
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 100,
      deltaX: 0,
      bubbles: true,
      cancelable: true,
    });

    handleScrollableWheel(wheelEvent, childElement);

    expect(parentContainer.scrollTop).toBe(150);
    expect(wheelEvent.defaultPrevented).toBe(true);
  });

  it('accounts for deltaMode line scrolling (deltaMode = 1)', () => {
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 2,
      deltaMode: 1, // Lines
      cancelable: true,
    });

    handleScrollableWheel(wheelEvent, childElement);

    // 50 + (2 * 35) = 120
    expect(parentContainer.scrollTop).toBe(120);
    expect(wheelEvent.defaultPrevented).toBe(true);
  });

  it('translates Shift + vertical wheel into horizontal scroll on overflowing container', () => {
    Object.defineProperty(childElement, 'scrollWidth', { value: 500, configurable: true });
    Object.defineProperty(childElement, 'clientWidth', { value: 200, configurable: true });
    childElement.scrollLeft = 10;

    const shiftWheelEvent = new WheelEvent('wheel', {
      deltaY: 40,
      deltaX: 0,
      shiftKey: true,
      cancelable: true,
    });

    handleScrollableWheel(shiftWheelEvent, childElement);

    expect(childElement.scrollLeft).toBe(50);
    expect(shiftWheelEvent.defaultPrevented).toBe(true);
    // Parent should NOT scroll
    expect(parentContainer.scrollTop).toBe(50);
  });

  it('allows natural horizontal swipe gestures (|deltaX| > |deltaY|) without preventDefault', () => {
    const horizontalEvent = new WheelEvent('wheel', {
      deltaX: 50,
      deltaY: 10,
      cancelable: true,
    });

    handleScrollableWheel(horizontalEvent, childElement);

    expect(horizontalEvent.defaultPrevented).toBe(false);
    expect(parentContainer.scrollTop).toBe(50);
  });

  it('ScrollablePre renders with overflow-y-hidden and forwards scroll', () => {
    const { container } = render(
      <div className="overflow-y-auto" style={{ height: '300px' }}>
        <ScrollablePre data-testid="test-pre">
          <code>const code = true;</code>
        </ScrollablePre>
      </div>
    );

    const pre = container.querySelector('pre');
    expect(pre).toBeDefined();
    expect(pre?.className).toContain('overflow-y-hidden');

    const parent = container.firstChild as HTMLDivElement;
    parent.scrollTop = 20;

    const event = new WheelEvent('wheel', {
      deltaY: 80,
      deltaX: 0,
      bubbles: true,
      cancelable: true,
    });

    pre?.dispatchEvent(event);
    expect(parent.scrollTop).toBe(100);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ScrollableDiv renders with overflow-y-hidden and forwards scroll for tables', () => {
    const { container } = render(
      <div className="overflow-y-auto" style={{ height: '300px' }}>
        <ScrollableDiv data-testid="test-div">
          <table><tbody><tr><td>Cell</td></tr></tbody></table>
        </ScrollableDiv>
      </div>
    );

    const div = container.querySelector('div[data-testid="test-div"]');
    expect(div).toBeDefined();
    expect(div?.className).toContain('overflow-y-hidden');

    const parent = container.firstChild as HTMLDivElement;
    parent.scrollTop = 10;

    const event = new WheelEvent('wheel', {
      deltaY: 50,
      deltaX: 0,
      bubbles: true,
      cancelable: true,
    });

    div?.dispatchEvent(event);
    expect(parent.scrollTop).toBe(60);
    expect(event.defaultPrevented).toBe(true);
  });
});
