import { Bold, Italic, Underline, Palette, Strikethrough, Sparkles, Code } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TEXT_COLORS, BG_COLORS } from '../utils/colors';

interface FloatingToolbarProps {
  formatState?: {
    bold: boolean;
    italic: boolean;
    strike: boolean;
    code: boolean;
    highlight: boolean;
  };
  onFormat?: (command: string, value?: string) => void;
  onAiClick?: () => void;
}

export default function FloatingToolbar({ formatState, onFormat, onAiClick }: FloatingToolbarProps) {
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColors]);

  const handleFormat = (command: string, value?: string) => {
    if (onFormat) {
      onFormat(command, value);
    } else {
      document.execCommand(command, false, value);
    }
  };

  const activeClass = "bg-white/10 text-brand-400";
  const inactiveClass = "text-dark-subtext hover:bg-white/10 hover:text-brand-400";

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-dark-bg/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-fade-in-up">
      <button
        onClick={() => handleFormat('bold')}
        className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.bold ? activeClass : inactiveClass}`}
        title="Negrito (Ctrl+B)"
      >
        <Bold size={15} />
      </button>
      <button
        onClick={() => handleFormat('italic')}
        className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.italic ? activeClass : inactiveClass}`}
        title="Itálico (Ctrl+I)"
      >
        <Italic size={15} />
      </button>
      <button
        onClick={() => handleFormat('strike')}
        className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.strike ? activeClass : inactiveClass}`}
        title="Riscar"
      >
        <Strikethrough size={15} />
      </button>
      <button
        onClick={() => handleFormat('code')}
        className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.code ? activeClass : inactiveClass}`}
        title="Código"
      >
        <Code size={15} />
      </button>
      <button
        onClick={() => handleFormat('highlight')}
        className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.highlight ? activeClass : inactiveClass}`}
        title="Destaque"
      >
        <Palette size={15} />
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
    </div>
  );
}
