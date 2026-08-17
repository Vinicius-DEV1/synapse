import { Calendar, Sunrise, BookOpen } from 'lucide-react';
import type { CalendarEvent } from '../../../types/core';
import { parseEventDate } from '../../../utils/dateUtils';

interface HomeAgendaSectionProps {
  todayEvents: CalendarEvent[];
  tomorrowEvents: CalendarEvent[];
  isEventLive: (ev: CalendarEvent) => boolean;
  onOpenPage: (pageId: string) => void;
}

export function HomeAgendaSection({
  todayEvents,
  tomorrowEvents,
  isEventLive,
  onOpenPage
}: HomeAgendaSectionProps) {
  const formatTime = (dateStr: string) => {
    return parseEventDate(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderEventCard = (ev: CalendarEvent, showDate = false) => {
    const live = isEventLive(ev);
    const completed = ev.status === 'completed';
    return (
      <div 
        key={ev.id} 
        className={`flex items-stretch gap-4 p-4 rounded-xl border transition-all ${
          live 
            ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
            : completed 
            ? 'bg-white/[0.02] border-white/5 opacity-60' 
            : 'bg-white/[0.04] border-white/5 hover:border-white/20 hover:bg-white/[0.06]'
        }`}
      >
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
            <button 
              onClick={() => onOpenPage(ev.page_id!)} 
              className="p-2 rounded-lg bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 transition-colors" 
              title="Abrir página vinculada"
            >
              <BookOpen size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
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

      {/* Tomorrow's Events */}
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
    </div>
  );
}
