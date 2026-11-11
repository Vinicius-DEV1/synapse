import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Music,
  Bell,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Portal } from '../ui/Portal';

interface FocusHelpModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

type TabKey = 'basics' | 'lofi' | 'alarms' | 'metrics';

export function FocusHelpModal({ isOpen = true, onClose }: FocusHelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('basics');

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-label="Guia do Modo de Foco"
          className="bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/[0.06] h-[85vh] max-h-[700px] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-dark-bg border-r border-white/5 p-5 flex flex-col gap-1.5 shrink-0 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Clock className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Guia de Foco</h2>
                <p className="text-[11px] text-dark-subtext">Pomodoro & Produtividade</p>
              </div>
            </div>

            <TabButton
              active={activeTab === 'basics'}
              onClick={() => setActiveTab('basics')}
              icon={<Clock size={16} />}
              label="Pomodoro & Ciclos"
            />
            <TabButton
              active={activeTab === 'lofi'}
              onClick={() => setActiveTab('lofi')}
              icon={<Music size={16} />}
              label="Sons Ambientes & Lofi"
            />
            <TabButton
              active={activeTab === 'alarms'}
              onClick={() => setActiveTab('alarms')}
              icon={<Bell size={16} />}
              label="Alarmes & Lembretes"
            />
            <TabButton
              active={activeTab === 'metrics'}
              onClick={() => setActiveTab('metrics')}
              icon={<Activity size={16} />}
              label="Métricas & Metas"
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
              {activeTab === 'lofi' && <LofiTab />}
              {activeTab === 'alarms' && <AlarmsTab />}
              {activeTab === 'metrics' && <MetricsTab />}
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
          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25 shadow-sm'
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
        <h3 className="text-xl font-bold text-white mb-2">Técnica Pomodoro & Ciclos de Foco</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Mantenha a concentração em estado de flow alternando blocos intensos de foco com pausas
          restauradoras.
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Sessões Personalizáveis"
          description="Configure durações padrão de 25m, 45m ou 60m para trabalho focado e pausas curtas (5m) ou longas (15m)."
        />
        <FeatureItem
          title="Atribuição de Tags e Matérias"
          description="Associe cada sessão a uma tag de estudo (ex: Programação, Concurso, Leitura) para análise posterior."
        />
        <FeatureItem
          title="Tela Cheia com Modo Zen"
          description="Durante a sessão ativa, todo o ruído visual é ocultado com um cronômetro minimalista."
        />
      </div>
    </div>
  );
}

function LofiTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Sons Ambientes & Player Lofi</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Acelere a imersão cognitiva com frequências sonoras relaxantes:
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Mixer de Sons da Natureza"
          description="Combine sons como Chuva, Trovões, Lareira, Café, Floresta e Ondas com controle individual de volume."
        />
        <FeatureItem
          title="Rádios Lofi Contínuas"
          description="Transmita canais selecionados de batidas lofi de baixa frequência sem anúncios nem interrupções."
        />
      </div>
    </div>
  );
}

function AlarmsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Alarmes & Despertadores</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Agende compromissos de estudo e pausas fixas:
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Lembretes Periódicos"
          description="Configure alarmes com toque sonoro para lembrar de beber água, pausar o estudo ou iniciar revisões."
        />
        <FeatureItem
          title="Notificações do Sistema"
          description="Receba alertas nativos mesmo com a janela do Caderno minimizada."
        />
      </div>
    </div>
  );
}

function MetricsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Métricas de Produtividade</h3>
        <p className="text-sm text-dark-subtext leading-relaxed">
          Acompanhe seu volume de estudo real e tendências semanais:
        </p>
      </div>

      <div className="space-y-3">
        <FeatureItem
          title="Meta Diária em Minutos"
          description="Defina sua meta diária de foco (ex: 120 minutos) e acompanhe o anel de progresso circular dinâmico."
        />
        <FeatureItem
          title="Tendência Semanal dos Últimos 7 Dias"
          description="Gráfico comparativo de minutos estudados a cada dia da semana para avaliar sua constância."
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
        <CheckCircle2 size={13} className="text-purple-400 shrink-0" />
        <span>{title}</span>
      </div>
      <p className="text-xs text-dark-subtext leading-relaxed pl-5">{description}</p>
    </div>
  );
}

export default FocusHelpModal;
