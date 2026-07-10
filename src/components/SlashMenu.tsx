import { Heading1, Heading2, Heading3, CheckSquare, List, Info, Type, Minus, Code, FileText, Folder, Table, HelpCircle, Sparkles, ListTree } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const SLASH_COMMANDS = [
  { id: 'text', title: 'Texto', subtitle: 'Comece a escrever com texto normal.', icon: Type },
  { id: 'h1', title: 'Título 1', subtitle: 'Título de seção grande.', icon: Heading1 },
  { id: 'h2', title: 'Título 2', subtitle: 'Título de seção médio.', icon: Heading2 },
  { id: 'h3', title: 'Título 3', subtitle: 'Título de seção pequeno.', icon: Heading3 },
  { id: 'todo', title: 'Lista de tarefas', subtitle: 'Acompanhe tarefas com checkboxes.', icon: CheckSquare },
  { id: 'bullet', title: 'Lista de marcadores', subtitle: 'Crie uma lista simples com bolinhas.', icon: List },
  { id: 'callout', title: 'Destaque', subtitle: 'Faça um texto se destacar.', icon: Info },
  { id: 'code', title: 'Código', subtitle: 'Adicione um bloco de código de programação.', icon: Code },
  { id: 'page', title: 'Página', subtitle: 'Embutir uma página existente.', icon: FileText },
  { id: 'group', title: 'Coleção', subtitle: 'Agrupe páginas em uma coleção expansível.', icon: Folder },
  { id: 'toggle', title: 'Lista Oculta', subtitle: 'Lista que pode ser recolhida.', icon: ListTree },
  { id: 'blockquoteToggle', title: 'Toggle Destaque', subtitle: 'Toggle com visual de destaque (Callout).', icon: Info },
  { id: 'table', title: 'Tabela', subtitle: 'Adicione uma tabela estruturada.', icon: Table },
  { id: 'table-week', title: 'Tabela: Semana', subtitle: 'Tabela 7 colunas (Dias da semana).', icon: Table },
  { id: 'table-day', title: 'Tabela: Dia', subtitle: 'Tabela de horários diários.', icon: Table },
  { id: 'table-habit', title: 'Tabela: Hábitos', subtitle: 'Matriz para rastreio de hábitos.', icon: Table },
  { id: 'question', title: 'Questão', subtitle: 'Crie uma questão de múltipla escolha com IA.', icon: HelpCircle },
  { id: 'ia', title: 'Pedir à IA', subtitle: 'Peça para a IA escrever qualquer coisa.', icon: Sparkles },
  { id: 'divider', title: 'Divisor', subtitle: 'Separe blocos visualmente.', icon: Minus },
];

interface SlashMenuProps {
  x: number;
  y: number;
  query: string;
  onSelect: (commandId: string) => void;
  onClose: () => void;
}

export default function SlashMenu({ x, y, query, onSelect, onClose }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = SLASH_COMMANDS.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) || 
    cmd.id.includes(query.toLowerCase())
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
  const MENU_MAX_HEIGHT = 320;
  const CURSOR_OFFSET = 24; // A distância do top do cursor definida em Editor.tsx
  
  const willOverflowBottom = y + MENU_MAX_HEIGHT > viewportHeight;
  
  const positionStyle: React.CSSProperties = {
    left: x,
    maxHeight: MENU_MAX_HEIGHT
  };

  if (willOverflowBottom) {
    // Menu ancora na parte inferior (cresce para cima), ficando acima do cursor
    positionStyle.bottom = viewportHeight - (y - CURSOR_OFFSET);
  } else {
    // Menu ancora no topo (cresce para baixo)
    positionStyle.top = y;
  }

  if (filteredCommands.length === 0) {
    return (
      <div 
        ref={menuRef}
        className="fixed z-50 w-72 bg-dark-bg border border-white/10 rounded-lg shadow-xl overflow-hidden p-3 text-dark-subtext text-sm text-center"
        style={positionStyle}
      >
        Nenhum bloco encontrado
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 bg-dark-bg border border-white/10 rounded-lg shadow-xl overflow-hidden animate-fade-in flex flex-col"
      style={positionStyle}
    >
      <div className="px-3 py-2 text-xs font-semibold text-dark-subtext uppercase tracking-wider bg-dark-card/50 border-b border-white/5">
        Blocos Básicos
      </div>
      <div className="overflow-y-auto custom-scrollbar p-1">
        {filteredCommands.map((cmd, index) => {
          const Icon = cmd.icon;
          const isSelected = index === selectedIndex;
          
          return (
            <button
              key={cmd.id}
              onClick={() => onSelect(cmd.id)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-dark-text">
                <Icon size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-dark-text">{cmd.title}</span>
                <span className="text-xs text-dark-subtext">{cmd.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
