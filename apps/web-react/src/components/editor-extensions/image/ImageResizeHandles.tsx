import React from 'react';
import type { ResizeHandle } from './useImageResize';

interface ImageResizeHandlesProps {
  showChrome: boolean;
  isResizing: boolean;
  displayWidth: number | null;
  displayHeight: number | null;
  onStartResize: (event: React.PointerEvent, handle: ResizeHandle) => void;
  onResetSize: () => void;
}

const HANDLES: Array<{ handle: ResizeHandle; className: string; cursor: string }> = [
  { handle: 'se', className: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
];

const EDGE_HANDLES: Array<{ handle: ResizeHandle; className: string; cursor: string }> = [
  { handle: 'w', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-8', cursor: 'ew-resize' },
  { handle: 'e', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-1.5 h-8', cursor: 'ew-resize' },
];

export default function ImageResizeHandles({
  showChrome,
  isResizing,
  displayWidth,
  displayHeight,
  onStartResize,
  onResetSize,
}: ImageResizeHandlesProps) {
  if (!showChrome) return null;

  return (
    <>
      {HANDLES.map(({ handle, className, cursor }) => (
        <div
          key={handle}
          contentEditable={false}
          style={{ cursor }}
          className={`absolute z-20 h-3 w-3 rounded-full border border-white bg-brand-500 shadow-sm ${className}`}
          onPointerDown={(event) => onStartResize(event, handle)}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onResetSize();
          }}
        />
      ))}
      {EDGE_HANDLES.map(({ handle, className, cursor }) => (
        <div
          key={handle}
          contentEditable={false}
          style={{ cursor }}
          className={`absolute z-20 rounded-sm border border-white bg-brand-500 shadow-sm ${className}`}
          onPointerDown={(event) => onStartResize(event, handle)}
        />
      ))}

      {/* Indicador numérico de dimensões durante o redimensionamento */}
      {isResizing && displayWidth && (
        <div
          contentEditable={false}
          className="pointer-events-none absolute bottom-2 right-2 z-30 rounded-md bg-dark-bg/90 px-2 py-1 font-mono text-[11px] text-white shadow-lg backdrop-blur-xl"
        >
          {Math.round(displayWidth)}
          {displayHeight ? ` × ${Math.round(displayHeight)}` : ''} px
        </div>
      )}
    </>
  );
}
