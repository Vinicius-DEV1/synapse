import { Sparkles, Loader2 } from 'lucide-react';

export function RecommendationSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      {/* Informative loading banner */}
      <div className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
        <Loader2 size={18} className="animate-spin text-amber-400 flex-shrink-0" />
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="font-semibold tracking-wide flex items-center gap-1.5">
            <Sparkles size={12} className="animate-pulse" />
            Curadoria Inteligente em andamento
          </span>
          <span className="text-amber-300/80">
            O Gemini está analisando seus gostos culturais, checando lançamentos de hoje e buscando sinopses...
          </span>
        </div>
      </div>

      {/* Cluster Silhouettes */}
      {[1, 2].map((clusterIdx) => (
        <div key={clusterIdx} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10 animate-pulse" />
            <div className="h-5 w-48 bg-white/10 rounded-md animate-pulse" />
            <div className="h-4 w-20 bg-white/5 rounded-full animate-pulse" />
            <div className="flex-1 h-px bg-white/5 ml-2" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5].map((cardIdx) => (
              <div
                key={cardIdx}
                className="flex flex-col bg-zinc-900/60 border border-white/5 rounded-xl overflow-hidden shadow-sm animate-pulse"
              >
                <div className="aspect-[2/3] w-full bg-white/5" />
                <div className="p-3.5 flex flex-col gap-2.5">
                  <div className="h-4 w-3/4 bg-white/10 rounded" />
                  <div className="h-3 w-full bg-white/5 rounded" />
                  <div className="h-3 w-4/5 bg-white/5 rounded" />
                  <div className="h-7 w-full bg-white/10 rounded-lg mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
