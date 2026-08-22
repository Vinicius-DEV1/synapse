import { Heading1, Heading2, Heading3, CheckSquare, List, Info, Type, Minus, Code, FileText, Folder, Table, HelpCircle, Sparkles, ListTree, Clock, FileArchive, Link, Calendar, Film, BookOpen, Columns2, Columns3, FilePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const SLASH_COMMANDS = [
  { id: 'text', title: 'Texto', subtitle: 'Comece a escrever com texto normal.', icon: Type, keywords: ['texto', 'paragrafo', 'p'] },
  { id: 'h1', title: 'Título 1', subtitle: 'Título de seção grande.', icon: Heading1, keywords: ['h1', 'titulo 1', 'header 1'] },
  { id: 'h2', title: 'Título 2', subtitle: 'Título de seção médio.', icon: Heading2, keywords: ['h2', 'titulo 2', 'header 2'] },
  { id: 'h3', title: 'Título 3', subtitle: 'Título de seção pequeno.', icon: Heading3, keywords: ['h3', 'titulo 3', 'header 3'] },
  { id: 'cols2', title: '2 Colunas', subtitle: 'Dividir o conteúdo em 2 colunas de texto.', icon: Columns2, keywords: ['2colunas', '2coluna', 'cols2', '2cols', 'colunas', 'coluna', 'duas colunas', '2 colunas', '2'] },
  { id: 'cols3', title: '3 Colunas', subtitle: 'Dividir o conteúdo em 3 colunas de texto.', icon: Columns3, keywords: ['3colunas', '3coluna', 'cols3', '3cols', 'tres colunas', '3 colunas', '3'] },
  { id: 'todo', title: 'Lista de tarefas', subtitle: 'Acompanhe tarefas com checkboxes.', icon: CheckSquare, keywords: ['todo', 'tarefa', 'check'] },
  { id: 'bullet', title: 'Lista de marcadores', subtitle: 'Crie uma lista simples com bolinhas.', icon: List, keywords: ['bullet', 'lista', 'pontos'] },
  { id: 'callout', title: 'Destaque', subtitle: 'Faça um texto se destacar.', icon: Info, keywords: ['callout', 'destaque', 'aviso'] },
  { id: 'code', title: 'Código', subtitle: 'Adicione um bloco de código de programação.', icon: Code, keywords: ['code', 'codigo', 'js', 'ts'] },
  { id: 'page-create', title: 'Criar Página', subtitle: 'Criar uma nova página vinculada.', icon: FilePlus, keywords: ['criar pagina', 'nova pagina', 'subpagina', 'criar', 'page create', 'new page', 'nova'] },
  { id: 'page', title: 'Vincular Página', subtitle: 'Vincular uma página existente.', icon: FileText, keywords: ['vincular pagina', 'pagina', 'page', 'vinculo', 'vincular', 'link pagina'] },
  { id: 'group', title: 'Coleção', subtitle: 'Agrupe páginas em uma coleção expansível.', icon: Folder, keywords: ['colecao', 'grupo', 'pasta'] },
  { id: 'toggle', title: 'Lista Oculta', subtitle: 'Lista que pode ser recolhida.', icon: ListTree, keywords: ['toggle', 'oculta', 'dropdown'] },
  { id: 'blockquoteToggle', title: 'Toggle Destaque', subtitle: 'Toggle com visual de destaque (Callout).', icon: Info, keywords: ['toggle destaque', 'callout toggle'] },
  { id: 'table', title: 'Tabela', subtitle: 'Adicione uma tabela estruturada.', icon: Table, keywords: ['tabela', 'table'] },
  { id: 'table-week', title: 'Tabela: Semana', subtitle: 'Tabela 7 colunas (Dias da semana).', icon: Table, keywords: ['semana', 'dias'] },
  { id: 'table-day', title: 'Tabela: Dia', subtitle: 'Tabela de horários diários.', icon: Table, keywords: ['dia', 'horarios'] },
  { id: 'table-habit', title: 'Tabela: Hábitos', subtitle: 'Matriz para rastreio de hábitos.', icon: Table, keywords: ['habitos', 'habit'] },
  { id: 'question', title: 'Questão', subtitle: 'Crie uma questão de múltipla escolha com IA.', icon: HelpCircle, keywords: ['questao', 'quiz', 'pergunta'] },
  { id: 'ia', title: 'Pedir à IA', subtitle: 'Peça para a IA escrever qualquer coisa.', icon: Sparkles, keywords: ['ia', 'ai', 'prompt'] },
  { id: 'divider', title: 'Divisor', subtitle: 'Separe blocos visualmente.', icon: Minus, keywords: ['divisor', 'linha', 'hr'] },
  { id: 'foco', title: 'Foco (Timer)', subtitle: 'Ex: /foco 25 #Tag Descrição', icon: Clock, keywords: ['foco', 'timer', 'pomodoro'] },
  { id: 'alarme', title: 'Alarme', subtitle: 'Ex: /alarme 15:30', icon: Clock, keywords: ['alarme', 'despertador'] },
  { id: 'documento', title: 'Documento', subtitle: 'Enviar um novo arquivo para esta página.', icon: FileArchive, keywords: ['documento', 'arquivo', 'upload'] },
  { id: 'documento-link', title: 'Vincular Arquivo', subtitle: 'Vincular um arquivo existente do módulo.', icon: Link, keywords: ['vincular', 'link arquivo'] },
  { id: 'video', title: 'Vincular Vídeo', subtitle: 'Vincular um vídeo da sua galeria.', icon: Film, keywords: ['video', 'midia'] },
  { id: 'livro', title: 'Vincular Livro', subtitle: 'Vincular um livro da sua biblioteca.', icon: BookOpen, keywords: ['livro', 'epub', 'pdf'] },
  { id: 'evento', title: 'Evento da Agenda', subtitle: 'Criar e vincular um evento na agenda com avisos.', icon: Calendar, keywords: ['evento', 'agenda', 'calendario'] },
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

  const filteredCommands = SLASH_COMMANDS.filter(cmd => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const cmdId = cmd.id.toLowerCase();
    const cmdTitle = cmd.title.toLowerCase();
    const cmdSubtitle = cmd.subtitle.toLowerCase();
    const keywords = (cmd as any).keywords || [];
    return (
      cmdId.includes(q) ||
      cmdTitle.includes(q) ||
      cmdSubtitle.includes(q) ||
      keywords.some((k: string) => k.includes(q) || q.includes(k))
    );
  });

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
    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', handleScroll, true);
    };
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

