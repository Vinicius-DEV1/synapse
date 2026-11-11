
import React from 'react';
import type {
  RecommendationCluster,
  HydratedRecommendation,
} from '../../../types/culture-recommendations';
import { RecommendationCard } from './RecommendationCard';
import { RecommendationExpandCard } from './RecommendationExpandCard';

interface Props {
  cluster: RecommendationCluster;
  addedItemIds: Set<string>;
  onAdd: (item: HydratedRecommendation) => void;
  onDislike: (item: HydratedRecommendation) => void;
  onMarkAlreadySeen: (item: HydratedRecommendation) => void;
  onItemClick?: (item: HydratedRecommendation) => void;
  onExpandCluster?: (clusterId: string) => void;
  isExpanding?: boolean;
}

export const RecommendationClusterSection = React.memo(function RecommendationClusterSection({
  cluster,
  addedItemIds,
  onAdd,
  onDislike,
  onMarkAlreadySeen,
  onItemClick,
  onExpandCluster,
  isExpanding = false,
}: Props) {
  if (!cluster.items || cluster.items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3.5">
      {/* Cluster Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <h2 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <span>{cluster.title}</span>
            <span className="text-xs font-normal text-zinc-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">
              {cluster.items.length} sugestões
            </span>
          </h2>
          <div className="flex-1 h-px bg-white/5 ml-2" />
        </div>

        {cluster.description && (
          <p className="text-xs text-zinc-400 pl-4.5 max-w-2xl leading-relaxed">
            {cluster.description}
          </p>
        )}
      </div>

      {/* Grid of Recommendation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {cluster.items.map(item => (
          <RecommendationCard
            key={item.id}
            item={item}
            isAdded={addedItemIds.has(item.id) || addedItemIds.has(item.title.toLowerCase().trim())}
            onAdd={onAdd}
            onDislike={onDislike}
            onMarkAlreadySeen={onMarkAlreadySeen}
            onClick={onItemClick}
          />
        ))}

        {/* Immersive Expand Collection Card */}
        {onExpandCluster && (
          <RecommendationExpandCard
            clusterTitle={cluster.title}
            onExpand={() => onExpandCluster(cluster.id)}
            isExpanding={isExpanding}
          />
        )}
      </div>
    </section>
  );
});
