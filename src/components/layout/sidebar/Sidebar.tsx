import { useState, useEffect } from 'react';
import { Home, PanelLeftClose, PanelLeft, BookOpen, Library, Wallet, Film, PlaySquare, BrainCircuit, Timer, Calendar as CalendarIcon, FolderOpen, Shield, Mic, ChevronUp, ChevronDown, LayoutDashboard, ArrowRightLeft, Gift, Settings, Zap, Keyboard, HardDrive, DownloadCloud, RefreshCw, Trash2, Network, Video } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import type { Tab } from '../../../types';
import { SidebarModuleList } from './SidebarModuleList';
import { SidebarPageTree } from './SidebarPageTree';

// UI navigates to 'settings' module as a tab,
// extending Tab['module'] support.
// valor. Ampliamos o tipo aqui apenas para refletir o valor real em runtime.
type ModuleId = Tab['module'] | 'settings';

interface SidebarProps {
  onCreatePage: (parentId: string | null) => Promise<void>;
  onUpdatePage: (id: string, updates: Partial<any>) => Promise<void>;
}

export default function Sidebar({ onCreatePage, onUpdatePage }: SidebarProps) {
  const { state, dispatch } = useStore();
  const [isModulesExpanded, setIsModulesExpanded] = useState(() => {
    const saved = localStorage.getItem('caderno_modules_expanded');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    if (window.api?.config) {
      window.api.config.get('caderno_modules_expanded').then((saved: any) => {
        if (saved !== null && saved !== undefined) {
          setIsModulesExpanded(saved);
        }
      }).catch(console.error);
    }
  }, []);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];
  const activeModule = activeTab.module as ModuleId;

  if (state.sidebarCollapsed) {
    return (
      <>
        {!state.isReadingModeFullScreen && (
          <div className="md:hidden fixed top-4 left-0 z-[90]">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
              className="p-2 bg-dark-card/80 backdrop-blur-md rounded-r-xl border border-l-0 border-white/10 text-dark-subtext hover:text-white shadow-xl active:scale-95 transition-all"
              title="Expandir menu"
            >
              <PanelLeft size={18} />
            </button>
          </div>
        )}

        <div className="hidden md:flex w-12 h-full bg-dark-card/50 border-r border-white/5 flex-col items-center py-4 gap-4 z-20">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="p-2 rounded-lg hover:bg-white/5 text-dark-subtext hover:text-dark-text transition-all active:scale-95"
            title="Expandir sidebar"
          >
            <PanelLeft size={18} />
          </button>
          
          <div className="mt-auto flex flex-col gap-4">
            <SidebarModuleList 
              isCollapsedView={true} 
            />
          </div>
        </div>
      </>
    );
  }

  const renderModuleHeaderIcon = () => {
    switch (activeModule) {
      case 'home': return <Home size={20} className="text-brand-400" />;
      case 'notes': return <BookOpen size={20} className="text-brand-400" />;
      case 'library': return <Library size={20} className="text-brand-400" />;
      case 'culture': return <Film size={20} className="text-brand-400" />;
      case 'video': return <PlaySquare size={20} className="text-brand-400" />;
      case 'anki': return <BrainCircuit size={20} className="text-brand-400" />;
      case 'focus': return <Timer size={20} className="text-brand-400" />;
      case 'calendar': return <CalendarIcon size={20} className="text-brand-400" />;
      case 'files': return <FolderOpen size={20} className="text-brand-400" />;
      case 'vault': return <Shield size={20} className="text-brand-400" />;
      case 'practice': return <Mic size={20} className="text-brand-400" />;
      case 'settings': return <Settings size={20} className="text-brand-400" />;
      case 'trash': return <Trash2 size={20} className="text-brand-400" />;
      case 'diagrams': return <Network size={20} className="text-brand-400" />;
      case 'finance': return <Wallet size={20} className="text-brand-400" />;
      default: return <Home size={20} className="text-brand-400" />;
    }
  };

  const renderModuleHeaderLabel = () => {
    switch (activeModule) {
      case 'home': return 'Início';
      case 'notes': return 'Caderno';
      case 'library': return 'Biblioteca';
      case 'culture': return 'Cultura';
      case 'video': return 'Vídeos';
      case 'anki': return 'Flashcards';
      case 'focus': return 'Foco';
      case 'calendar': return 'Agenda';
      case 'files': return 'Arquivos';
      case 'vault': return 'Cofre';
      case 'practice': return 'Prática';
      case 'settings': return 'Configurações';
      case 'trash': return 'Lixeira';
      case 'diagrams': return 'Diagramas';
      case 'finance': return 'Finanças';
      default: return 'Início';
    }
  };

  return (
    <>
      <div 
         className="md:hidden fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity"
         onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
      />
      
      <div className="fixed md:relative z-[70] md:z-20 w-[260px] h-full bg-dark-bg md:bg-dark-card/50 border-r border-white/5 flex flex-col shadow-2xl md:shadow-none animate-slide-right md:animate-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            {renderModuleHeaderIcon()}
            <span className="font-semibold text-sm">
              {renderModuleHeaderLabel()}
            </span>
          </div>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="p-1.5 rounded-lg hover:bg-white/5 text-dark-subtext hover:text-dark-text transition-all active:scale-95"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {activeModule === 'notes' ? (
          <SidebarPageTree 
            onCreatePage={onCreatePage} 
            onUpdatePage={onUpdatePage} 
            activeTab={activeTab} 
          />
        ) : activeModule === 'library' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Biblioteca de PDFs</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Use o painel principal para gerenciar seus livros e coleções.</div>
          </div>
        ) : activeModule === 'culture' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Área Cultura</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Gerencie seus filmes, séries, livros e animes no painel principal.</div>
          </div>
        ) : activeModule === 'video' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Player Video</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Seus vídeos com legendas interativas para estudo.</div>
          </div>
        ) : activeModule === 'anki' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Flashcards</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Revise seus cartões espaçadamente.</div>
          </div>
        ) : activeModule === 'focus' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Foco</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Gerencie suas sessões de foco e cronômetros.</div>
          </div>
        ) : activeModule === 'calendar' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Agenda</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Gerencie seus compromissos e tarefas diárias.</div>
          </div>
        ) : activeModule === 'files' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Arquivos</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Gerencie seus arquivos, PDFs e documentos.</div>
          </div>
        ) : activeModule === 'vault' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Cofre de Senhas</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Proteja suas credenciais e senhas com segurança máxima.</div>
          </div>
        ) : activeModule === 'practice' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Prática de Inglês</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Converse fluentemente com o seu parceiro IA e aperfeiçoe seu idioma.</div>
          </div>
        ) : activeModule === 'settings' ? (
          <div className="flex flex-col gap-1 mt-2 flex-1 overflow-y-auto custom-scrollbar pb-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider shrink-0">Painel de Controle</div>
            
            {[
              { id: 'general', label: 'Geral', icon: Settings },
              { id: 'editor', label: 'Editor', icon: LayoutDashboard },
              { id: 'security', label: 'Segurança', icon: Shield },
              { id: 'ai', label: 'IA', icon: Zap },
              { id: 'shortcuts', label: 'Atalhos', icon: Keyboard },
              { id: 'storage', label: 'Uso', icon: HardDrive },
              { id: 'video', label: 'Vídeo', icon: Video },
              { id: 'backup', label: 'Backup', icon: DownloadCloud },
              { id: 'sync', label: 'Sync', icon: RefreshCw },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => dispatch({ type: 'NAVIGATE_IN_TAB', pageId: tab.id })}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all mx-2 shrink-0 ${
                  (activeTab.pageId || 'general') === tab.id
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        ) : activeModule === 'home' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Página Inicial</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Resumo do dia, eventos ao vivo e revisões diárias.</div>
          </div>
        ) : activeModule === 'trash' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Lixeira do Sistema</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Restaure páginas e estações lofi ou exclua itens permanentemente.</div>
          </div>
        ) : activeModule === 'diagrams' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Editor de Diagramas</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Crie, conecte e estruture fluxogramas visuais no painel principal.</div>
          </div>
        ) : activeModule === 'finance' ? (
          <div className="flex flex-col gap-1 mt-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-text bg-white/5">
              <LayoutDashboard size={16} className="text-brand-400" />
              <span>Visão Geral</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all">
              <ArrowRightLeft size={16} className="text-brand-400" />
              <span>Transações</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all">
              <Gift size={16} className="text-brand-400" />
              <span>Desejos & Futuro</span>
            </button>
          </div>
        ) : (
          <div className="mt-2" />
        )}

        <div className="border-t border-white/5 flex flex-col mt-auto">
          <button
            onClick={() => setIsModulesExpanded(!isModulesExpanded)}
            className="flex items-center justify-between w-full p-3 text-xs font-semibold text-dark-subtext uppercase tracking-wider hover:bg-white/5 transition-colors group"
          >
            <span>Módulos</span>
            {isModulesExpanded ? (
              <ChevronDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            ) : (
              <ChevronUp size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
          
          {isModulesExpanded && (
            <div className="flex flex-col gap-1 px-3 pb-3 overflow-y-auto max-h-[40vh] custom-scrollbar">
              <SidebarModuleList 
                isCollapsedView={false} 
                onModuleSelect={() => {
                  if (window.innerWidth < 768) {
                    dispatch({ type: 'TOGGLE_SIDEBAR' });
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
