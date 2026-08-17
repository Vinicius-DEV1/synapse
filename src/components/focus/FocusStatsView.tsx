import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Activity, BookOpen, PlaySquare, Music, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getActivityLogs } from '../../services/stats-manager';
import type { ActivityLog } from '../../types';

interface FocusStatsViewProps {
  onBack: () => void;
}

export default function FocusStatsView({ onBack }: FocusStatsViewProps) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getActivityLogs();
    setLogs(data);
    setLoading(false);
  };

  const getLocalIsoDate = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  // Calculate Totals
  const totalTimeSeconds = logs.reduce((acc, log) => acc + log.duration_seconds, 0);
  const totalTimeHours = (totalTimeSeconds / 3600).toFixed(1);

  // Top Items
  const timePerItem: Record<string, { title: string; module: string; duration: number }> = {};
  logs.forEach(log => {
    if (!timePerItem[log.item_id]) {
      timePerItem[log.item_id] = { title: log.item_title, module: log.module, duration: 0 };
    }
    timePerItem[log.item_id].duration += log.duration_seconds;
  });

  const getTopItem = (module: string) => {
    const items = Object.values(timePerItem).filter(i => i.module === module);
    if (items.length === 0) return null;
    return items.reduce((prev, current) => (prev.duration > current.duration) ? prev : current);
  };

  const topLofi = getTopItem('lofi');
  const topVideo = getTopItem('video');
  const topBook = getTopItem('library');

  // Chart Data (Last 14 Days)
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return getLocalIsoDate(d);
  });

  const chartData = last14Days.map(dateStr => {
    const dayLogs = logs.filter(l => l.date === dateStr);
    const totalSecs = dayLogs.reduce((acc, l) => acc + l.duration_seconds, 0);
    const d = new Date(dateStr + 'T00:00:00'); 
    return { 
      name: `${d.getDate()}/${d.getMonth() + 1}`, 
      "Minutos": Math.round(totalSecs / 60) 
    };
  });

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-dark-bg overflow-y-auto pb-20 p-4 sm:p-6 animate-fade-in absolute inset-0 z-10">
      <header className="mb-8 border-b border-white/5 pb-6 shrink-0">
        <div className="flex items-center gap-3 mb-2 text-dark-subtext hover:text-white cursor-pointer w-fit transition-colors" onClick={onBack}>
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Voltar para o Dashboard</span>
        </div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
          <Activity className="w-8 h-8 text-brand-500" />
          Estatísticas de Atividade
        </h1>
        <p className="text-dark-subtext mt-2 text-sm max-w-2xl">
          Acompanhe o tempo investido em foco, leitura, e vídeos. Os dados são sincronizados e coletados silenciosamente em segundo plano.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-dark-subtext">
          Calculando estatísticas...
        </div>
      ) : (
        <div className="space-y-8 flex-1">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-dark-card border border-white/5 p-4 md:p-6 rounded-2xl flex flex-col justify-between shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-brand-500/20 flex items-center justify-center rounded-xl text-brand-400">
                  <Clock size={20} />
                </div>
                <p className="text-dark-subtext text-xs md:text-sm">Tempo Total</p>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">{totalTimeHours} <span className="text-base text-dark-subtext font-normal">horas</span></p>
            </div>
            
            <TopCard title="Lofi Favorito" icon={<Music size={20} />} color="text-purple-400" bg="bg-purple-500/20" item={topLofi} formatDuration={formatDuration} />
            <TopCard title="Vídeo Mais Visto" icon={<PlaySquare size={20} />} color="text-red-400" bg="bg-red-500/20" item={topVideo} formatDuration={formatDuration} />
            <TopCard title="Livro Mais Lido" icon={<BookOpen size={20} />} color="text-blue-400" bg="bg-blue-500/20" item={topBook} formatDuration={formatDuration} />
          </div>

          {/* Activity Chart */}
          <div className="bg-dark-card border border-white/5 p-4 md:p-6 rounded-2xl h-80 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-500/20 flex items-center justify-center rounded-xl text-emerald-400">
                <TrendingUp size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Atividade Diária (Últimos 14 Dias)</h2>
                <p className="text-xs text-dark-subtext">Tempo total consolidado em minutos.</p>
              </div>
            </div>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFocusStats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#10b981" opacity={0.3} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#10b981" opacity={0.3} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px', padding: '4px 8px' }} 
                    itemStyle={{ color: '#6ee7b7', fontWeight: 'bold' }} 
                    cursor={{fill: '#27272a', opacity: 0.4}} 
                  />
                  <Bar dataKey="Minutos" fill="url(#colorFocusStats)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TopCard({ title, icon, color, bg, item, formatDuration }: any) {
  return (
    <div className="bg-dark-card border border-white/5 p-4 md:p-6 rounded-2xl flex flex-col justify-between shadow-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${color} ${bg}`}>
          {icon}
        </div>
        <p className="text-dark-subtext text-xs md:text-sm">{title}</p>
      </div>
      {item ? (
        <div className="min-w-0 mt-2">
          <p className="text-sm md:text-base font-bold text-white truncate" title={item.title}>{item.title}</p>
          <p className="text-xs text-brand-400 mt-1">{formatDuration(item.duration)}</p>
        </div>
      ) : (
        <p className="text-sm text-dark-subtext italic mt-2">Sem dados</p>
      )}
    </div>
  );
}
