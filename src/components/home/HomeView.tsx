import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Calendar, BrainCircuit, Pin, Plus, FolderUp, ChevronRight, BookOpen } from 'lucide-react';
import type { CalendarEvent } from '../../types/core';

export default function HomeView({ tabId }: { tabId: string }) {
  const { state, dispatch } = useStore();
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [dueCardsCount, setDueCardsCount] = useState(0);

  const pinnedPages = state.pages.filter(p => p.is_pinned).sort((a, b) => (a.pinned_order || 0) - (b.pinned_order || 0));

  useEffect(() => {
    loadDashboardData();
    window.addEventListener('calendar-event-updated', loadDashboardData);
    return () => window.removeEventListener('calendar-event-updated', loadDashboardData);
  }, []);

  const loadDashboardData = async () => {
    try {
      if (window.api?.calendar) {
        const evs = await window.api.calendar.getEvents();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
        
        const today = evs.filter(e => {
          if (!e.start_date) return false;
          const time = new Date(e.start_date).getTime();
          return time >= todayStart && time <= todayEnd;
        }).sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
        setTodayEvents(today);
      }
      
      if (window.api?.anki) {
        const count = await window.api.anki.getDueCardsCount();
        setDueCardsCount(count);
      }
    } catch (e) {
      console.error('Erro ao carregar dados do dashboard:', e);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const isEventLive = (ev: CalendarEvent) => {
    if (ev.status === 'completed' || !ev.start_date) return false;
    const time = new Date(ev.start_date).getTime();
    const now = Date.now();
    return now >= time - 15 * 60 * 1000 && now <= time + 60 * 60 * 1000;
  };

  const handleOpenPage = (pageId: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId, tabId });
  };

  const handleNewPage = async () => {
    if (!window.api?.notes) return;
    try {
      const pageId = await window.api.notes.createPage(null);
      dispatch({ type: 'ADD_PAGE', pageId, parentId: null });
      dispatch({ type: 'NAVIGATE_IN_TAB', pageId, tabId });
    } catch(e) {}
  };

  return (
    <div className="flex-1 overflow-y-auto bg-dark-bg p-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{getGreeting()}!</h1>
            <p className="text-dark-subtext">Hoje é {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button onClick={handleNewPage} className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-brand-500/30 transition-all group shadow-sm hover:shadow-lg">
            <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium text-white text-sm">Nova Página</p>
            </div>
          </button>
          
          <button onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId, module: 'calendar' })} className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-amber-500/30 transition-all group shadow-sm hover:shadow-lg">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium text-white text-sm">Ver Agenda</p>
            </div>
          </button>

          <button onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId, module: 'anki' })} className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-blue-500/30 transition-all group shadow-sm hover:shadow-lg">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BrainCircuit size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium text-white text-sm">Flashcards</p>
            </div>
          </button>
          
          <button onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId, module: 'files' })} className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all group shadow-sm hover:shadow-lg">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FolderUp size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium text-white text-sm">Arquivos</p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Today's Agenda */}
            <div className="bg-dark-card border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Calendar size={120} />
              </div>
              <div className="flex items-center justify-between mb-6 relative">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <Calendar size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Eventos de Hoje</h2>
                </div>
                <span className="text-sm font-medium text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
                  {todayEvents.length} eventos
                </span>
              </div>

              {todayEvents.length === 0 ? (
                <div className="py-8 text-center text-dark-subtext bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                  <p>Sua agenda está livre para hoje!</p>
                </div>
              ) : (
                <div className="space-y-3 relative">
                  {todayEvents.map((ev, i) => {
                    const live = isEventLive(ev);
                    const completed = ev.status === 'completed';
                    return (
                      <div key={ev.id} className={`flex items-stretch gap-4 p-4 rounded-xl border transition-all ${live ? 'bg-amber-500/10 border-amber-500/40 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]' : completed ? 'bg-white/[0.02] border-white/5 opacity-60' : 'bg-white/[0.04] border-white/5 hover:border-white/20 hover:bg-white/[0.06]'}`}>
                        <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-white/10 pr-4">
                          <span className={`text-lg font-bold ${live ? 'text-amber-400' : 'text-white'}`}>{formatTime(ev.start_date!)}</span>
                          {live && <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mt-1">Agora</span>}
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                          <h3 className={`font-medium ${completed ? 'line-through text-dark-subtext' : 'text-white'}`}>{ev.title}</h3>
                          {ev.description && <p className="text-xs text-dark-subtext mt-1 line-clamp-1">{ev.description}</p>}
                        </div>
                        {ev.page_id && (
                          <div className="flex items-center">
                            <button onClick={() => handleOpenPage(ev.page_id!)} className="p-2 rounded-lg bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 transition-colors" title="Abrir página vinculada">
                              <BookOpen size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Side Column */}
          <div className="space-y-6">
            
            {/* Pinned Pages */}
            <div className="bg-dark-card border border-white/5 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
                  <Pin size={20} />
                </div>
                <h2 className="text-lg font-semibold text-white">Fixados</h2>
              </div>
              
              {pinnedPages.length === 0 ? (
                <div className="py-6 text-center text-dark-subtext text-sm">
                  <p>Nenhuma página fixada.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pinnedPages.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleOpenPage(p.id)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-colors group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-lg">{p.icon || '📄'}</span>
                        <span className="text-sm font-medium text-white/90 truncate group-hover:text-brand-300 transition-colors">{p.title}</span>
                      </div>
                      <ChevronRight size={16} className="text-dark-subtext opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Anki Review Summary */}
            <div className="bg-dark-card border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group cursor-pointer hover:border-blue-500/30 transition-colors" onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId, module: 'anki' })}>
              <div className="absolute -right-4 -bottom-4 p-8 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all pointer-events-none">
                <BrainCircuit size={100} />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <BrainCircuit size={20} />
                </div>
                <h2 className="text-lg font-semibold text-white">Revisões</h2>
              </div>
              
              <div className="flex items-end gap-3 relative">
                <span className="text-5xl font-bold text-white tracking-tight">{dueCardsCount}</span>
                <span className="text-sm text-dark-subtext mb-2">cartões hoje</span>
              </div>
              {dueCardsCount > 0 && (
                <div className="mt-4 relative">
                  <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                    Pronto para estudar
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
