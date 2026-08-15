export interface AnkiStatsSummary {
  studiedToday: number;
  newCardsLearnedToday: number;
  totalCards: number;
  retentionRate: number;
  streak: number;
  avgStability: number;
  avgDifficulty: number;
}

export const ANKI_STATS_COLORS = {
  new: '#3b82f6', // blue-500
  learning: '#f59e0b', // amber-500
  mature: '#10b981', // emerald-500
  errei: '#ef4444', // red-500
  dificil: '#f97316', // orange-500
  bom: '#22c55e', // green-500
  facil: '#3b82f6', // blue-500
};

export function computeAnkiStats(reviews: any[], cards: any[]) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // --- Basic Stats ---
  let studiedToday = 0;
  let correctReviews = 0;

  // --- Streak Calculation ---
  const reviewDates = new Set(reviews.filter(r => r.reviewed_at).map(r => r.reviewed_at.split('T')[0]));
  let streak = 0;
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  if (reviewDates.has(todayStr) || reviewDates.has(yesterdayStr)) {
    let currDate = reviewDates.has(todayStr) ? new Date(now) : new Date(now.getTime() - 86400000);
    while (true) {
      const dateStr = currDate.toISOString().split('T')[0];
      if (reviewDates.has(dateStr)) {
        streak++;
        currDate.setDate(currDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // --- Button Ratings (Last 30 days) ---
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

  // --- Heatmap Data (Last 52 weeks / 364 days) ---
  const heatmapMap = new Map<string, number>();
  for (let i = 363; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    heatmapMap.set(d.toISOString().split('T')[0], 0);
  }

  // --- Cards Created Data (Last 30 days) ---
  const createdMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    createdMap.set(d.toISOString().split('T')[0], 0);
  }

  reviews.forEach(r => {
    if (!r.reviewed_at) return;
    const dateStr = r.reviewed_at.split('T')[0];

    if (heatmapMap.has(dateStr)) {
      heatmapMap.set(dateStr, heatmapMap.get(dateStr)! + 1);
    }

    if (dateStr === todayStr) {
      studiedToday++;
      if (r.rating > 1) correctReviews++;
    }

    if (r.reviewed_at >= thirtyDaysAgo) {
      if (r.rating >= 1 && r.rating <= 4) ratingCounts[r.rating as keyof typeof ratingCounts]++;
    }
  });

  const retention = studiedToday > 0 ? Math.round((correctReviews / studiedToday) * 100) : 0;

  // --- Cards processing ---
  let newCards = 0;
  let learningCards = 0;
  let matureCards = 0;
  let totalStability = 0;
  let stablityCount = 0;
  let totalDifficulty = 0;
  let difficultyCount = 0;

  cards.forEach(c => {
    // Created history
    if (c.created_at) {
      const dStr = c.created_at.split('T')[0];
      if (createdMap.has(dStr)) {
        createdMap.set(dStr, createdMap.get(dStr)! + 1);
      }
    }

    // Maturity
    const state = Number(c.state) || 0;
    const stability = Number(c.stability) || 0;

    if (state === 0) newCards++;
    else if (state === 1 || state === 3) learningCards++;
    else if (state === 2) {
      if (stability >= 21) matureCards++;
      else learningCards++;
    }

    // FSRS
    if (stability > 0) {
      totalStability += stability;
      stablityCount++;
    }
    if (Number(c.difficulty) > 0) {
      totalDifficulty += Number(c.difficulty);
      difficultyCount++;
    }
  });

  const avgStability = stablityCount > 0 ? Math.round(totalStability / stablityCount) : 0;
  const avgDifficulty = difficultyCount > 0 ? (totalDifficulty / difficultyCount).toFixed(1) : '0.0';

  // Format Data for Recharts
  const formattedHeatmap = Array.from(heatmapMap.entries()).map(([date, count]) => ({ date, count }));
  const formattedHistory = formattedHeatmap.slice(-14).map(h => {
    const d = new Date(h.date);
    return { name: `${d.getDate()}/${d.getMonth() + 1}`, revisoes: h.count };
  });

  const formattedCreated = Array.from(createdMap.entries()).map(([date, count]) => {
    const d = new Date(date);
    return { name: `${d.getDate()}/${d.getMonth() + 1}`, criados: count };
  });

  const formattedMaturity = [
    { name: 'Novos', value: newCards, color: ANKI_STATS_COLORS.new },
    { name: 'Aprendendo', value: learningCards, color: ANKI_STATS_COLORS.learning },
    { name: 'Maduros', value: matureCards, color: ANKI_STATS_COLORS.mature }
  ].filter(d => d.value > 0);

  const formattedRating = [
    { name: 'Errei', value: ratingCounts[1], color: ANKI_STATS_COLORS.errei },
    { name: 'Difícil', value: ratingCounts[2], color: ANKI_STATS_COLORS.dificil },
    { name: 'Bom', value: ratingCounts[3], color: ANKI_STATS_COLORS.bom },
    { name: 'Fácil', value: ratingCounts[4], color: ANKI_STATS_COLORS.facil }
  ].filter(d => d.value > 0);

  // Forecast calculation (Next 14 days)
  const forecastMap = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    forecastMap.set(d.toISOString().split('T')[0], 0);
  }

  cards.forEach(c => {
    if (!c.due_date) return;
    const dueDateStr = c.due_date.split('T')[0];
    if (dueDateStr <= todayStr) {
      if (c.state > 0) {
        forecastMap.set(todayStr, forecastMap.get(todayStr)! + 1);
      }
    } else if (forecastMap.has(dueDateStr)) {
      forecastMap.set(dueDateStr, forecastMap.get(dueDateStr)! + 1);
    }
  });

  const formattedForecast = Array.from(forecastMap.entries()).map(([date, count]) => {
    const d = new Date(date);
    return {
      name: date === todayStr ? 'Hoje' : `${d.getDate()}/${d.getMonth() + 1}`,
      futuras: count
    };
  });

  const summaryStats: AnkiStatsSummary = {
    studiedToday,
    newCardsLearnedToday: 0,
    totalCards: cards.length,
    retentionRate: retention,
    streak,
    avgStability,
    avgDifficulty: parseFloat(avgDifficulty as string)
  };

  return {
    summaryStats,
    historyData: formattedHistory,
    forecastData: formattedForecast,
    maturityData: formattedMaturity,
    ratingData: formattedRating,
    cardsCreatedData: formattedCreated,
    heatmapData: formattedHeatmap
  };
}
