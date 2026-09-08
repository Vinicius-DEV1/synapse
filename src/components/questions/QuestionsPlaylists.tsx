import React, { useState } from 'react';
import { AlertTriangle, Sparkles, Shuffle, Play, Tag, Filter, Check } from 'lucide-react';
import type { StudyFilterOptions, GeneratedStudySession } from '../../services/quiz/quizSimulator';
import { generateErrorNotebook, generateFilteredStudySession } from '../../services/quiz/quizSimulator';

interface QuestionsPlaylistsProps {
  onStartSession: (session: GeneratedStudySession) => void;
  availableTags: string[];
  errorCount: number;
}

export const QuestionsPlaylists = React.memo(function QuestionsPlaylists({
  onStartSession,
  availableTags,
  errorCount,
}: QuestionsPlaylistsProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [questionLimit, setQuestionLimit] = useState<number>(10);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unanswered' | 'incorrect'>('all');
  const [shuffle, setShuffle] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleLaunchErrors = async () => {
    if (!window.api?.quiz) return;
    setIsGenerating(true);
    try {
      const session = await generateErrorNotebook(window.api.quiz);
      if (session) {
        onStartSession(session);
      }
    } catch (err) {
      console.error('[QuestionsPlaylists] Falha ao gerar caderno de erros:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunchCustomSimulado = async () => {
    if (!window.api?.quiz) return;
    setIsGenerating(true);
    try {
      const options: StudyFilterOptions = {
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        limit: questionLimit,
        status: selectedStatus,
        shuffle,
      };

      const session = await generateFilteredStudySession(window.api.quiz, options);
      if (session) {
        onStartSession(session);
      }
    } catch (err) {
      console.error('[QuestionsPlaylists] Falha ao gerar simulado:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Caderno de Erros Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-rose-500/[0.04] border border-rose-500/20 hover:border-rose-500/30 transition-all space-y-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-semibold text-zinc-100">Caderno de Erros</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Pratique uma bateria dinâmica com todas as questões que você errou na última resolução para consolidar o aprendizado e zerar seus pontos fracos.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-rose-500/10">
          <span className="text-xs font-mono text-zinc-400">
            {errorCount === 1 ? '1 questão pendente de revisão' : `${errorCount} questões pendentes de revisão`}
          </span>

          <button
            onClick={handleLaunchErrors}
            disabled={errorCount === 0 || isGenerating}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
          >
            <Play size={13} className="fill-white" />
            <span>Iniciar Caderno de Erros</span>
          </button>
        </div>
      </div>

      {/* Custom Simulado Builder */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/60 border border-white/[0.08] space-y-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-zinc-100">Simulado Personalizado</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Escolha matérias, quantidade de questões e filtro de status para treinar em foco absoluto.
            </p>
          </div>
        </div>

        {/* Tag Selector */}
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Tag size={13} className="text-brand-400" />
            <span>Filtrar por Matérias / Tags:</span>
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
            {availableTags.length === 0 ? (
              <span className="text-xs text-zinc-500">Nenhuma tag cadastrada.</span>
            ) : (
              availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-brand-500/20 border-brand-500/40 text-brand-300 font-medium'
                        : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                    <span>#{tag}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Quantity and Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
          {/* Question Count */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Quantidade de Questões:</label>
            <div className="flex items-center gap-1.5">
              {[5, 10, 20, 30, 50].map((num) => (
                <button
                  key={num}
                  onClick={() => setQuestionLimit(num)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
                    questionLimit === num
                      ? 'bg-brand-500/20 border-brand-500/40 text-brand-300 font-semibold'
                      : 'bg-zinc-900 border-white/[0.06] text-zinc-400 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
              <Filter size={12} />
              <span>Critério de Inclusão:</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                  selectedStatus === 'all'
                    ? 'bg-white/15 border-white/20 text-white font-medium'
                    : 'bg-zinc-900 border-white/[0.06] text-zinc-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedStatus('unanswered')}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                  selectedStatus === 'unanswered'
                    ? 'bg-white/15 border-white/20 text-white font-medium'
                    : 'bg-zinc-900 border-white/[0.06] text-zinc-400 hover:text-white'
                }`}
              >
                Não Respondidas
              </button>
              <button
                onClick={() => setSelectedStatus('incorrect')}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                  selectedStatus === 'incorrect'
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-300 font-medium'
                    : 'bg-zinc-900 border-white/[0.06] text-zinc-400 hover:text-white'
                }`}
              >
                Apenas Erros
              </button>
            </div>
          </div>
        </div>

        {/* Shuffle and Submit */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-zinc-200">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
              className="accent-brand-500 rounded"
            />
            <Shuffle size={13} />
            <span>Embaralhar ordem das questões</span>
          </label>

          <button
            onClick={handleLaunchCustomSimulado}
            disabled={isGenerating}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Play size={13} className="fill-white" />
            <span>Iniciar Simulado</span>
          </button>
        </div>
      </div>
    </div>
  );
});
