import React, { useEffect, useState } from 'react';
import { ArrowLeft, BrainCircuit, Activity, CheckCircle2, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface AnkiStatsProps {
  onBack: () => void;
}

export default function AnkiStats({ onBack }: AnkiStatsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    studiedToday: 0,
    newCardsLearnedToday: 0,
    totalCards: 0,
    retentionRate: 0,
  });
  
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let allReviews: any[] = [];
      let allCards: any[] = [];

      if (window.api?.anki) {
        // Fetch reviews
        const revRes = await window.api.anki.getReviews?.();
        if (revRes?.success && revRes.reviews) allReviews = revRes.reviews;
        else if (Array.isArray(revRes)) allReviews = revRes;

        // Fetch cards from all decks
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

      // De-duplicate cards just in case
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
    
    let studiedToday = 0;
    let newCardsLearnedToday = 0;
    let correctReviews = 0;

    // Heatmap / History calculation (Last 14 days)
    const historyMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      historyMap.set(d.toISOString().split('T')[0], 0);
    }

    reviews.forEach(r => {
      if (!r.reviewed_at) return;
      const dateStr = r.reviewed_at.split('T')[0];
      
      // Update history map
      if (historyMap.has(dateStr)) {
        historyMap.set(dateStr, historyMap.get(dateStr)! + 1);
      }

      // Today's stats
      if (dateStr === todayStr) {
        studiedToday++;
        if (r.rating > 1) correctReviews++; // Assuming 1 is "Errei", >1 is pass
      }
    });

    const retention = studiedToday > 0 ? Math.round((correctReviews / studiedToday) * 100) : 0;

    const formattedHistory = Array.from(historyMap.entries()).map(([date, count]) => {
      const d = new Date(date);
      return {
        name: `${d.getDate()}/${d.getMonth() + 1}`,
        revisoes: count
      };
    });

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
      
      // If card is due today or in the past, it counts for today's forecast
      if (dueDateStr <= todayStr) {
        if (c.state > 0) { // Only count if not new
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
      newCardsLearnedToday,
      totalCards: cards.length,
      retentionRate: retention,
    });
    setHistoryData(formattedHistory);
    setForecastData(formattedForecast);
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-bg text-dark-text p-8 overflow-y-auto relative animate-fade-in" style={{ height: '100dvh' }}>
      <div className="max-w-5xl mx-auto w-full space-y-8 pb-20">
        
        {/* Header */}
        <header className="flex justify-between items-center pb-8 border-b border-white/5">
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
            
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-dark-card border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/20 flex items-center justify-center rounded-xl text-indigo-400">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-dark-subtext text-sm">Estudados Hoje</p>
                  <p className="text-3xl font-bold text-white">{stats.studiedToday}</p>
                </div>
              </div>
              
              <div className="bg-dark-card border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 flex items-center justify-center rounded-xl text-green-400">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-dark-subtext text-sm">Taxa de Retenção (Hoje)</p>
                  <p className="text-3xl font-bold text-white">{stats.retentionRate}%</p>
                </div>
              </div>

              <div className="bg-dark-card border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 flex items-center justify-center rounded-xl text-blue-400">
                  <BrainCircuit size={24} />
                </div>
                <div>
                  <p className="text-dark-subtext text-sm">Total de Cartões</p>
                  <p className="text-3xl font-bold text-white">{stats.totalCards}</p>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* History Chart */}
              <div className="bg-dark-card border border-white/5 p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="text-indigo-400" size={20} />
                  <h3 className="text-lg font-semibold text-white">Histórico (Últimos 14 dias)</h3>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: '#ffffff05' }}
                        contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#ffffff10', borderRadius: '8px' }}
                      />
                      <Bar dataKey="revisoes" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revisões" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Forecast Chart */}
              <div className="bg-dark-card border border-white/5 p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <CalendarIcon className="text-orange-400" size={20} />
                  <h3 className="text-lg font-semibold text-white">Previsão (Próximos 14 dias)</h3>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: '#ffffff05' }}
                        contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#ffffff10', borderRadius: '8px' }}
                      />
                      <Bar dataKey="futuras" fill="#f97316" radius={[4, 4, 0, 0]} name="A Revisar" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
