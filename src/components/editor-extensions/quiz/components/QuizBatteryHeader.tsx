import React, { useState, useRef, useEffect } from 'react';
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
  FileCode,
  MoreHorizontal,
  Maximize2,
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
  onCopySchemaPrompt?: (e: React.MouseEvent) => void;
  onOpenDeleteModal: () => void;
  onToggleCollapse: () => void;
  onToggleFocusMode?: () => void;
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
  onCopySchemaPrompt,
  onOpenDeleteModal,
  onToggleCollapse,
  onToggleFocusMode,
}: QuizBatteryHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
        <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/70 shrink-0">
          <HelpCircle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title || ''}
              onChange={(e) => onUpdateTitle(e.target.value)}
              placeholder="Título da Bateria de Exercícios..."
              className="bg-transparent text-sm md:text-base font-medium text-white placeholder-white/20 outline-none w-full border-b border-transparent focus:border-white/20 transition-colors"
            />
            {typeof questionCount === 'number' && isCollapsed && (
              <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] text-dark-subtext font-mono">
                {questionCount} {questionCount === 1 ? 'questão' : 'questões'}
              </span>
            )}
          </div>
          <input
            type="text"
            value={description || ''}
            onChange={(e) => onUpdateDescription(e.target.value)}
            placeholder="Instruções ou descrição breve..."
            className="bg-transparent text-xs text-dark-subtext placeholder-white/20 outline-none w-full mt-0.5 border-b border-transparent focus:border-white/10 transition-colors"
          />
        </div>
      </div>

      {/* Lado Direito: Ações Minimalistas */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Indicador sutil de Modo Edição quando ativo */}
        {mode === 'edit' && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium">
            <Edit2 size={11} />
            <span>Editando</span>
          </span>
        )}

        {/* Modo Foco / Maximizar (Apenas em Modo Sequencial Prática e não recolhido) */}
        {mode === 'practice' && layout === 'sequential' && !isCollapsed && onToggleFocusMode && (
          <button
            onClick={onToggleFocusMode}
            className="p-1.5 md:p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-dark-subtext hover:text-white border border-white/[0.06] transition-colors flex items-center justify-center shadow-xs"
            title="Modo Foco / Maximizar"
            aria-label="Abrir modo foco para resolução imersiva"
          >
            <Maximize2 size={15} />
          </button>
        )}

        {/* Menu de Ações (•••) contendo Modo, Visualização, IA e Ferramentas */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-1.5 md:p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-dark-subtext hover:text-white border border-white/[0.06] transition-colors flex items-center justify-center shadow-xs"
            title="Mais opções da bateria"
          >
            <MoreHorizontal size={15} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-dark-card/95 border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 backdrop-blur-xl animate-fade-in text-xs space-y-0.5">
              {/* Seção: Modo */}
              <div className="px-3 py-1 text-[10px] font-medium text-dark-subtext uppercase tracking-wider">
                Modo
              </div>
              <button
                onClick={(e) => {
                  setShowMenu(false);
                  onSetMode('practice', e);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                  mode === 'practice'
                    ? 'text-brand-300 bg-brand-500/10 font-medium'
                    : 'text-dark-subtext hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Play size={14} className={mode === 'practice' ? 'text-brand-400' : 'text-dark-subtext'} />
                  <span>Praticar</span>
                </div>
                {mode === 'practice' && <Check size={13} className="text-brand-400" />}
              </button>
              <button
                onClick={(e) => {
                  setShowMenu(false);
                  onSetMode('edit', e);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                  mode === 'edit'
                    ? 'text-brand-300 bg-brand-500/10 font-medium'
                    : 'text-dark-subtext hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Edit2 size={14} className={mode === 'edit' ? 'text-brand-400' : 'text-dark-subtext'} />
                  <span>Editar</span>
                </div>
                {mode === 'edit' && <Check size={13} className="text-brand-400" />}
              </button>

              {/* Seção: Visualização (Lista vs Sequencial) */}
              {onSetLayout && (
                <>
                  <div className="h-px bg-white/[0.06] my-1" />
                  <div className="px-3 py-1 text-[10px] font-medium text-dark-subtext uppercase tracking-wider">
                    Visualização
                  </div>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSetLayout('list');
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                      layout === 'list'
                        ? 'text-white bg-white/5 font-medium'
                        : 'text-dark-subtext hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <List size={14} />
                      <span>Lista</span>
                    </div>
                    {layout === 'list' && <Check size={13} className="text-brand-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSetLayout('sequential');
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                      layout === 'sequential'
                        ? 'text-white bg-white/5 font-medium'
                        : 'text-dark-subtext hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutList size={14} />
                      <span>Sequencial</span>
                    </div>
                    {layout === 'sequential' && <Check size={13} className="text-brand-400" />}
                  </button>
                </>
              )}

              {/* Seção: Ferramentas & IA */}
              <div className="h-px bg-white/[0.06] my-1" />
              <div className="px-3 py-1 text-[10px] font-medium text-dark-subtext uppercase tracking-wider">
                Ferramentas
              </div>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onOpenAiAssistant();
                }}
                className="w-full px-3 py-2 text-left text-dark-subtext hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <Sparkles size={14} className="text-brand-300" />
                <span>Assistente IA</span>
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onOpenImport();
                }}
                className="w-full px-3 py-2 text-left text-dark-subtext hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <UploadCloud size={14} />
                <span>Importar Questões</span>
              </button>
              <button
                onClick={(e) => {
                  onCopyJson(e);
                }}
                className="w-full px-3 py-2 text-left text-dark-subtext hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                {copiedJson ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedJson ? 'JSON Copiado!' : 'Exportar em JSON'}</span>
              </button>
              {onCopySchemaPrompt && (
                <button
                  onClick={(e) => {
                    setShowMenu(false);
                    onCopySchemaPrompt(e);
                  }}
                  className="w-full px-3 py-2 text-left text-dark-subtext hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                >
                  <FileCode size={14} />
                  <span>Copiar Prompt Schema</span>
                </button>
              )}

              {/* Seção: Excluir */}
              <div className="h-px bg-white/[0.06] my-1" />
              <button
                onClick={() => {
                  setShowMenu(false);
                  onOpenDeleteModal();
                }}
                className="w-full px-3 py-2 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
              >
                <Trash2 size={14} />
                <span>Remover Bateria</span>
              </button>
            </div>
          )}
        </div>

        {/* Recolher / Expandir */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 md:p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-dark-subtext hover:text-white border border-white/[0.06] transition-colors flex items-center justify-center shadow-xs"
          title={isCollapsed ? 'Expandir bateria de questões' : 'Recolher bateria de questões'}
        >
          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>
    </div>
  );
}

