interface TableDropIndicatorProps {
  dropIndicatorColLeft: number | null;
  dropIndicatorRowTop: number | null;
  cornerPosition: { left: number; top: number } | null;
  tableBounds: { width: number; height: number };
}

/**
 * Visual indicator line rendered when dragging columns or rows in a table.
 */
export default function TableDropIndicator({
  dropIndicatorColLeft,
  dropIndicatorRowTop,
  cornerPosition,
  tableBounds,
}: TableDropIndicatorProps) {
  return (
    <>
      {dropIndicatorColLeft !== null && (
        <div
          className="pointer-events-none absolute w-[2px] bg-brand-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.9)] z-30 transition-all duration-75"
          style={{
            left: `${dropIndicatorColLeft - 1}px`,
            top: cornerPosition ? `${cornerPosition.top}px` : '0px',
            height: `${tableBounds.height + 24}px`,
          }}
        />
      )}

      {dropIndicatorRowTop !== null && (
        <div
          className="pointer-events-none absolute h-[2px] bg-brand-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.9)] z-30 transition-all duration-75"
          style={{
            left: cornerPosition ? `${cornerPosition.left}px` : '0px',
            top: `${dropIndicatorRowTop - 1}px`,
            width: `${tableBounds.width + 24}px`,
          }}
        />
      )}
    </>
  );
}
