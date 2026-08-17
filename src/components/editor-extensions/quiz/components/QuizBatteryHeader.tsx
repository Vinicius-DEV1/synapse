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
} from 'lucide-react';

interface QuizBatteryHeaderProps {
  title: string;
  description: string;
  mode: 'edit' | 'practice';
  isCollapsed: boolean;
  copiedJson: boolean;
  onUpdateTitle: (title: string) => void;
  onUpdateDescription: (description: string) => void;
  onSetMode: (mode: 'edit' | 'practice', e: React.MouseEvent) => void;
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
  isCollapsed,
  copiedJson,
  onUpdateTitle,
  onUpdateDescription,
  onSetMode,
  onOpenAiAssistant,
  onOpenImport,
  onCopyJson,
  onOpenDeleteModal,
  onToggleCollapse,
}: QuizBatteryHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
        <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 shadow-inner">
          <HelpCircle size={22} />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={title || ''}
            onChange={(e) => onUpdateTitle(e.target.value)}
            placeholder="Título da Bateria de Exercícios..."
            className="bg-transparent text-base md:text-lg font-bold text-white placeholder-white/30 outline-none w-full border-b border-transparent focus:border-purple-500/50 transition-colors"
          />
          <input
            type="text"
            value={description || ''}
            onChange={(e) => onUpdateDescription(e.target.value)}
            placeholder="Instruções ou descrição breve..."
            className="bg-transparent text-xs text-purple-200/70 placeholder-white/20 outline-none w-full mt-0.5 border-b border-transparent focus:border-purple-500/30 transition-colors"
          />
        </div>
      </div>

      {/* Alternador de Modo (Editar vs Praticar) + Ações */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-black/50 p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={(e) => onSetMode('edit', e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'edit'
                ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30'
                : 'text-dark-subtext hover:text-white'
            }`}
          >
            <Edit2 size={13} />
            <span>Editar</span>
          </button>
          <button
            onClick={(e) => onSetMode('practice', e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'practice'
                ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30'
                : 'text-dark-subtext hover:text-white'
            }`}
          >
            <Play size={13} />
            <span>Praticar</span>
          </button>
        </div>

        {/* Botão Assistente IA */}
        <button
          onClick={onOpenAiAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-semibold shadow-sm transition-all"
          title="Abrir Assistente de Exercícios IA"
        >
          <Sparkles size={14} className="text-purple-400" />
          <span>IA</span>
        </button>

        {/* Importar / Exportar / Excluir */}
        <button
          onClick={onOpenImport}
          className="p-2 rounded-xl bg-black/40 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 transition-colors"
          title="Importar questões via JSON"
        >
          <UploadCloud size={15} />
        </button>
        <button
          onClick={onCopyJson}
          className="p-2 rounded-xl bg-black/40 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 transition-colors"
          title="Exportar bateria em JSON"
        >
          {copiedJson ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
        </button>
        <button
          onClick={onOpenDeleteModal}
          className="p-2 rounded-xl bg-black/40 hover:bg-red-500/20 text-dark-subtext hover:text-red-400 border border-white/10 transition-colors"
          title="Remover toda a bateria"
        >
          <Trash2 size={15} />
        </button>
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl bg-black/40 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 transition-colors"
        >
          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>
    </div>
  );
}
