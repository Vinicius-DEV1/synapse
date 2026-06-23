import { Bold, Italic, Underline, Palette, Strikethrough, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TEXT_COLORS, BG_COLORS } from '../utils/colors';

interface FloatingToolbarProps {
  x: number;
  y: number;
  onAiClick?: () => void;
}

export default function FloatingToolbar({ x, y, onAiClick }: FloatingToolbarProps) {
  const [showColors, setShowColors] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setShowColors(false);
      }
    };
    if (showColors) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColors]);

  const handleFormat = (command: string) => {
    document.execCommand(command);
  };

  const handleColor = (type: 'foreColor' | 'backColor', value: string) => {
    document.execCommand(type, false, value);
    setShowColors(false);
  };

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 px-1.5 py-1 bg-dark-card/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl shadow-black/40 animate-scale-in"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -100%)',
      }}
      onMouseDown={(e) => {
        // Only prevent default if we are not clicking a color button (to keep selection)
        // Actually we should prevent default to keep text selected, but React's onClick still fires.
        e.preventDefault();
      }}
    >
      <button
        onClick={() => handleFormat('bold')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-all active:scale-90"
        title="Negrito (Ctrl+B)"
      >
        <Bold size={15} />
      </button>
      <button
        onClick={() => handleFormat('italic')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-all active:scale-90"
        title="Itálico (Ctrl+I)"
      >
        <Italic size={15} />
      </button>
      <button
        onClick={() => handleFormat('underline')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-all active:scale-90"
        title="Sublinhado (Ctrl+U)"
      >
        <Underline size={15} />
      </button>
      <button
        onClick={() => handleFormat('strikeThrough')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-all active:scale-90"
        title="Riscar"
      >
        <Strikethrough size={15} />
      </button>

      {onAiClick && (
        <button
          onClick={onAiClick}
          className="p-1.5 rounded-lg hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-all active:scale-90 ml-1 group"
          title="Assistente IA"
        >
          <Sparkles size={15} className="group-hover:animate-pulse text-brand-400" />
        </button>
      )}

      <div className="w-px h-4 bg-white/10 mx-1" />

      <div className="relative" ref={colorMenuRef}>
        <button
          onClick={() => setShowColors(!showColors)}
          className={`p-1.5 rounded-lg transition-all active:scale-90 ${showColors ? 'bg-white/10 text-brand-400' : 'text-dark-subtext hover:bg-white/10 hover:text-brand-400'}`}
          title="Cor do Texto e Fundo"
        >
          <Palette size={15} />
        </button>

        {showColors && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-dark-bg border border-white/10 rounded-lg shadow-xl overflow-hidden animate-fade-in p-3 cursor-default">
            <div className="text-[10px] font-bold text-dark-subtext mb-2 px-1 uppercase tracking-wider">Cor do Texto</div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {TEXT_COLORS.map(c => (
                <button
                  key={c.name}
                  onClick={() => handleColor('foreColor', c.hex === 'transparent' ? '#fff' : c.hex)}
                  className="w-6 h-6 rounded-full border border-white/10 hover:scale-110 transition-transform flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: c.value === 'inherit' ? '#333' : c.hex, color: '#fff' }}
                  title={c.name}
                >
                  {c.value === 'inherit' ? 'A' : ''}
                </button>
              ))}
            </div>
            
            <div className="text-[10px] font-bold text-dark-subtext mb-2 px-1 uppercase tracking-wider">Cor de Fundo</div>
            <div className="grid grid-cols-5 gap-2">
              {BG_COLORS.map(c => (
                <button
                  key={c.name}
                  onClick={() => handleColor('backColor', c.value)}
                  className="w-6 h-6 rounded border border-white/10 hover:scale-110 transition-transform flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: c.value === 'transparent' ? '#333' : c.value, color: c.hex === 'transparent' ? '#fff' : c.hex }}
                  title={c.name}
                >
                  A
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
