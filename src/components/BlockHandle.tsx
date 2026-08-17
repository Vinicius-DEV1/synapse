import { GripVertical, Trash2, Palette } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TEXT_COLORS, BG_COLORS } from '../utils/colors';

interface BlockHandleProps {
  x: number;
  y: number;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onChangeColor?: (color: string, isBackground: boolean) => void;
  /** Avisa quem posiciona a alça que ela não pode sumir agora. */
  onMenuOpenChange?: (open: boolean) => void;
}

export default function BlockHandle({ x, y, onDelete, onDragStart, onDragEnd, onChangeColor, onMenuOpenChange }: BlockHandleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showColorSubmenu, setShowColorSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Enquanto o menu está aberto a alça precisa ficar ancorada: o menu fica
  // deslocado alguns pixels para o lado e, ao atravessar essa fresta, o ponteiro
  // passa sobre o editor — o que fazia a alça (e o menu junto) desaparecer antes
  // de dar tempo de clicar em qualquer coisa.
  useEffect(() => {
    onMenuOpenChange?.(isOpen);
  }, [isOpen, onMenuOpenChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowColorSubmenu(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div 
      className="block-handle fixed z-40 flex items-center justify-center cursor-pointer text-dark-subtext/30 hover:text-dark-subtext transition-colors"
      style={{ left: x, top: y }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-0.5 rounded hover:bg-white/10"
        title="Opções do bloco (Arraste para mover)"
      >
        <GripVertical size={18} />
      </div>

      {isOpen && (
        <div 
          ref={menuRef}
          className="absolute left-full top-0 ml-1 w-48 bg-dark-bg border border-white/10 rounded-lg shadow-xl overflow-hidden animate-fade-in"
        >
          {!showColorSubmenu ? (
            <div className="py-1">
              {/* Só aparece se houver de fato quem aplique a cor. O app não
                  registra as extensões TextStyle/Color, então enquanto ninguém
                  passar `onChangeColor` este botão abriria uma paleta sem
                  efeito nenhum. */}
              {onChangeColor && (
                <>
                  <button
                    onClick={() => setShowColorSubmenu(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-text hover:bg-white/5 transition-colors text-left"
                  >
                    <Palette size={14} />
                    Cor do bloco
                  </button>

                  <div className="h-px bg-white/10 my-1 mx-2" />
                </>
              )}

              <button
                onClick={() => {
                  onDelete();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors text-left"
              >
                <Trash2 size={14} />
                Excluir bloco
              </button>
            </div>
          ) : (
            <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar">
              <button 
                onClick={() => setShowColorSubmenu(false)}
                className="text-xs text-brand-400 mb-2 hover:underline"
              >
                &larr; Voltar
              </button>
              
              <div className="text-[10px] font-bold text-dark-subtext mb-2 px-1 uppercase tracking-wider">Cor do Texto</div>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {TEXT_COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => {
                      onChangeColor?.(c.value, false);
                      setIsOpen(false);
                      setShowColorSubmenu(false);
                    }}
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
                    onClick={() => {
                      onChangeColor?.(c.value, true);
                      setIsOpen(false);
                      setShowColorSubmenu(false);
                    }}
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
      )}
    </div>
  );
}
