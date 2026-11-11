import { useState } from 'react';
import type { CultureItem } from '../../../types';
import { CultureService } from '../../../services/culture';
import {
  fetchImdbMovies,
  fetchImdbSeries,
  fetchJikan,
  fetchGoogleBooks,
  fetchCinemetaMetadata,
  type CultureSearchResult,
} from '../../../services/culture/culture-apis';

export function useCultureMetadataRefresh(
  currentItem: CultureItem,
  setCurrentItem: React.Dispatch<React.SetStateAction<CultureItem>>,
  onUpdate?: () => void
) {
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleRefreshMetadata = async () => {
    setRefreshing(true);
    setFeedbackMessage(null);
    try {
      let match: CultureSearchResult | null = null;
      if (currentItem.type === 'filme') {
        const res = await fetchImdbMovies(currentItem.title);
        match = res[0] || null;
      } else if (currentItem.type === 'série') {
        const res = await fetchImdbSeries(currentItem.title);
        match = res[0] || null;
      } else if (currentItem.type === 'anime') {
        const res = await fetchJikan(currentItem.title, 'anime');
        match = res[0] || null;
      } else if (currentItem.type === 'livro') {
        const res = await fetchGoogleBooks(currentItem.title);
        match = res[0] || null;
      }

      if (match && (match.cover || match.synopsis || match.api_id)) {
        let extraCinemeta: Partial<CultureSearchResult> | null = null;
        if (match.api_id?.startsWith('tt')) {
          extraCinemeta = await fetchCinemetaMetadata(match.api_id, currentItem.type === 'série' ? 'series' : 'movie');
        }

        const updatedFields: Partial<CultureItem> = {
          cover_image: match.cover || currentItem.cover_image,
          synopsis: (match.synopsis && match.synopsis.length > 20) ? match.synopsis : currentItem.synopsis,
          api_id: match.api_id || currentItem.api_id,
          api_source: (match.api_source as CultureItem['api_source']) || currentItem.api_source,
          trailer_url: extraCinemeta?.trailer_url || match.trailer_url || currentItem.trailer_url,
          trailer_yt_id: extraCinemeta?.trailer_yt_id || match.trailer_yt_id || currentItem.trailer_yt_id,
        };

        await CultureService.updateItem(currentItem.id, { ...currentItem, ...updatedFields });
        setCurrentItem(prev => ({ ...prev, ...updatedFields }));
        setFeedbackMessage('Capa e dados oficiais atualizados!');
        onUpdate?.();
      } else {
        setFeedbackMessage('Nenhuma informação nova encontrada para este título.');
      }
    } catch (err: unknown) {
      console.error('[useCultureMetadataRefresh] Erro ao sincronizar metadados:', err);
      setFeedbackMessage('Erro ao consultar bases externas.');
    } finally {
      setRefreshing(false);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  return {
    refreshing,
    feedbackMessage,
    setFeedbackMessage,
    handleRefreshMetadata,
  };
}
