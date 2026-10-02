import type { CultureType } from './culture';

export type RecommendationTier = 'recent' | 'classic' | 'hidden_gem' | 'trending' | 'upcoming';

export type SerendipityMode = 'safe' | 'explore';

export interface RawAIRecommendation {
  title: string;
  original_title?: string;
  type: CultureType;
  year?: number;
  tier: RecommendationTier;
  cluster: string;
  creator?: string; // e.g. "Dir. Denis Villeneuve", "Estúdio MAPPA", "Autor: Philip K. Dick"
  affinity_reason: string;
  confidence_score: number;
  release_date?: string;
  expected_release_date?: string;
  search_hint?: string;
}

export interface HydratedRecommendation extends RawAIRecommendation {
  id: string;
  synopsis?: string;
  cover_image?: string;
  api_id?: string;
  api_source?: 'jikan' | 'tvmaze' | 'imdb' | 'books' | 'itunes';
  rating?: number;
  episodes_count?: number | null;
  status?: string;
  genres?: string[];
  already_in_library?: boolean;
}

export interface RecommendationCluster {
  id: string;
  title: string;
  description: string;
  items: HydratedRecommendation[];
}

export interface DislikedCultureItem {
  id: string;
  title: string;
  type: CultureType;
  disliked_at: string;
  reason?: 'not_interested' | 'seen_and_disliked' | 'bad_recommendation';
}

export interface IgnoredCultureItem {
  id: string;
  title: string;
  type: CultureType;
  ignored_at: string;
  already_watched: boolean;
}

export interface CachedRecommendations {
  id: string;
  clusters: RecommendationCluster[];
  generated_at: string;
  expires_at: string;
  library_hash: string;
}

export type RecommendationFilterTab = 'all' | 'recent' | 'classic' | 'hidden_gem' | 'upcoming';
