import React, { useState, useEffect } from 'react';
import {
  X,
  Flame,
  Calendar,
  Sparkles,
  Target,
  CheckCircle2,
} from 'lucide-react';
import { Portal } from '../ui/Portal';

interface HabitsHelpModalProps {
  onClose: () => void;
}

type TabKey = 'basics' | 'heatmap' | 'widget' | 'tips';

export function HabitsHelpModal({ onClose }: HabitsHelpModalProps) {
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
          aria-label="Guia do Sistema de Hábitos"
          className="bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/[0.06] h-[85vh] max-h-[700px] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-dark-bg border-r border-white/5 p-5 flex flex-col gap-1.5 shrink-0 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Flame className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Guia de Hábitos</h2>
                <p className="text-[11px] text-dark-subtext">Consistência & Rotinas</p>
              </div>
            </div>

            <TabButton
              active={activeTab === 'basics'}
              onClick={() => setActiveTab('basics')}
              icon={<Flame size={16} />}
              label="O Básico & Streaks"
            />
            <TabButton
              active={activeTab === 'heatmap'}
              onClick={() => setActiveTab('heatmap')}
              icon={<Calendar size={16} />}
              label="Mapa de Calor Anual"
            />
            <TabButton
              active={activeTab === 'widget'}
              onClick={() => setActiveTab('widget')}
              icon={<Sparkles size={16} />}
              label="Widgets no Editor"
            />
            <TabButton
              active={activeTab === 'tips'}
              onClick={() => setActiveTab('tips')}
              icon={<Target size={16} />}
              label="Dicas de Consistência"
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
              {activeTab === 'heatmap' && <HeatmapTab />}
              {activeTab === 'widget' && <WidgetTab />}
              {activeTab === 'tips' && <TipsTab />}
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
          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25 shadow-sm'
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
        <h3 className="text-xl font-bold text-white mb-2">Construção de Hábitos & Streaks</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          O módulo de Hábitos do Caderno foi desenvolvido para transformar metas em ações automáticas
          diárias através de reforço visual contínuo.
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Sequência Atual (Current Streak)"
          description="Contabiliza quantos dias consecutivos você completou o hábito sem quebrar a cadeia."
        />
        <FeatureItem
          title="Melhor Sequência (Best Streak)"
          description="Seu recorde histórico pessoal de consistência para inspirar superação contínua."
        />
        <FeatureItem
          title="Taxa de Conclusão Global"
          description="Percentual de dias cumpridos em relação aos dias decorridos no ano."
        />
      </div>
    </div>
  );
}

function HeatmapTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Mapa de Calor Anual (Estilo GitHub)</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Visualize 365 dias de histórico em um grid compacto e responsivo:
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Navegação e Toggle Rápido"
          description="Clique em qualquer dia do grid para marcar ou desmarcar a realização do hábito com atualização instantânea das métricas."
        />
        <FeatureItem
          title="Tooltip de Data com Detalhes"
          description="Passe o cursor sobre qualquer célula para ver a data exata e o status daquele dia."
        />
        <FeatureItem
          title="Edição Direta do Nome"
          description="Clique no ícone de lápis ou no título do hábito para renomeá-lo a qualquer momento."
        />
      </div>
    </div>
  );
}

function WidgetTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Widgets de Hábitos no Editor</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Incorpore seus rastreadores de hábitos diretamente dentro de suas anotações:
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Comando /habito no Editor TipTap"
          description="Digite '/habito' em qualquer linha vazia da sua página de notas para inserir um widget compacto do hábito."
        />
        <FeatureItem
          title="Check-in Direto na Nota Diária"
          description="Marque seu hábito cumprido diretamente pelo widget incorporado sem precisar abrir janelas extras."
        />
      </div>
    </div>
  );
}

function TipsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Dicas para Manter a Consistência</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Boas práticas recomendadas pela ciência comportamental (Atomic Habits):
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Comece Pequeno (Micro-hábitos)"
          description="Defina um limiar inicial tão simples que seja impossível não cumprir (ex: 'ler 5 páginas por dia' em vez de 'ler 2 horas')."
        />
        <FeatureItem
          title="Nunca Quebre a Corrente Dois Dias Seguidos"
          description="Se imprevistos acontecerem em um dia, faça do retorno no dia seguinte sua prioridade absoluta."
        />
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
        <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
        <span>{title}</span>
      </div>
      <p className="text-xs text-dark-subtext leading-relaxed pl-5">{description}</p>
    </div>
  );
}
