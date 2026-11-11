import { useEffect, useRef, useState } from 'react';
import { TEXT_COLORS, BG_COLORS } from '../../../../utils/colors';

export const CELL_BG_COLORS = [
  { name: 'Sem Cor', value: 'transparent', hex: 'transparent' },
  { name: 'Vermelho', value: 'rgba(239, 68, 68, 0.2)', hex: '#EF4444' },
  { name: 'Laranja', value: 'rgba(249, 115, 22, 0.2)', hex: '#F97316' },
  { name: 'Amarelo', value: 'rgba(234, 179, 8, 0.2)', hex: '#EAB308' },
  { name: 'Verde', value: 'rgba(34, 197, 94, 0.2)', hex: '#22C55E' },
  { name: 'Azul', value: 'rgba(59, 130, 246, 0.2)', hex: '#3B82F6' },
  { name: 'Roxo', value: 'rgba(139, 92, 246, 0.2)', hex: '#8B5CF6' },
  { name: 'Rosa', value: 'rgba(236, 72, 153, 0.2)', hex: '#EC4899' },
];

export type ColorPopoverMode = 'textColor' | 'highlight' | 'cellBg';

interface TableColorPopoverProps {
  mode: ColorPopoverMode;
  onSelectColor: (color: string) => void;
  onClose: () => void;
}

export default function TableColorPopover({ mode, onSelectColor, onClose }: TableColorPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');

  useEffect(() => {
    if (popoverRef.current) {
      const rect = popoverRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 20) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    }
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  const positionClass = placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2';

  if (mode === 'textColor') {
    return (
      <div
        ref={popoverRef}
        className={`absolute ${positionClass} left-1/2 -translate-x-1/2 bg-dark-card/98 backdrop-blur-xl border border-white/20 rounded-xl p-2.5 shadow-2xl z-[200] flex flex-col gap-2 min-w-[210px] animate-scale-in pointer-events-auto`}
      >
        <span className="text-[11px] font-semibold text-dark-subtext uppercase tracking-wider px-1">
          Cor do Texto
        </span>
        <div className="grid grid-cols-5 gap-1.5">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                onSelectColor(c.value);
                onClose();
              }}
              className="w-7 h-7 rounded-lg border border-white/10 hover:scale-110 hover:border-brand-500 transition-all flex items-center justify-center relative group"
              style={{ backgroundColor: c.value === 'inherit' ? '#2a2a35' : c.hex }}
              title={c.name}
            >
              {c.value === 'inherit' && (
                <span className="text-[10px] font-bold text-white">A</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'highlight') {
    return (
      <div
        ref={popoverRef}
        className={`absolute ${positionClass} left-1/2 -translate-x-1/2 bg-dark-card/98 backdrop-blur-xl border border-white/20 rounded-xl p-2.5 shadow-2xl z-[200] flex flex-col gap-2 min-w-[210px] animate-scale-in pointer-events-auto`}
      >
        <span className="text-[11px] font-semibold text-dark-subtext uppercase tracking-wider px-1">
          Destaque do Texto
        </span>
        <div className="grid grid-cols-5 gap-1.5">
          {BG_COLORS.filter((c) => c.value !== 'transparent').map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => {
                onSelectColor(color.hex);
                onClose();
              }}
              className="w-7 h-7 rounded-lg border border-white/10 hover:scale-110 hover:border-brand-500 transition-all flex items-center justify-center"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              onSelectColor('');
              onClose();
            }}
            className="w-7 h-7 rounded-lg border border-white/10 hover:scale-110 hover:border-red-500 transition-all bg-transparent flex items-center justify-center text-white/50 hover:text-white"
            title="Remover Destaque"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // mode === 'cellBg'
  return (
    <div
      ref={popoverRef}
      className={`absolute ${positionClass} left-1/2 -translate-x-1/2 bg-dark-card/98 backdrop-blur-xl border border-white/20 rounded-xl p-2.5 shadow-2xl z-[200] flex flex-col gap-2 min-w-[210px] animate-scale-in pointer-events-auto`}
    >
      <span className="text-[11px] font-semibold text-dark-subtext uppercase tracking-wider px-1">
        Cor da Célula / Linha / Coluna
      </span>
      <div className="grid grid-cols-4 gap-1.5">
        {CELL_BG_COLORS.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => {
              onSelectColor(c.value);
              onClose();
            }}
            className="h-7 rounded-lg border border-white/10 hover:scale-105 hover:border-brand-500 transition-all flex items-center justify-center relative overflow-hidden"
            style={{ backgroundColor: c.value === 'transparent' ? '#2a2a35' : c.value }}
            title={c.name}
          >
            {c.value === 'transparent' ? (
              <span className="text-[10px] text-dark-subtext">Sem cor</span>
            ) : (
              <div className="w-2.5 h-2.5 rounded-full border border-black/30" style={{ backgroundColor: c.hex }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
