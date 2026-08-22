import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageResize } from './useImageResize';

describe('useImageResize Hook', () => {
  let imgRef: any;
  let boundsRef: any;
  let onCommit: any;
  let onStart: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockImg = document.createElement('img');
    mockImg.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 400,
      height: 300,
    });
    Object.defineProperty(mockImg, 'naturalWidth', { value: 800 });
    Object.defineProperty(mockImg, 'naturalHeight', { value: 600 });

    const parentContainer = document.createElement('div');
    parentContainer.className = 'ProseMirror';
    Object.defineProperty(parentContainer, 'clientWidth', { value: 700 });

    const mockContainer = document.createElement('div');
    parentContainer.appendChild(mockContainer);

    imgRef = { current: mockImg };
    boundsRef = { current: mockContainer };
    onCommit = vi.fn();
    onStart = vi.fn();
  });

  it('initializes with current width and height and isResizing false', () => {
    const { result } = renderHook(() =>
      useImageResize({
        imgRef,
        boundsRef,
        width: 350,
        height: 250,
        onCommit,
        onStart,
        enabled: true,
      })
    );

    expect(result.current.isResizing).toBe(false);
    expect(result.current.displayWidth).toBe(350);
    expect(result.current.displayHeight).toBe(250);
  });

  it('resets image size to natural aspect ratio with resetSize()', () => {
    const { result } = renderHook(() =>
      useImageResize({
        imgRef,
        boundsRef,
        width: 350,
        height: 250,
        onCommit,
        onStart,
        enabled: true,
      })
    );

    act(() => {
      result.current.resetSize();
    });

    expect(onCommit).toHaveBeenCalledWith({ width: null, height: null });
  });

  it('fits image to container width with fitToWidth()', () => {
    const { result } = renderHook(() =>
      useImageResize({
        imgRef,
        boundsRef,
        width: 350,
        height: 250,
        onCommit,
        onStart,
        enabled: true,
      })
    );

    act(() => {
      result.current.fitToWidth();
    });

    expect(onCommit).toHaveBeenCalledWith({
      width: 700,
      height: null,
    });
  });
});
