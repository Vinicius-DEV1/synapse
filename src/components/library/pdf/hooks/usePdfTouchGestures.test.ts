import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePdfTouchGestures } from './usePdfTouchGestures';

describe('usePdfTouchGestures', () => {
  let mockContainer: HTMLDivElement;
  let mockContent: HTMLDivElement;
  let scrollRef: { current: HTMLDivElement | null };
  let contentRef: { current: HTMLDivElement | null };

  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockContent = document.createElement('div');
    Object.defineProperty(mockContainer, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(mockContainer, 'clientHeight', { value: 600, configurable: true });
    mockContainer.scrollLeft = 0;
    mockContainer.scrollTop = 0;
    mockContainer.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 600,
    });
    scrollRef = { current: mockContainer };
    contentRef = { current: mockContent };
  });

  it('initializes with isPinching as false', () => {
    const setZoom = vi.fn();
    const { result } = renderHook(() =>
      usePdfTouchGestures({
        scrollRef,
        contentRef,
        zoom: 1.0,
        setZoom,
      })
    );

    expect(result.current.isPinching).toBe(false);
  });

  it('activates pinch mode on two-finger touchstart and sets GPU transform hints', () => {
    const setZoom = vi.fn();
    const { result } = renderHook(() =>
      usePdfTouchGestures({
        scrollRef,
        contentRef,
        zoom: 1.0,
        setZoom,
      })
    );

    const touch1 = { clientX: 100, clientY: 200 } as Touch;
    const touch2 = { clientX: 200, clientY: 200 } as Touch;

    const event = new TouchEvent('touchstart', {
      touches: [touch1, touch2],
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    act(() => {
      mockContainer.dispatchEvent(event);
    });

    expect(result.current.isPinching).toBe(true);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(mockContent.style.willChange).toBe('transform');
    expect(mockContent.style.transformOrigin).toBe('150px 200px');
  });

  it('updates GPU transform via RAF during touchmove without updating React zoom state directly', () => {
    const setZoom = vi.fn();
    let rafCallback: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    renderHook(() =>
      usePdfTouchGestures({
        scrollRef,
        contentRef,
        zoom: 1.0,
        setZoom,
      })
    );

    // Initial distance: 100px (100 to 200)
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [
            { clientX: 100, clientY: 200 } as Touch,
            { clientX: 200, clientY: 200 } as Touch,
          ],
          cancelable: true,
        })
      );
    });

    // Move apart to 150px (75 to 225)
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [
            { clientX: 75, clientY: 200 } as Touch,
            { clientX: 225, clientY: 200 } as Touch,
          ],
          cancelable: true,
        })
      );
    });

    // During active gesture: zero React setZoom calls to avoid canvas cancellation
    expect(setZoom).not.toHaveBeenCalled();

    // Trigger RAF frame
    act(() => {
      if (rafCallback) rafCallback(performance.now());
    });

    expect(mockContent.style.transform).toContain('scale(1.5)');
  });

  it('commits final zoom and restores transform on touchend', () => {
    const setZoom = vi.fn();
    const { result, rerender } = renderHook(
      ({ zoom }) =>
        usePdfTouchGestures({
          scrollRef,
          contentRef,
          zoom,
          setZoom,
          minZoom: 0.5,
          maxZoom: 3.0,
        }),
      { initialProps: { zoom: 1.0 } }
    );

    // Start gesture
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [
            { clientX: 100, clientY: 200 } as Touch,
            { clientX: 200, clientY: 200 } as Touch,
          ],
          cancelable: true,
        })
      );
    });

    // Move to 150px (scale 1.5x)
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [
            { clientX: 75, clientY: 200 } as Touch,
            { clientX: 225, clientY: 200 } as Touch,
          ],
          cancelable: true,
        })
      );
    });

    // End gesture
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchend', {
          touches: [],
        })
      );
    });

    expect(result.current.isPinching).toBe(false);
    expect(setZoom).toHaveBeenCalledWith(1.5);

    // Simulating React updating zoom prop -> useLayoutEffect clears transform and applies scroll
    act(() => {
      rerender({ zoom: 1.5 });
    });

    expect(mockContent.style.transform).toBe('');
    expect(mockContent.style.willChange).toBe('');
  });

  it('clamps target zoom between minZoom and maxZoom limits on touchend', () => {
    const setZoom = vi.fn();
    renderHook(() =>
      usePdfTouchGestures({
        scrollRef,
        contentRef,
        zoom: 1.0,
        setZoom,
        minZoom: 0.5,
        maxZoom: 2.0,
      })
    );

    // Start with 100px dist
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [
            { clientX: 100, clientY: 100 } as Touch,
            { clientX: 200, clientY: 100 } as Touch,
          ],
          cancelable: true,
        })
      );
    });

    // Move to 500px dist (raw 5x -> should clamp to 2.0)
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [
            { clientX: 0, clientY: 100 } as Touch,
            { clientX: 500, clientY: 100 } as Touch,
          ],
          cancelable: true,
        })
      );
    });

    // End gesture
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchend', {
          touches: [],
        })
      );
    });

    expect(setZoom).toHaveBeenCalledWith(2.0);
  });

  it('triggers onDoubleTap callback on two rapid single-finger taps', () => {
    const setZoom = vi.fn();
    const onDoubleTap = vi.fn();

    renderHook(() =>
      usePdfTouchGestures({
        scrollRef,
        contentRef,
        zoom: 1.0,
        setZoom,
        onDoubleTap,
      })
    );

    const dateNowSpy = vi.spyOn(Date, 'now');
    dateNowSpy.mockReturnValue(1000);

    // Tap 1
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [{ clientX: 150, clientY: 150 } as Touch],
        })
      );
    });

    // Tap 2 at 1150ms (150ms diff)
    dateNowSpy.mockReturnValue(1150);
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [{ clientX: 152, clientY: 151 } as Touch],
        })
      );
    });

    expect(onDoubleTap).toHaveBeenCalledWith(152, 151);
    dateNowSpy.mockRestore();
  });

  it('triggers default double-tap toggle when no onDoubleTap provided', () => {
    const setZoom = vi.fn();

    renderHook(() =>
      usePdfTouchGestures({
        scrollRef,
        contentRef,
        zoom: 1.0,
        setZoom,
      })
    );

    const dateNowSpy = vi.spyOn(Date, 'now');
    dateNowSpy.mockReturnValue(1000);

    // Tap 1
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [{ clientX: 200, clientY: 300 } as Touch],
        })
      );
    });

    // Tap 2
    dateNowSpy.mockReturnValue(1150);
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [{ clientX: 200, clientY: 300 } as Touch],
        })
      );
    });

    // When zoom <= 1.15, double-tap toggles to 1.85
    expect(setZoom).toHaveBeenCalledWith(1.85);
    dateNowSpy.mockRestore();
  });

  it('prevents default on touchmove while trailing finger is lifting to protect scroll position', () => {
    const setZoom = vi.fn();

    renderHook(() =>
      usePdfTouchGestures({
        scrollRef,
        contentRef,
        zoom: 1.0,
        setZoom,
      })
    );

    // Start 2-finger pinch
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [
            { clientX: 100, clientY: 200 } as Touch,
            { clientX: 200, clientY: 200 } as Touch,
          ],
          cancelable: true,
        })
      );
    });

    // One finger lifts first (touches.length === 1) -> pinch ends, trailing protection engaged
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchend', {
          touches: [{ clientX: 100, clientY: 200 } as Touch],
        })
      );
    });

    // Trailing finger moves slightly while lifting
    const trailingMoveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 105, clientY: 200 } as Touch],
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(trailingMoveEvent, 'preventDefault');

    act(() => {
      mockContainer.dispatchEvent(trailingMoveEvent);
    });

    // Must preventDefault to block native scroll hijacking
    expect(preventDefaultSpy).toHaveBeenCalled();

    // Final finger lifts (touches.length === 0)
    act(() => {
      mockContainer.dispatchEvent(
        new TouchEvent('touchend', {
          touches: [],
        })
      );
    });
  });
});
