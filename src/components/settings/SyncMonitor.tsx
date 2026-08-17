import { useEffect, useState } from 'react';
import { getTodayStats, getWeeklyStats, isEmergencyStopped, clearEmergencyStop, getSyncEvents } from '../../services/sync/sync-monitor';
import type { SyncStats, SyncEventLog } from '../../services/sync/sync-monitor';
import { Database, AlertTriangle, RefreshCw,  ArrowDownToLine, ArrowUpFromLine, Terminal } from 'lucide-react';

export default function SyncMonitor() {
  const [today, setToday] = useState<SyncStats | null>(null);
  const [week, setWeek] = useState<SyncStats[]>([]);
  const [events, setEvents] = useState<SyncEventLog[]>([]);
  const [emergency, setEmergency] = useState(false);

  const DAILY_READ_QUOTA = 50000;
  const DAILY_WRITE_QUOTA = 20000;
  
  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadStats = () => {
    setToday(getTodayStats());
    setWeek(getWeeklyStats());
    setEmergency(isEmergencyStopped());
    setEvents(getSyncEvents());
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh
    const interval = setInterval(loadStats, 5000);
    const handleEventsUpdated = () => setEvents(getSyncEvents());
    window.addEventListener('caderno-sync-events-updated', handleEventsUpdated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('caderno-sync-events-updated', handleEventsUpdated);
    };
  }, []);

  if (!today) return null;

  const readPercent = Math.min((today.reads / DAILY_READ_QUOTA) * 100, 100);
  const writePercent = Math.min((today.writes / DAILY_WRITE_QUOTA) * 100, 100);

  const getStatusColor = (percent: number) => {
    if (percent > 90) return 'text-red-400 bg-red-400/20';
    if (percent > 70) return 'text-yellow-400 bg-yellow-400/20';
    return 'text-green-400 bg-green-400/20';
  };

  const getBarColor = (percent: number) => {
    if (percent > 90) return 'bg-red-500';
    if (percent > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const maxHourTotal = Math.max(
    1,
    ...Array.from({ length: 24 }).map((_, h) => {
      const stats = today.hourly?.[h.toString()];
      return (stats?.reads || 0) + (stats?.writes || 0);
    })
  );

  return (
    <div className="space-y-6 animate-fade-in text-white/90 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Database size={20} className="text-purple-400" />
          Uso do Firebase (Estimativa Local)
        </h2>
        <button onClick={loadStats} className="p-2 hover:bg-white/5 rounded-md transition-colors text-white/50 hover:text-white" title="Atualizar">
          <RefreshCw size={16} />
        </button>
      </div>

      {emergency && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-4 items-start">
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-400 mb-1">Sincronização Bloqueada por Segurança!</h3>
            <p className="text-sm text-red-200/70 mb-3">
              Detectamos um número anormalmente alto de leituras/escritas em menos de um minuto (possível loop de sincronização). O envio para nuvem foi temporariamente pausado.
            </p>
            <button 
              onClick={() => { clearEmergencyStop(); loadStats(); }}
              className="px-3 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-md text-sm font-medium transition-colors"
            >
              Liberar Sincronização
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Leituras */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-white/70">Leituras (Hoje)</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStatusColor(readPercent)}`}>
              {readPercent.toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-bold mb-1">{today.reads.toLocaleString()} <span className="text-sm font-normal text-white/40">/ {DAILY_READ_QUOTA.toLocaleString()}</span></div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-3">
            <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(readPercent)}`} style={{ width: `${readPercent}%` }} />
          </div>
        </div>

        {/* Escritas */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-white/70">Escritas (Hoje)</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStatusColor(writePercent)}`}>
              {writePercent.toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-bold mb-1">{today.writes.toLocaleString()} <span className="text-sm font-normal text-white/40">/ {DAILY_WRITE_QUOTA.toLocaleString()}</span></div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-3">
            <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(writePercent)}`} style={{ width: `${writePercent}%` }} />
          </div>
        </div>
      </div>

      {/* Tráfego de Rede */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <ArrowDownToLine size={20} />
          </div>
          <div>
            <div className="text-sm font-medium text-white/70">Baixado (Pull)</div>
            <div className="text-xl font-bold">{formatBytes(today.bytesDownloaded)}</div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
            <ArrowUpFromLine size={20} />
          </div>
          <div>
            <div className="text-sm font-medium text-white/70">Enviado (Push)</div>
            <div className="text-xl font-bold">{formatBytes(today.bytesUploaded)}</div>
          </div>
        </div>
      </div>

      {/* Gráfico por Hora (Hoje) */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-6">
        <h3 className="text-sm font-medium text-white/70 mb-6 flex items-center gap-2">
          <Database size={14} />
          Consumo Hoje (Por Hora)
        </h3>
        <div className="flex items-end gap-1 h-32 w-full pt-4 border-b border-white/10">
          {Array.from({ length: 24 }).map((_, h) => {
            const hourStr = h.toString();
            const hourStats = today.hourly?.[hourStr];
            const reads = hourStats?.reads || 0;
            const writes = hourStats?.writes || 0;
            const total = reads + writes;
            const heightPercent = Math.min((total / maxHourTotal) * 100, 100);
            
            return (
              <div key={h} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                <div 
                  className="w-full bg-brand-500/50 group-hover:bg-brand-400 rounded-t-sm transition-all"
                  style={{ height: `${heightPercent}%`, minHeight: total > 0 ? '4px' : '0' }}
                />
                <span className="text-[10px] text-white/30">{h}h</span>
                
                {/* Tooltip on hover */}
                {total > 0 && (
                  <div className="absolute bottom-full mb-4 bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 shadow-xl transition-opacity">
                    <div className="font-bold text-white/90 mb-1">{h}:00 às {h}:59</div>
                    <div className="text-blue-400 mb-0.5">{reads.toLocaleString()} leituras <span className="text-white/40 ml-1">({formatBytes(hourStats?.bytesDownloaded)})</span></div>
                    <div className="text-orange-400">{writes.toLocaleString()} escritas <span className="text-white/40 ml-1">({formatBytes(hourStats?.bytesUploaded)})</span></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico Semanal */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-6">
        <h3 className="text-sm font-medium text-white/70 mb-4 flex items-center gap-2">
          <Database size={14} />
          Últimos 7 dias
        </h3>
        <div className="space-y-3">
          {week.slice().reverse().map((day, i) => (
            <div key={day.date} className="flex items-center gap-4 text-sm">
              <div className="w-24 text-white/50">{day.date.replace('sync_stats_', '').split('-').slice(1).join('/')} {i === 0 ? '(Hoje)' : ''}</div>
              <div className="flex-1">
                <div className="flex gap-2">
                  <div className="text-blue-400" style={{ width: '80px' }}>{day.reads} L</div>
                  <div className="w-full max-w-[150px] bg-white/10 h-1.5 rounded-full self-center">
                     <div className="bg-blue-400 h-full rounded-full" style={{ width: `${Math.min((day.reads/DAILY_READ_QUOTA)*100, 100)}%` }} />
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  <div className="text-orange-400" style={{ width: '80px' }}>{day.writes} E</div>
                  <div className="w-full max-w-[150px] bg-white/10 h-1.5 rounded-full self-center">
                     <div className="bg-orange-400 h-full rounded-full" style={{ width: `${Math.min((day.writes/DAILY_WRITE_QUOTA)*100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-xs text-white/40 mt-4 flex items-start gap-2">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <p>Estes valores são estimativas baseadas nas operações enviadas e recebidas pelo aplicativo localmente. O consumo real computado pelo Google Cloud no Firebase pode ter uma pequena variação.</p>
      </div>

      {/* Sync Logs Console */}
      <div className="bg-[#0f111a] border border-white/10 rounded-xl overflow-hidden mt-6 flex flex-col">
        <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
            <Terminal size={14} />
            Console de Eventos (Logs)
          </h3>
          <span className="text-xs text-white/40 font-mono">caderno-sync-daemon v1.0</span>
        </div>
        <div className="p-4 overflow-y-auto font-mono text-xs max-h-64 space-y-1.5 custom-scrollbar">
          {events.length === 0 ? (
            <div className="text-white/30 italic">Nenhum evento registrado ainda.</div>
          ) : (
            events.map(ev => {
              const time = new Date(ev.timestamp).toLocaleTimeString([], { hour12: false });
              let color = 'text-white/60';
              let icon = 'ℹ️';
              if (ev.type === 'error') { color = 'text-red-400'; icon = '❌'; }
              else if (ev.type === 'push') { color = 'text-orange-300'; icon = '⬆️'; }
              else if (ev.type === 'pull') { color = 'text-blue-300'; icon = '☁️'; }

              return (
                <div key={ev.id} className="flex items-start gap-3 hover:bg-white/5 px-2 py-1 -mx-2 rounded transition-colors">
                  <span className="text-white/30 shrink-0">[{time}]</span>
                  <span className="shrink-0">{icon}</span>
                  <span className={`${color} break-all`}>{ev.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
