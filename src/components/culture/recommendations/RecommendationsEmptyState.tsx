import { Sparkles, RefreshCw } from 'lucide-react';

interface Props {
  onGenerate: () => void;
  isLoading: boolean;
  message?: string;
}

export function RecommendationsEmptyState({
  onGenerate,
  isLoading,
  message,
}: Props) {
  return (
    <div className="h-96 flex flex-col items-center justify-center text-center p-8 border border-white/5 rounded-2xl bg-zinc-900/30">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
        <Sparkles size={28} className="animate-pulse" />
      </div>

      <h3 className="text-base font-semibold text-zinc-100 mb-1.5">
        Descubra Novas Obras Feitas Para Você
      </h3>

      <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
        {message ||
          'Nossa IA analisa suas obras favoritas, finalizadas e metas para recomendar animes, filmes, séries e livros perfeitamente alinhados ao seu gosto.'}
      </p>

      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        <span>{isLoading ? 'Analisando e Gerando...' : 'Gerar Recomendações'}</span>
      </button>
    </div>
  );
}
