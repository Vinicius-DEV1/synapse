import { useState, useEffect, useCallback, useRef } from 'react';
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

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let allReviews: any[] = [];
      let allCards: any[] = [];

      if (window.api?.anki) {
        const revRes = await window.api.anki.getReviews?.();
        if (revRes?.success && revRes.reviews) allReviews = revRes.reviews;
        else if (Array.isArray(revRes)) allReviews = revRes;

        // Fetch all cards globally in one pass
        const cRes = await window.api.anki.getAllCards();
        if (cRes?.success && cRes.cards) {
          allCards = cRes.cards;
        } else if (Array.isArray(cRes)) {
          allCards = cRes;
        }
      }

      if (!isMountedRef.current) return;

      const uniqueCardsMap = new Map();
      allCards.forEach((c) => uniqueCardsMap.set(c.id, c));
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
      if (isMountedRef.current) console.error('Failed to load stats data:', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
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
