import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { BG_COLORS } from '../../utils/colors';
import { Portal } from '../ui/Portal';

interface ColorPalettePickerProps {
  currentColor: string;
  onSelectColor: (color: string) => void;
  onClearColor: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  onClose?: () => void;
}

export default function ColorPalettePicker({
  currentColor,
  onSelectColor,
  onClearColor,
  anchorRef,
  onClose,
}: ColorPalettePickerProps) {
  const { refs, floatingStyles, isPositioned } = useFloating({
    elements: {
      reference: anchorRef?.current,
    },
    placement: 'bottom-end',
    middleware: [offset(6), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  useLayoutEffect(() => {
    if (anchorRef?.current) {
      refs.setReference(anchorRef.current);
    }
  }, [anchorRef, refs]);

  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchorRef) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        (!anchorRef.current || !anchorRef.current.contains(target))
      ) {
        onClose?.();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, anchorRef]);

  const content = (
    <div
      ref={(node) => {
        if (anchorRef) {
          refs.setFloating(node);
        }
        (pickerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={
        anchorRef
          ? {
              ...floatingStyles,
              zIndex: 9999,
              visibility: isPositioned ? 'visible' : 'hidden',
              opacity: isPositioned ? 1 : 0,
              pointerEvents: isPositioned ? 'auto' : 'none',
            }
          : undefined
      }
      className={`${
        anchorRef ? 'fixed' : 'absolute top-full right-0 mt-1'
      } bg-dark-bg/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-2 min-w-[200px] ${
        isPositioned || !anchorRef ? 'animate-scale-in' : ''
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[11px] font-medium text-dark-subtext px-1">Cor do Destaque</div>
      <div className="grid grid-cols-5 gap-1.5">
        <button
          onClick={onClearColor}
          className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs transition-all ${
            currentColor === 'default' || !currentColor
              ? 'border-white bg-white/20 text-white'
              : 'border-white/10 hover:border-white/30 text-dark-subtext hover:text-white'
          }`}
          title="Padrão"
        >
          ✕
        </button>
        {BG_COLORS.filter((c) => c.value !== 'transparent').map((c) => {
          const isSelected = currentColor === c.hex || currentColor === c.value;
          return (
            <button
              key={c.name}
              onClick={() => onSelectColor(c.hex)}
              className={`w-7 h-7 rounded-lg border border-white/15 transition-transform hover:scale-110 flex items-center justify-center ${
                isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-dark-bg scale-105' : ''
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          );
        })}
      </div>
    </div>
  );

  if (anchorRef) {
    return <Portal>{content}</Portal>;
  }

  return content;
}

