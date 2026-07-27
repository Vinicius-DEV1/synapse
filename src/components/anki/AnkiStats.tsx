import React, { useEffect, useState } from 'react';
import { ArrowLeft, BrainCircuit, Activity, CheckCircle2, TrendingUp, Calendar as CalendarIcon, Flame, Target, Zap, PlusCircle } from 'lucide-react';
import { ActivityHeatmap } from './stats/ActivityHeatmap';
import { MaturityPieChart } from './stats/MaturityPieChart';
import { RatingDistributionChart } from './stats/RatingDistributionChart';
import { CreationLineChart } from './stats/CreationLineChart';
import { ForecastBarChart } from './stats/ForecastBarChart';
interface AnkiStatsProps {
  onBack: () => void;
}

const COLORS = {
  new: '#3b82f6', // blue-500
  learning: '#f59e0b', // amber-500
  mature: '#10b981', // emerald-500
  errei: '#ef4444', // red-500
  dificil: '#f97316', // orange-500
  bom: '#22c55e', // green-500
  facil: '#3b82f6', // blue-500
};

export default function AnkiStats({ onBack }: AnkiStatsProps) {
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let allReviews: any[] = [];
      let allCards: any[] = [];

      if (window.api?.anki) {
        const revRes = await window.api.anki.getReviews?.();
        if (revRes?.success && revRes.reviews) allReviews = revRes.reviews;
        else if (Array.isArray(revRes)) allReviews = revRes;

        const decksRes = await window.api.anki.getDecks();
        let decks = [];
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

      calculateStats(allReviews, uniqueCards);
    } catch (err) {
      console.error('Failed to load stats data:', err);
    }
    setLoading(false);
  };

  const calculateStats = (reviews: any[], cards: any[]) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // --- Basic Stats ---
    let studiedToday = 0;
    let correctReviews = 0;

    // --- Streak Calculation ---
    const reviewDates = new Set(reviews.filter(r => r.reviewed_at).map(r => r.reviewed_at.split('T')[0]));
    let streak = 0;
    let checkDate = new Date(now);
    // If user studied today or yesterday, streak starts
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    if (reviewDates.has(todayStr) || reviewDates.has(yesterdayStr)) {
        let currDate = reviewDates.has(todayStr) ? new Date(now) : new Date(now.getTime() - 86400000);
        while(true) {
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
    let ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
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
    const avgDifficulty = difficultyCount > 0 ? (totalDifficulty / difficultyCount).toFixed(1) : "0.0";

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
        { name: 'Novos', value: newCards, color: COLORS.new },
        { name: 'Aprendendo', value: learningCards, color: COLORS.learning },
        { name: 'Maduros', value: matureCards, color: COLORS.mature }
    ].filter(d => d.value > 0);

    const formattedRating = [
        { name: 'Errei', value: ratingCounts[1], color: COLORS.errei },
        { name: 'Difícil', value: ratingCounts[2], color: COLORS.dificil },
        { name: 'Bom', value: ratingCounts[3], color: COLORS.bom },
        { name: 'Fácil', value: ratingCounts[4], color: COLORS.facil }
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

    setStats({
      studiedToday,
      newCardsLearnedToday: 0,
      totalCards: cards.length,
      retentionRate: retention,
      streak,
      avgStability,
      avgDifficulty: parseFloat(avgDifficulty as string)
    });
    
    setHistoryData(formattedHistory);
    setForecastData(formattedForecast);
    setMaturityData(formattedMaturity);
    setRatingData(formattedRating);
    setCardsCreatedData(formattedCreated);
    setHeatmapData(formattedHeatmap);
  };


  return (
    <div className="w-full animate-fade-in pb-20">
      <div className="w-full">
        <header className="mb-8 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2 text-dark-subtext hover:text-white cursor-pointer w-fit transition-colors" onClick={onBack}>
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Voltar para Baralhos</span>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="w-8 h-8 text-indigo-500" />
              Estatísticas
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-dark-subtext">
            Calculando estatísticas...
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              
              <div className="bg-dark-card border border-white/5 p-4 md:p-6 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-orange-500/20 flex items-center justify-center rounded-xl text-orange-400">
                    <Flame size={20} />
                  </div>
                  <p className="text-dark-subtext text-xs md:text-sm">Ofensiva</p>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white">{stats.streak} <span className="text-base text-dark-subtext font-normal">dias</span></p>
              </div>

              <div className="bg-dark-card border border-white/5 p-4 md:p-6 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-indigo-500/20 flex items-center justify-center rounded-xl text-indigo-400">
                    <CheckCircle2 size={20} />
                  </div>
                  <p className="text-dark-subtext text-xs md:text-sm">Estudados Hoje</p>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white">{stats.studiedToday}</p>
              </div>
              
              <div className="bg-dark-card border border-white/5 p-4 md:p-6 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-500/20 flex items-center justify-center rounded-xl text-green-400">
                    <TrendingUp size={20} />
                  </div>
                  <p className="text-dark-subtext text-xs md:text-sm">Retenção (Hoje)</p>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white">{stats.retentionRate}%</p>
              </div>

              <div className="bg-dark-card border border-white/5 p-4 md:p-6 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-500/20 flex items-center justify-center rounded-xl text-blue-400">
                    <BrainCircuit size={20} />
                  </div>
                  <p className="text-dark-subtext text-xs md:text-sm">Total de Cartões</p>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalCards}</p>
              </div>

            </div>

            {/* FSRS Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dark-card border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/20 flex items-center justify-center rounded-xl text-emerald-400">
                        <Target size={24} />
                    </div>
                    <div>
                        <p className="text-dark-subtext text-sm mb-1">Estabilidade Média (FSRS)</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-white">{stats.avgStability}</p>
                            <p className="text-sm text-dark-subtext">dias até esquecer</p>
                        </div>
                    </div>
                </div>
                <div className="bg-dark-card border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-500/20 flex items-center justify-center rounded-xl text-rose-400">
                        <Zap size={24} />
                    </div>
                    <div>
                        <p className="text-dark-subtext text-sm mb-1">Dificuldade Média (FSRS)</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-white">{stats.avgDifficulty}</p>
                            <p className="text-sm text-dark-subtext">/ 10 (nível do baralho)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Heatmap Section */}
            <ActivityHeatmap heatmapData={heatmapData} />

            {/* Pies and distributions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Maturity Pie Chart */}
                <MaturityPieChart maturityData={maturityData} />

                {/* Rating Distribution */}
                <RatingDistributionChart ratingData={ratingData} />

            </div>

            {/* Lines and Bars Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Cards Created Chart */}
              <CreationLineChart cardsCreatedData={cardsCreatedData} />

              {/* Forecast Chart */}
              <ForecastBarChart forecastData={forecastData} />

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
