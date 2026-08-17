import { useState, useEffect, useCallback } from 'react';
import { computeAnkiStats, type AnkiStatsSummary } from '../stats/ankiStatsCalculator';

export function useAnkiStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnkiStatsSummary>({
    studiedToday: 0,
    newCardsLearnedToday: 0,
    totalCards: 0,
    retentionRate: 0,
    streak: 0,
    avgStability: 0,
    avgDifficulty: 0
  });

  const [historyData, setHistoryData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [maturityData, setMaturityData] = useState<any[]>([]);
  const [ratingData, setRatingData] = useState<any[]>([]);
  const [cardsCreatedData, setCardsCreatedData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let allReviews: any[] = [];
      let allCards: any[] = [];

      if (window.api?.anki) {
        const revRes = await (window.api.anki as any).getReviews?.();
        if (revRes?.success && revRes.reviews) allReviews = revRes.reviews;
        else if (Array.isArray(revRes)) allReviews = revRes;

        const decksRes = await window.api.anki.getDecks();
        let decks: any[] = [];
        if (decksRes?.success && decksRes.decks) decks = decksRes.decks;
        else if (Array.isArray(decksRes)) decks = decksRes;

        for (const deck of decks) {
          const cRes = await window.api.anki.getAllCards(deck.id);
          if (cRes?.success && cRes.cards) allCards = allCards.concat(cRes.cards);
          else if (Array.isArray(cRes)) allCards = allCards.concat(cRes);
        }
      }

      const uniqueCardsMap = new Map();
      allCards.forEach(c => uniqueCardsMap.set(c.id, c));
      const uniqueCards = Array.from(uniqueCardsMap.values());

      const computed = computeAnkiStats(allReviews, uniqueCards);
      setStats(computed.summaryStats);
      setHistoryData(computed.historyData);
      setForecastData(computed.forecastData);
      setMaturityData(computed.maturityData);
      setRatingData(computed.ratingData);
      setCardsCreatedData(computed.cardsCreatedData);
      setHeatmapData(computed.heatmapData);
    } catch (err) {
      console.error('Failed to load stats data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    loading,
    stats,
    historyData,
    forecastData,
    maturityData,
    ratingData,
    cardsCreatedData,
    heatmapData,
    refreshStats: loadData
  };
}
