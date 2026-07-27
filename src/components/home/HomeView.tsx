import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { Calendar, BrainCircuit, Pin, Plus, FolderUp, ChevronRight, BookOpen, Clock, Sunrise, CheckCircle2 } from 'lucide-react';
import type { CalendarEvent, Page } from '../../types/core';

export default function HomeView({ tabId }: { tabId: string }) {
  const { state, dispatch } = useStore();
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [tomorrowEvents, setTomorrowEvents] = useState<CalendarEvent[]>([]);
  const [dueCardsCount, setDueCardsCount] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const [greeting, setGreeting] = useState('');

  const pinnedPages = state.pages.filter(p => p.is_pinned).sort((a, b) => (a.pinned_order || 0) - (b.pinned_order || 0));

  // Páginas recentes: últimas 5 editadas (excluindo fixadas para não repetir)
  const pinnedIds = new Set(pinnedPages.map(p => p.id));
  const recentPages = [...state.pages]
    .filter(p => !pinnedIds.has(p.id) && p.title && p.title !== 'Nova Página')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  // Melhoria 1: Saudação que se atualiza ao longo do dia
  const computeGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  useEffect(() => {
    setGreeting(computeGreeting());
    // Re-checar a cada minuto
    const id = setInterval(() => setGreeting(computeGreeting()), 60_000);
    return () => clearInterval(id);
  }, [computeGreeting]);

  // Melhoria 2: Ticker ao vivo a cada 30s para eventos "Ao Vivo"
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Re-checar ao voltar do foco (unlock do app)
  useEffect(() => {
    const onFocus = () => {
      setGreeting(computeGreeting());
      setNowTs(Date.now());
      loadDashboardData();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) onFocus();
    });
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [computeGreeting]);

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
        const tomorrowEnd = todayEnd + 24 * 60 * 60 * 1000;
        
        const today = evs.filter(e => {
          if (!e.start_date) return false;
          const time = new Date(e.start_date).getTime();
          return time >= todayStart && time <= todayEnd;
        }).sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
        setTodayEvents(today);

        // Melhoria 5: Eventos de amanhã
        const tomorrow = evs.filter(e => {
          if (!e.start_date) return false;
          const time = new Date(e.start_date).getTime();
          return time > todayEnd && time <= tomorrowEnd;
        }).sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
        setTomorrowEvents(tomorrow);
      }
      
      // Bug 2 fix: usar getDecks + getDueCards ao invés de getDueCardsCount (inexistente)
      if (window.api?.anki) {
        try {
          const decksRes = await window.api.anki.getDecks();
          if (decksRes.success && decksRes.decks) {
            let total = 0;
            for (const deck of decksRes.decks) {
              const dueRes = await window.api.anki.getDueCards(deck.id);
              if (dueRes.success && dueRes.cards) {
                total += dueRes.cards.length;
              }
            }
            setDueCardsCount(total);
          }
        } catch {
          // Anki não disponível
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados do dashboard:', e);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Melhoria 2: usa nowTs reativo em vez de Date.now() estático
  const isEventLive = (ev: CalendarEvent) => {
    if (ev.status === 'completed' || !ev.start_date) return false;
    const time = new Date(ev.start_date).getTime();
    return nowTs >= time - 15 * 60 * 1000 && nowTs <= time + 60 * 60 * 1000;
  };

  const handleOpenPage = (pageId: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId, tabId });
  };

  // Bug 1 fix: usar window.api.createPage (que retorna Page) ao invés de window.api.notes.createPage
  const handleNewPage = async () => {
    if (!window.api) return;
    try {
      const page = await window.api.createPage({ parentId: null });
      dispatch({ type: 'ADD_PAGE', page });
      dispatch({ type: 'NAVIGATE_IN_TAB', pageId: page.id, tabId });
    } catch(e) {
      console.error('Erro ao criar página:', e);
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  const renderEventCard = (ev: CalendarEvent, showDate = false) => {
    const live = isEventLive(ev);
    const completed = ev.status === 'completed';
    return (
      <div key={ev.id} className={`flex items-stretch gap-4 p-4 rounded-xl border transition-all ${live ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : completed ? 'bg-white/[0.02] border-white/5 opacity-60' : 'bg-white/[0.04] border-white/5 hover:border-white/20 hover:bg-white/[0.06]'}`}>
        {/* Live indicator */}
        {live && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
        <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-white/10 pr-4">
          <span className={`text-lg font-bold ${live ? 'text-amber-400' : 'text-white'}`}>{formatTime(ev.start_date!)}</span>
          {live && <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mt-1">Ao Vivo</span>}
          {showDate && !live && <span className="text-[10px] text-dark-subtext mt-1">Amanhã</span>}
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
  };

  return (
    // Bug 3 fix: usar animate-fade-in (que existe no tailwind config) ao invés de animate-in/fade-in/slide-in-from-bottom-4
    <div className="flex-1 overflow-y-auto bg-dark-bg p-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{greeting}!</h1>
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
                  {todayEvents.length} evento{todayEvents.length !== 1 ? 's' : ''}
                </span>
              </div>

              {todayEvents.length === 0 ? (
                <div className="py-8 text-center text-dark-subtext bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                  <p>Sua agenda está livre para hoje!</p>
                </div>
              ) : (
                <div className="space-y-3 relative">
                  {todayEvents.map(ev => renderEventCard(ev))}
                </div>
              )}
            </div>

            {/* Melhoria 5: Tomorrow's Events */}
            {tomorrowEvents.length > 0 && (
              <div className="bg-dark-card border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                  <Sunrise size={100} />
                </div>
                <div className="flex items-center justify-between mb-5 relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                      <Sunrise size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Amanhã</h2>
                  </div>
                  <span className="text-sm font-medium text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full">
                    {tomorrowEvents.length} evento{tomorrowEvents.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-3 relative">
                  {tomorrowEvents.map(ev => renderEventCard(ev, true))}
                </div>
              </div>
            )}

            {/* Melhoria 4: Recent Pages */}
            {recentPages.length > 0 && (
              <div className="bg-dark-card border border-white/5 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400">
                    <Clock size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Recentes</h2>
                </div>
                <div className="space-y-2">
                  {recentPages.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleOpenPage(p.id)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-colors group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-lg">{p.icon || '📄'}</span>
                        <span className="text-sm font-medium text-white/90 truncate group-hover:text-brand-300 transition-colors">{p.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-dark-subtext opacity-0 group-hover:opacity-100 transition-opacity">{formatRelativeDate(p.updated_at)}</span>
                        <ChevronRight size={16} className="text-dark-subtext opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {/* Anki Review Summary — Melhoria 6: feedback visual quando 0 cartões */}
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
              <div className="mt-4 relative">
                {dueCardsCount > 0 ? (
                  <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                    Pronto para estudar
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                    <CheckCircle2 size={12} />
                    Tudo em dia!
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
