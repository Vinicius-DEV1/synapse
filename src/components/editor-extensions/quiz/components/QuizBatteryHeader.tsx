import React from 'react';
import {
  HelpCircle,
  Play,
  Edit2,
  Sparkles,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  List,
  LayoutList,
} from 'lucide-react';
import type { QuizLayout } from '../types';

interface QuizBatteryHeaderProps {
  title: string;
  description: string;
  mode: 'edit' | 'practice';
  layout?: QuizLayout;
  isCollapsed: boolean;
  copiedJson: boolean;
  questionCount?: number;
  onUpdateTitle: (title: string) => void;
  onUpdateDescription: (description: string) => void;
  onSetMode: (mode: 'edit' | 'practice', e: React.MouseEvent) => void;
  onSetLayout?: (layout: QuizLayout) => void;
  onOpenAiAssistant: () => void;
  onOpenImport: () => void;
  onCopyJson: (e: React.MouseEvent) => void;
  onOpenDeleteModal: () => void;
  onToggleCollapse: () => void;
}

export default function QuizBatteryHeader({
  title,
  description,
  mode,
  layout = 'list',
  isCollapsed,
  copiedJson,
  questionCount,
  onUpdateTitle,
  onUpdateDescription,
  onSetMode,
  onSetLayout,
  onOpenAiAssistant,
  onOpenImport,
  onCopyJson,
  onOpenDeleteModal,
  onToggleCollapse,
}: QuizBatteryHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
        <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 shrink-0">
          <HelpCircle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title || ''}
              onChange={(e) => onUpdateTitle(e.target.value)}
              placeholder="Título da Bateria de Exercícios..."
              className="bg-transparent text-sm md:text-base font-semibold text-white placeholder-white/30 outline-none w-full border-b border-transparent focus:border-brand-500/40 transition-colors"
            />
            {typeof questionCount === 'number' && isCollapsed && (
              <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-dark-subtext font-mono">
                {questionCount} {questionCount === 1 ? 'questão' : 'questões'}
              </span>
            )}
          </div>
          <input
            type="text"
            value={description || ''}
            onChange={(e) => onUpdateDescription(e.target.value)}
            placeholder="Instruções ou descrição breve..."
            className="bg-transparent text-xs text-dark-subtext placeholder-white/20 outline-none w-full mt-0.5 border-b border-transparent focus:border-brand-500/30 transition-colors"
          />
        </div>
      </div>

      {/* Alternador de Modo (Editar vs Praticar) + Ações */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/10 text-xs">
          <button
            onClick={(e) => onSetMode('edit', e)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
              mode === 'edit'
                ? 'bg-brand-500 text-white font-semibold shadow-sm'
                : 'text-dark-subtext hover:text-white'
            }`}
          >
            <Edit2 size={13} />
            <span>Editar</span>
          </button>
          <button
            onClick={(e) => onSetMode('practice', e)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
              mode === 'practice'
                ? 'bg-brand-500 text-white font-semibold shadow-sm'
                : 'text-dark-subtext hover:text-white'
            }`}
          >
            <Play size={13} />
            <span>Praticar</span>
          </button>
        </div>

        {/* Alternador de Layout (Lista vs Sequencial/Kahoot) no modo Prática */}
        {mode === 'practice' && onSetLayout && !isCollapsed && (
          <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => onSetLayout('list')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                layout === 'list'
                  ? 'bg-white/15 text-white font-semibold shadow-xs'
                  : 'text-dark-subtext hover:text-white'
              }`}
              title="Modo Lista (Todas as questões visíveis)"
            >
              <List size={13} />
              <span className="hidden sm:inline text-[11px]">Lista</span>
            </button>
            <button
              onClick={() => onSetLayout('sequential')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                layout === 'sequential'
                  ? 'bg-white/15 text-white font-semibold shadow-xs'
                  : 'text-dark-subtext hover:text-white'
              }`}
              title="Modo Sequencial (Uma questão por vez, estilo Kahoot)"
            >
              <LayoutList size={13} />
              <span className="hidden sm:inline text-[11px]">Sequencial</span>
            </button>
          </div>
        )}

        {/* Botão Assistente IA */}
        <button
          onClick={onOpenAiAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 text-brand-300 rounded-xl text-xs font-semibold shadow-sm transition-all"
          title="Abrir Assistente de Exercícios IA"
        >
          <Sparkles size={14} className="text-brand-400" />
          <span>IA</span>
        </button>

        {/* Importar / Exportar / Excluir */}
        <button
          onClick={onOpenImport}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 transition-colors"
          title="Importar questões via JSON"
        >
          <UploadCloud size={15} />
        </button>
        <button
          onClick={onCopyJson}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 transition-colors"
          title="Exportar bateria em JSON"
        >
          {copiedJson ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
        </button>
        <button
          onClick={onOpenDeleteModal}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-dark-subtext hover:text-red-400 border border-white/10 transition-colors"
          title="Remover toda a bateria"
        >
          <Trash2 size={15} />
        </button>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 transition-colors"
          title={isCollapsed ? 'Expandir bateria de questões' : 'Recolher bateria de questões'}
        >
          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>
    </div>
  );
}
