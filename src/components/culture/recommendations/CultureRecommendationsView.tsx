import React, { useState, useCallback } from 'react';
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

import { RecommendationProgressBar } from './RecommendationProgressBar';

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
    generationProgress,
    expandingClusterId,
    expandCluster,
    expandError,
    refresh,
    handleAddItem,
    handleDislikeItem,
    handleMarkAlreadySeen,
  } = useRecommendations(onLibraryUpdated);

  const [selectedItem, setSelectedItem] = useState<HydratedRecommendation | null>(null);

  const handleItemClick = useCallback((item: HydratedRecommendation) => {
    setSelectedItem(item);
  }, []);

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

          {/* Edge AI / Hybrid Engine Toggle */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs px-2.5">
            <span className="text-zinc-400 font-medium" title="Usa motor local WebGPU em vez de IA na Nuvem">Edge AI</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                defaultChecked={localStorage.getItem('culture_rec_use_edge') === 'true'}
                onChange={(e) => {
                  localStorage.setItem('culture_rec_use_edge', e.target.checked.toString());
                  window.location.reload(); // Reload to re-mount hook with new service
                }}
              />
              <div className="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
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

      {/* Subtle Hairline Loader Bar at the top (Zero Layout Shift) */}
      <div
        className={`w-full h-0.5 -mt-3 mb-1 overflow-hidden transition-opacity duration-300 ${
          isGenerating ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-brand-500 transition-all duration-300 rounded-full"
          style={{ width: `${Math.max(5, generationProgress.progressPercent)}%` }}
        />
      </div>

      {/* Progressive Batching Visual Feedback (Floating Zero-CLS Dock) */}
      <RecommendationProgressBar
        isActive={generationProgress.isActive}
        currentBatch={generationProgress.currentBatch}
        totalBatches={generationProgress.totalBatches}
        message={generationProgress.message}
        progressPercent={generationProgress.progressPercent}
        totalItemsCount={generationProgress.totalItemsCount}
      />

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

      {/* Expansion error banner */}
      {expandError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <span>{expandError}</span>
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
              onItemClick={handleItemClick}
              onExpandCluster={expandCluster}
              isExpanding={expandingClusterId === cluster.id}
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
