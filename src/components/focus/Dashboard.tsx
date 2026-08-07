import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, Clock, Calendar, Edit2, Target, Settings, Trash2, Bell, Music, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Session } from '../types';

interface DashboardProps {
  sessions: Session[];
  onStart: () => void;
  onOpenSettings: () => void;
  onOpenAlarms: () => void;
  onOpenLofi: () => void;
  onOpenStats: () => void;
  onDeleteSession: (id: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ sessions, onStart, onOpenSettings, onOpenAlarms, onOpenLofi, onOpenStats, onDeleteSession }) => {
  const [dailyGoal, setDailyGoal] = useState<number>(120);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('120');

  useEffect(() => {
    const saved = localStorage.getItem('dailyGoal');
    if (saved) {
      setDailyGoal(parseInt(saved, 10));
      setGoalInput(saved);
    }
  }, []);

  const handleSaveGoal = () => {
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val > 0) {
      setDailyGoal(val);
      localStorage.setItem('dailyGoal', val.toString());
    }
    setIsEditingGoal(false);
  };

  // Today's Stats
  const getLocalIsoDate = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const todayStr = getLocalIsoDate();
  const todaySessions = sessions.filter(s => 
    s.created_at && 
    getLocalIsoDate(new Date(s.created_at)) === todayStr && 
    s.tag.toLowerCase() !== 'rest'
  );
  
  const todayTotalSessions = todaySessions.length;
  const todayCompleted = todaySessions.filter(s => s.status === 'completed').length;
  const todayTime = todaySessions.reduce((acc, s) => acc + (s.status === 'completed' ? s.target_time_minutes : 0), 0);
  const todaySuccessRate = todayTotalSessions > 0 ? Math.round((todayCompleted / todayTotalSessions) * 100) : 0;

  // Goal Progress
  const goalProgress = Math.min((todayTime / dailyGoal) * 100, 100);

  // Chart Data (Last 7 Days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return getLocalIsoDate(d);
  });

  const chartData = last7Days.map(dateStr => {
    const daySessions = sessions.filter(s => 
      s.created_at && 
      getLocalIsoDate(new Date(s.created_at)) === dateStr && 
      s.tag.toLowerCase() !== 'rest'
    );
    const focusTime = daySessions.reduce((acc, s) => acc + (s.status === 'completed' ? s.target_time_minutes : 0), 0);
    const d = new Date(dateStr + 'T00:00:00'); 
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    return { name: dayName, "Focus Time (min)": focusTime };
  });

  // Group History
  const groupedSessions = sessions.reduce((acc, session) => {
    if (!session.created_at) return acc;
    const dateStr = getLocalIsoDate(new Date(session.created_at));
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  const sortedDates = Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a));
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalIsoDate(yesterdayDate);

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === todayStr) return "Hoje";
    if (dateStr === yesterdayStr) return "Ontem";
    return new Date(dateStr + 'T00:00:00').toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full w-full p-3 sm:p-4 overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500/20 text-brand-500 rounded-xl flex items-center justify-center text-xl shadow-lg shrink-0">
            ⏰
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Focus Tracker</h1>
            <p className="text-dark-subtext text-xs font-medium">Ready for another session?</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenLofi} className="p-2 text-dark-subtext hover:text-white bg-dark-bg/50 border border-white/5 rounded-lg hover:bg-white/5 transition-colors shrink-0" title="Lofi">
            <Music size={18} />
          </button>
          <button onClick={onOpenAlarms} className="p-2 text-dark-subtext hover:text-white bg-dark-bg/50 border border-white/5 rounded-lg hover:bg-white/5 transition-colors shrink-0" title="Alarms">
            <Bell size={18} />
          </button>
          <button onClick={onOpenStats} className="p-2 text-dark-subtext hover:text-white bg-dark-bg/50 border border-white/5 rounded-lg hover:bg-white/5 transition-colors shrink-0" title="Estatísticas">
            <Activity size={18} />
          </button>
          <button onClick={onOpenSettings} className="p-2 text-dark-subtext hover:text-white bg-dark-bg/50 border border-white/5 rounded-lg hover:bg-white/5 transition-colors shrink-0" title="Settings">
            <Settings size={18} />
          </button>
          <button onClick={onStart} className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 text-sm shrink-0">
            <Play size={16} />
            <span className="hidden sm:inline">Start Session</span>
            <span className="sm:hidden">Start</span>
          </button>
        </div>
      </header>

      {/* Daily Review & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4 shrink-0 w-full min-w-0">
        
        {/* Today's Stats Grid */}
        <div className="grid grid-cols-2 gap-2 h-full">
          {/* Circular Goal Card */}
          <div className="bg-dark-card rounded-xl p-3 border border-white/5 shadow-lg flex flex-col items-center justify-center col-span-2 sm:col-span-1">
            <div className="w-full flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-dark-subtext uppercase tracking-widest flex items-center gap-1">
                <Target size={12} className="text-brand-400" /> Daily Goal
              </span>
              {isEditingGoal ? (
                <div className="flex items-center gap-1">
                  <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} className="w-12 bg-dark-bg text-white text-xs px-1 py-0.5 rounded border border-brand-500/50 outline-none" autoFocus onBlur={handleSaveGoal} onKeyDown={e => e.key === 'Enter' && handleSaveGoal()} />
                </div>
              ) : (
                <button onClick={() => setIsEditingGoal(true)} className="text-dark-subtext hover:text-white transition-colors">
                  <Edit2 size={12} />
                </button>
              )}
            </div>
            
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mt-1">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" className="stroke-dark-bg" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" className="stroke-brand-500 transition-all duration-1000" strokeWidth="8" strokeDasharray={`${goalProgress * 2.64} 264`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white leading-none">{todayTime}</span>
                <span className="text-[10px] text-dark-subtext">/ {dailyGoal}m</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
            <StatCard title="Sessions" value={todayTotalSessions} icon={<Play />} color="text-blue-400" bg="bg-blue-400/10" />
            <StatCard title="Completed" value={todayCompleted} icon={<CheckCircle />} color="text-emerald-400" bg="bg-emerald-400/10" />
            <StatCard title="Success" value={`${todaySuccessRate}%`} icon={<XCircle />} color={todaySuccessRate >= 50 ? "text-emerald-400" : "text-rose-400"} bg={todaySuccessRate >= 50 ? "bg-emerald-400/10" : "bg-rose-400/10"} />
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="lg:col-span-2 bg-dark-card rounded-xl p-3 sm:p-4 border border-white/5 shadow-lg flex flex-col h-40 lg:h-auto min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-brand-400" />
            <h2 className="text-xs font-semibold text-dark-subtext uppercase tracking-widest">Weekly Focus Trend</h2>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#8b5cf6" opacity={0.3} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#8b5cf6" opacity={0.3} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px', padding: '4px 8px' }} itemStyle={{ color: '#c4b5fd', fontWeight: 'bold' }} cursor={{fill: '#27272a', opacity: 0.4}} />
                <Bar dataKey="Focus Time (min)" fill="url(#colorFocus)" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* History List Grouped */}
      <div className="flex-1 overflow-hidden flex flex-col bg-dark-card rounded-xl border border-white/5 shadow-xl">
        <div className="p-3 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-base font-semibold text-white">Recent History</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {sessions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-dark-subtext">
              <Clock size={32} className="mb-2 opacity-20" />
              <p className="text-sm">No sessions recorded yet.</p>
            </div>
          ) : (
            sortedDates.map(dateStr => (
              <div key={dateStr} className="space-y-1">
                <h3 className="text-xs font-bold text-dark-subtext tracking-widest uppercase sticky top-0 bg-dark-card/90 backdrop-blur-sm py-1 z-10">
                  {formatDateHeader(dateStr)}
                </h3>
                {groupedSessions[dateStr].map((session, i) => (
                  <div key={session.id || i} className="p-1.5 sm:p-2 rounded-lg bg-dark-bg/50 border border-white/5 flex items-center gap-2 hover:bg-white/[0.02] transition-colors">
                    <div className={`p-1 rounded-full shrink-0 ${session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {session.status === 'completed' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold max-w-[100px] truncate ${
                          session.tag.toLowerCase() === 'rest' 
                            ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' 
                            : 'bg-brand-500/20 text-brand-300'
                        }`}>
                          {session.tag}
                        </span>
                        <span className="text-white text-sm font-medium truncate flex-1">{session.description}</span>
                      </div>
                      <p className="text-xs text-dark-subtext truncate">
                        {session.status === 'completed' ? session.summary : `Reason: ${session.justification}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <div className="font-bold text-white text-sm">{session.target_time_minutes}m</div>
                      <div className="text-[10px] text-dark-subtext">
                        {(() => {
                          const endTime = new Date(session.created_at || '');
                          if (session.status === 'completed') {
                            const startTime = new Date(endTime.getTime() - (session.target_time_minutes * 60000));
                            return `${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                          }
                          return endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        })()}
                      </div>
                      <button onClick={() => session.id && onDeleteSession(session.id)} className="text-dark-subtext/50 hover:text-rose-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, bg }: { title: string, value: any, icon: React.ReactNode, color: string, bg: string }) => (
  <div className="bg-dark-card rounded-xl p-2 sm:p-3 border border-white/5 shadow-md flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
    <div className={`p-1.5 rounded-lg shrink-0 ${bg} ${color}`}>
      {React.cloneElement(icon as React.ReactElement<any>, { className: "w-4 h-4" })}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-dark-subtext text-[10px] sm:text-xs font-medium mb-0.5 truncate">{title}</p>
      <p className="text-sm sm:text-lg font-bold text-white truncate">{value}</p>
    </div>
  </div>
);

export default Dashboard;


