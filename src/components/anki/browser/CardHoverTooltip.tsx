import { createPortal } from 'react-dom';
import { HtmlRenderer } from '../components/HtmlRenderer';

export interface CardHoverState {
  id: string;
  type: 'front' | 'back';
  content: string;
  x: number;
  y: number;
}

interface CardHoverTooltipProps {
  hoverState: CardHoverState | null;
}

export function CardHoverTooltip({ hoverState }: CardHoverTooltipProps) {
  if (!hoverState || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed z-[9999] bg-dark-card border border-indigo-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-xl p-5 max-w-md w-max pointer-events-none animate-fade-in"
      style={{
        left: Math.min(hoverState.x + 15, window.innerWidth - 450),
        top: Math.min(hoverState.y + 15, window.innerHeight - 200),
      }}
    >
      <div className="text-[10px] text-indigo-400 font-bold mb-2 uppercase tracking-widest">
        {hoverState.type === 'front' ? 'Frente Completa' : 'Verso Completo'}
      </div>
      <HtmlRenderer
        html={hoverState.content}
        className="text-sm text-white leading-relaxed whitespace-pre-wrap block"
        as="div"
      />
    </div>,
    document.body
  );
}
