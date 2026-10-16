import React, { useState, useEffect } from 'react';
import {
  X,
  CheckSquare,
  Compass,
  LayoutDashboard,
  Sparkles,
  Keyboard,
  Target,
  CheckCircle2,
} from 'lucide-react';
import { Portal } from '../ui/Portal';

interface QuestionsHelpModalProps {
  onClose: () => void;
}

type TabKey = 'basics' | 'solving' | 'analytics' | 'playlists' | 'shortcuts';

export function QuestionsHelpModal({ onClose }: QuestionsHelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('basics');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const handleBackPress = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [onClose]);

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-label="Guia do Banco de Questões"
          className="bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/10 h-[85vh] max-h-[720px] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-dark-bg border-r border-white/5 p-5 flex flex-col gap-1.5 shrink-0 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <CheckSquare className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Guia de Questões</h2>
                <p className="text-[11px] text-dark-subtext">Prática e simulados</p>
              </div>
            </div>

            <TabButton
              active={activeTab === 'basics'}
              onClick={() => setActiveTab('basics')}
              icon={<Compass size={16} />}
              label="O Básico & Baterias"
            />
            <TabButton
              active={activeTab === 'solving'}
              onClick={() => setActiveTab('solving')}
              icon={<Target size={16} />}
              label="Modo de Resolução Zen"
            />
            <TabButton
              active={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              icon={<LayoutDashboard size={16} />}
              label="Métricas & Desempenho"
            />
            <TabButton
              active={activeTab === 'playlists'}
              onClick={() => setActiveTab('playlists')}
              icon={<Sparkles size={16} />}
              label="Caderno de Erros"
            />
            <TabButton
              active={activeTab === 'shortcuts'}
              onClick={() => setActiveTab('shortcuts')}
              icon={<Keyboard size={16} />}
              label="Atalhos de Teclado"
            />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto relative p-6 md:p-8 custom-scrollbar">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-xl transition-colors z-10"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>

            <div className="max-w-2xl mx-auto space-y-6">
              {activeTab === 'basics' && <BasicsTab />}
              {activeTab === 'solving' && <SolvingTab />}
              {activeTab === 'analytics' && <AnalyticsTab />}
              {activeTab === 'playlists' && <PlaylistsTab />}
              {activeTab === 'shortcuts' && <ShortcutsTab />}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-medium ${
        active
          ? 'bg-brand-500/15 text-brand-300 border border-brand-500/25 shadow-sm'
          : 'text-dark-subtext hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function BasicsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Central de Questões</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          O módulo Central de Questões foi desenhado para praticar exercícios de concursos, vestibulares
          e certificações com taxa de retenção máxima e zero poluição visual.
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Árvore Hierárquica de Pastas"
          description="Organize suas baterias por Matéria, Disciplina ou Banca em pastas ilimitadas com arrastar e soltar."
        />
        <FeatureItem
          title="Baterias Personalizadas"
          description="Crie baterias com enunciados ricos, suporte a imagens, alternativas de múltipla escolha e gabaritos comentados com explicações passo a passo."
        />
        <FeatureItem
          title="Importação e Exportação"
          description="Exporte suas baterias ou importe bancos de questões estruturados em JSON para estudo contínuo."
        />
      </div>
    </div>
  );
}

function SolvingTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Modo de Resolução Zen Canvas</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Uma experiência imersiva em tela cheia construída conforme os 6 pilares de foco do Caderno:
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Tela Cheia Sem Distrações"
          description="Elimina popups claustrofóbicos e foca a visão na coluna de leitura com tipografia relaxada e alto contraste."
        />
        <FeatureItem
          title="Feedback Imediato & Gabarito Comentado"
          description="Ao confirmar a resposta, veja instantaneamente se acertou (verde esmeralda suave) ou errou (coral suave) e consulte a fundamentação teórica."
        />
        <FeatureItem
          title="Fluidez Sem Mouse"
          description="Selecione alternativas com as teclas A, B, C, D e avance com Enter sem precisar mover o cursor."
        />
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Métricas & Diagnóstico de Desempenho</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Acompanhe seu progresso estatístico na aba 'Métricas':
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Taxa de Acerto Global e por Matéria"
          description="Visualize percentuais precisos de acerto em tempo real para identificar quais disciplinas exigem mais atenção."
        />
        <FeatureItem
          title="Histórico de Tentativas"
          description="Cada resolução armazena data, tempo gasto e respostas anteriores para acompanhar a evolução na curva de aprendizado."
        />
      </div>
    </div>
  );
}

function PlaylistsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Caderno de Erros & Simulados</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Revise cirurgicamente as questões que você já errou em sessões passadas.
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Filtro de Questões Erradas"
          description="Monte baterias focadas exclusivamente nos pontos onde você tropeçou para fixar o conteúdo de forma definitiva."
        />
        <FeatureItem
          title="Simulados Cronometrados"
          description="Treine o tempo de prova resolvendo listas com tempo limite configurado."
        />
      </div>
    </div>
  );
}

function ShortcutsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Atalhos de Teclado no Modo Zen</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Resolva questões com velocidade máxima usando o teclado:
        </p>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
        <table className="w-full text-xs text-left">
          <thead className="bg-white/5 border-b border-white/10 text-white/70">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Atalho</th>
              <th className="py-2.5 px-4 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/90">
            <tr>
              <td className="py-2.5 px-4 font-mono font-bold text-brand-300">A, B, C, D, E</td>
              <td className="py-2.5 px-4 text-white/90">Selecionar a respectiva alternativa</td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-mono font-bold text-brand-300">Enter / Espaço</td>
              <td className="py-2.5 px-4 text-white/90">Confirmar resposta / avançar para a próxima questão</td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-mono font-bold text-brand-300">G</td>
              <td className="py-2.5 px-4 text-white/90">Exibir / ocultar gabarito comentado</td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-mono font-bold text-brand-300">Seta Esquerda / Direita</td>
              <td className="py-2.5 px-4 text-white/90">Navegar entre questões anterior e próxima</td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-mono font-bold text-brand-300">Esc</td>
              <td className="py-2.5 px-4 text-white/90">Sair do modo de resolução e voltar para o banco</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeatureItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
      <div className="flex items-center gap-2 text-white font-semibold text-xs">
        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
        <span>{title}</span>
      </div>
      <p className="text-xs text-dark-subtext leading-relaxed pl-5">{description}</p>
    </div>
  );
}
