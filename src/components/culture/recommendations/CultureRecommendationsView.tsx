import React, { useState } from 'react';
import { Sparkles, RefreshCw, Award, Gem, Clock, Target, Compass } from 'lucide-react';
import type {
  RecommendationFilterTab,
  HydratedRecommendation,
} from '../../../types/culture-recommendations';
import { useRecommendations } from '../hooks/useRecommendations';
import { RecommendationClusterSection } from './RecommendationClusterSection';
import { RecommendationDetailsModal } from './RecommendationDetailsModal';
import { RecommendationSkeleton } from './RecommendationSkeleton';
import { RecommendationsEmptyState } from './RecommendationsEmptyState';

interface Props {
  onLibraryUpdated?: () => void;
}

export function CultureRecommendationsView({ onLibraryUpdated }: Props) {
  const {
    clusters,
    rawClustersCount,
    isLoading,
    isGenerating,
    error,
    activeSubFilter,
    setActiveSubFilter,
    serendipityMode,
    setSerendipityMode,
    addedItemIds,
    lastGeneratedAt,
    aiDna,
    refresh,
    handleAddItem,
    handleDislikeItem,
    handleMarkAlreadySeen,
  } = useRecommendations(onLibraryUpdated);

  const [selectedItem, setSelectedItem] = useState<HydratedRecommendation | null>(null);

  const formatLastUpdated = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `Há ${diffHours} h`;
    return date.toLocaleDateString('pt-BR');
  };

  const tabs: Array<{ id: RecommendationFilterTab; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'Todas', icon: null },
    { id: 'recent', label: 'Lançamentos', icon: <Sparkles size={12} className="text-emerald-400" /> },
    { id: 'classic', label: 'Clássicos', icon: <Award size={12} className="text-amber-400" /> },
    { id: 'hidden_gem', label: 'Joias Ocultas', icon: <Gem size={12} className="text-purple-400" /> },
    { id: 'upcoming', label: 'Em Breve', icon: <Clock size={12} className="text-cyan-400" /> },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Action and Sub-filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/5">
        {/* Tier sub-filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeSubFilter === tab.id
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 shadow-sm'
                  : 'bg-white/5 text-zinc-400 border border-transparent hover:bg-white/10 hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right tools: Serendipity mode toggle & Recalculate */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode Switcher: Safe vs Explore */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <button
              onClick={() => setSerendipityMode('safe')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                serendipityMode === 'safe'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Aposta Segura: foco em alta afinidade e escolhas familiares"
            >
              <Target size={12} />
              <span>Aposta Segura</span>
            </button>
            <button
              onClick={() => setSerendipityMode('explore')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                serendipityMode === 'explore'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Expandir Horizontes: descubra cinema internacional, cults e conexões ousadas"
            >
              <Compass size={12} />
              <span>Expandir</span>
            </button>
          </div>

          {lastGeneratedAt && (
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-500">
              <Clock size={12} />
              <span>{formatLastUpdated(lastGeneratedAt)}</span>
            </div>
          )}

          <button
            onClick={() => refresh()}
            disabled={isLoading || isGenerating}
            title="Recalcular recomendações com inteligência artificial"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={13} className={isGenerating ? 'animate-spin text-amber-400' : ''} />
            <span>{isGenerating ? 'Curando...' : 'Recalcular'}</span>
          </button>
        </div>
      </div>

      {/* Background Recalculation Notification Banner (SWR) */}
      {isGenerating && clusters.length > 0 && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs animate-fadeIn">
          <RefreshCw size={13} className="animate-spin text-amber-400 flex-shrink-0" />
          <span>Curando novas recomendações com inteligência artificial em segundo plano...</span>
        </div>
      )}

      {/* AI-Extracted Cultural Taste DNA Badge Strip */}
      {aiDna && aiDna.thematic_axes && aiDna.thematic_axes.length > 0 && !isLoading && (
        <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06] backdrop-blur-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-zinc-200">DNA Cultural Detectado pela IA</span>
            </div>
            {aiDna.emotional_atmosphere && (
              <span className="text-[11px] text-zinc-400 italic">
                "{aiDna.emotional_atmosphere}"
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {aiDna.thematic_axes.map(axis => (
              <span
                key={axis}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20"
              >
                {axis}
              </span>
            ))}
            {aiDna.core_influences && aiDna.core_influences.slice(0, 4).map(inf => (
              <span
                key={inf}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/5"
              >
                {inf}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main View Area */}
      {isLoading && clusters.length === 0 ? (
        <RecommendationSkeleton />
      ) : clusters.length === 0 ? (
        <RecommendationsEmptyState
          onGenerate={() => refresh()}
          isLoading={isGenerating}
          message={
            error ||
            (rawClustersCount > 0
              ? 'Nenhuma obra encontrada para o sub-filtro selecionado.'
              : undefined)
          }
        />
      ) : (
        <div className="flex flex-col gap-9 pb-8">
          {clusters.map(cluster => (
            <RecommendationClusterSection
              key={cluster.id}
              cluster={cluster}
              addedItemIds={addedItemIds}
              onAdd={handleAddItem}
              onDislike={handleDislikeItem}
              onMarkAlreadySeen={handleMarkAlreadySeen}
              onItemClick={setSelectedItem}
            />
          ))}
        </div>
      )}

      {/* Detailed Recommendation Inspection Modal */}
      {selectedItem && (
        <RecommendationDetailsModal
          item={selectedItem}
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          onAdd={handleAddItem}
          onDislike={(item) => {
            handleDislikeItem(item);
            setSelectedItem(null);
          }}
          onMarkAlreadySeen={(item) => {
            handleMarkAlreadySeen(item);
            setSelectedItem(null);
          }}
          isAdded={
            addedItemIds.has(selectedItem.id) ||
            addedItemIds.has(selectedItem.title.toLowerCase().trim())
          }
        />
      )}
    </div>
  );
}
