import React, { useState, useMemo, useEffect } from 'react';
import { Search, Tag, Play, Edit3, Trash2, FileText, ChevronDown, ChevronRight, CheckCircle2, XCircle, HelpCircle, ExternalLink, Zap } from 'lucide-react';
import { Portal } from '../ui/Portal';
import type { BatteryWithQuestions } from '../../types/quiz';

interface QuestionsExplorerProps {
  batteries: BatteryWithQuestions[];
  onPlayBattery: (battery: BatteryWithQuestions) => void;
  onEditBattery: (battery: BatteryWithQuestions) => void;
  onDeleteBattery: (batteryId: string) => void;
  onNavigateToPage: (pageId: string) => void;
  allAvailableTags: string[];
  getPageTitle?: (pageId: string) => string | null;
  highlightedBatteryId?: string;
}

export const QuestionsExplorer = React.memo(function QuestionsExplorer({
  batteries,
  onPlayBattery,
  onEditBattery,
  onDeleteBattery,
  onNavigateToPage,
  allAvailableTags,
  getPageTitle,
  highlightedBatteryId,
}: QuestionsExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<'all' | 'linked' | 'standalone'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'errors'>('all');
  const [expandedBatteryIds, setExpandedBatteryIds] = useState<Set<string>>(new Set());
  const [batteryPendingDelete, setBatteryPendingDelete] = useState<BatteryWithQuestions | null>(null);

  // Tecla Esc para fechar o modal de exclusão
  useEffect(() => {
    if (!batteryPendingDelete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setBatteryPendingDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [batteryPendingDelete]);

  useEffect(() => {
    if (highlightedBatteryId) {
      setExpandedBatteryIds((prev) => new Set([...prev, highlightedBatteryId]));
      const timer = setTimeout(() => {
        const el = document.getElementById(`battery-card-${highlightedBatteryId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightedBatteryId]);

  const toggleExpand = (id: string) => {
    setExpandedBatteryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter logic
  const filteredBatteries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return batteries.filter((b) => {
      // 1. Origin filter
      const isLinked = Boolean(b.page_id || (b.linkedPages && b.linkedPages.length > 0));
      if (selectedOrigin === 'linked' && !isLinked) return false;
      if (selectedOrigin === 'standalone' && isLinked) return false;

      // 2. Tag filter
      if (selectedTag) {
        const normSelectedTag = selectedTag.toLowerCase();
        const hasTag =
          (b.tags || []).some((t) => typeof t === 'string' && t.toLowerCase() === normSelectedTag) ||
          b.questions.some((q) =>
            (q.tags || []).some((t) => typeof t === 'string' && t.toLowerCase() === normSelectedTag)
          );
        if (!hasTag) return false;
      }

      // 3. Status filter
      if (selectedStatus === 'pending') {
        const hasPending = b.questions.some((q) => !b.latestAttempts?.[q.id]);
        if (!hasPending) return false;
      } else if (selectedStatus === 'errors') {
        const hasErrors = b.questions.some((q) => b.latestAttempts?.[q.id] && !b.latestAttempts[q.id].is_correct);
        if (!hasErrors) return false;
      }

      // 4. Search query
      if (term) {
        const matchesTitle = (b.title || '').toLowerCase().includes(term);
        const matchesDesc = (b.description || '').toLowerCase().includes(term);
        const matchesTag = (b.tags || []).some((t) => typeof t === 'string' && t.toLowerCase().includes(term));
        const matchesQuestions = b.questions.some(
          (q) =>
            (q.question || '').toLowerCase().includes(term) ||
            (q.explanation || '').toLowerCase().includes(term) ||
            (q.tags || []).some((t) => typeof t === 'string' && t.toLowerCase().includes(term))
        );
        const matchesOriginPage =
          Boolean(b.page_id && getPageTitle?.(b.page_id)?.toLowerCase().includes(term)) ||
          Boolean(b.linkedPages && b.linkedPages.some((p) => (getPageTitle?.(p.id) || p.title || '').toLowerCase().includes(term)));

        if (!matchesTitle && !matchesDesc && !matchesTag && !matchesQuestions && !matchesOriginPage) return false;
      }

      return true;
    });
  }, [batteries, searchTerm, selectedOrigin, selectedTag, selectedStatus, getPageTitle]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Search and Filters Bar */}
      <div className="bg-zinc-900/60 border border-white/[0.08] rounded-2xl p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, enunciado, tag ou comentário..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-white/[0.06] focus:border-brand-500/50 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Origin Filter */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-white/[0.06] text-xs">
            <button
              onClick={() => setSelectedOrigin('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedOrigin === 'all' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedOrigin('linked')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                selectedOrigin === 'linked' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText size={12} />
              <span>Do Caderno</span>
            </button>
            <button
              onClick={() => setSelectedOrigin('standalone')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                selectedOrigin === 'standalone' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Zap size={12} />
              <span>Avulsas</span>
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-white/[0.06] text-xs">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedStatus === 'all' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Qualquer Status
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedStatus === 'pending' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setSelectedStatus('errors')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-rose-300 ${
                selectedStatus === 'errors' ? 'bg-rose-500/20 text-rose-200 font-medium' : 'hover:text-rose-200'
              }`}
            >
              Com Erros
            </button>
          </div>
        </div>

        {/* Tag Pills */}
        {allAvailableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.04]">
            <span className="text-[11px] text-zinc-500 mr-1 flex items-center gap-1">
              <Tag size={12} />
              <span>Tags:</span>
            </span>
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30 cursor-pointer"
              >
                Limpar ({selectedTag}) ✕
              </button>
            )}
            {allAvailableTags.slice(0, 10).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  selectedTag === t
                    ? 'bg-brand-500/30 text-brand-200 border border-brand-500/40'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Batteries List */}
      <div className="space-y-3">
        {filteredBatteries.length === 0 ? (
          <div className="bg-zinc-900/40 border border-dashed border-white/[0.08] rounded-2xl p-10 text-center space-y-2">
            <HelpCircle size={24} className="mx-auto text-zinc-500" />
            <h4 className="text-sm font-medium text-zinc-300">Nenhuma bateria de questões encontrada</h4>
            <p className="text-xs text-zinc-500">
              Tente ajustar os filtros de busca ou crie uma nova bateria de exercícios.
            </p>
          </div>
        ) : (
          filteredBatteries.map((b) => {
            const isExpanded = expandedBatteryIds.has(b.id);
            const totalQ = b.questions.length;
            const answeredQ = b.questions.filter((q) => b.latestAttempts?.[q.id]).length;
            const correctQ = b.questions.filter((q) => b.latestAttempts?.[q.id]?.is_correct).length;
            const accuracy = answeredQ > 0 ? Math.round((correctQ / answeredQ) * 100) : 0;

            const isHighlighted = b.id === highlightedBatteryId;

            return (
              <div
                key={b.id}
                id={`battery-card-${b.id}`}
                className={`rounded-2xl p-4 sm:p-5 transition-all shadow-sm ${
                  isHighlighted
                    ? 'bg-zinc-900/90 border border-brand-500/50 ring-1 ring-brand-500/40'
                    : 'bg-zinc-900/60 hover:bg-zinc-900/80 border border-white/[0.08] hover:border-white/[0.14]'
                }`}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '160px' }}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => toggleExpand(b.id)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors mt-0.5 cursor-pointer shrink-0"
                      title={isExpanded ? 'Recolher questões' : 'Expandir questões'}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm sm:text-base font-semibold text-zinc-100 truncate">
                          {b.title}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 shrink-0">
                          {totalQ} {totalQ === 1 ? 'questão' : 'questões'}
                        </span>
                      </div>

                      {b.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{b.description}</p>
                      )}

                      {/* Origin Pages & Tags Row */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {/* Page Link */}
                        {b.linkedPages && b.linkedPages.length > 0 ? (
                          b.linkedPages.map((p) => {
                            const pageTitle = getPageTitle?.(p.id) || p.title || 'Caderno';
                            return (
                              <button
                                key={p.id}
                                onClick={() => onNavigateToPage(p.id)}
                                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/25 flex items-center gap-1 transition-colors cursor-pointer"
                                title={`Abrir página "${pageTitle}" no Caderno`}
                              >
                                <FileText size={11} />
                                <span className="truncate max-w-xs">{pageTitle}</span>
                                <ExternalLink size={10} className="opacity-70" />
                              </button>
                            );
                          })
                        ) : b.page_id ? (
                          <button
                            onClick={() => onNavigateToPage(b.page_id!)}
                            className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/25 flex items-center gap-1 transition-colors cursor-pointer"
                            title={`Abrir página "${getPageTitle?.(b.page_id) || 'Caderno'}" no Caderno`}
                          >
                            <FileText size={11} />
                            <span className="truncate max-w-xs">{getPageTitle?.(b.page_id) || 'Caderno'}</span>
                            <ExternalLink size={10} className="opacity-70" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-400 flex items-center gap-1">
                            <Zap size={10} className="text-amber-400" />
                            <span>Bateria Avulsa</span>
                          </span>
                        )}

                        {/* Tags */}
                        {(b.tags || []).slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-zinc-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Right) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onPlayBattery(b)}
                      className="px-3 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                      title="Praticar no Modo Foco"
                    >
                      <Play size={13} className="fill-brand-300" />
                      <span className="hidden sm:inline">Praticar</span>
                    </button>

                    <button
                      onClick={() => onEditBattery(b)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                      title="Editar bateria"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      onClick={() => setBatteryPendingDelete(b)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer"
                      title="Mover para lixeira"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Progress Mini Bar */}
                {totalQ > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-zinc-400">
                    <div className="flex items-center gap-3">
                      <span>
                        {answeredQ}/{totalQ} respondidas
                      </span>
                      {answeredQ > 0 && (
                        <span className={accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400'}>
                          • {accuracy}% acertos
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Questions Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2.5">
                    {b.questions.map((q, idx) => {
                      const attempt = b.latestAttempts?.[q.id];
                      const isAnswered = Boolean(attempt);
                      const isCorrect = attempt ? attempt.is_correct : false;

                      return (
                        <div
                          key={q.id}
                          className="p-3 rounded-xl bg-zinc-950/60 border border-white/[0.04] flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="font-mono text-zinc-500 text-[11px] shrink-0 mt-0.5">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-zinc-200 leading-relaxed font-medium">
                                {q.question || 'Questão sem enunciado cadastrado'}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-zinc-400">
                                <span className="font-mono uppercase bg-white/5 px-1.5 py-0.5 rounded">
                                  {q.type === 'multiple_choice' ? 'Múltipla Escolha' : 'Discursiva'}
                                </span>
                                {(q.tags || []).map((t) => (
                                  <span key={t} className="text-zinc-500">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {isAnswered ? (
                              isCorrect ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                                  <CheckCircle2 size={11} />
                                  <span>Acertou</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/25">
                                  <XCircle size={11} />
                                  <span>Errou</span>
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-zinc-500 border border-white/10">
                                Pendente
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {batteryPendingDelete && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4"
            onClick={() => setBatteryPendingDelete(null)}
          >
            <div
              className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/10 text-rose-400 shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Excluir Bateria</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Deseja realmente mover a bateria <strong className="text-zinc-200">"{batteryPendingDelete.title || 'Sem título'}"</strong> ({batteryPendingDelete.questions.length} questões) para a lixeira?
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={() => setBatteryPendingDelete(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = batteryPendingDelete.id;
                    setBatteryPendingDelete(null);
                    onDeleteBattery(id);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-sm"
                >
                  Excluir Bateria
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
});
