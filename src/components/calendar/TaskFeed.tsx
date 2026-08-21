import React, { useState, useMemo } from 'react';
import type { CalendarEvent } from '../../types';
import { format } from 'date-fns';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { parseEventDate, getEventDayStr } from '../../utils/dateUtils';

interface TaskFeedProps {
  events: CalendarEvent[];
  onUpdateEvent: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
  onEditEvent: (event: CalendarEvent) => void;
}

export default function TaskFeed({ events, onUpdateEvent, onEditEvent }: TaskFeedProps) {
  const [filter, setFilter] = useState<'all' | 'tasks'>('all');

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Sort and filter events
  const { todayEvents, upcomingEvents } = useMemo(() => {
    const now = new Date();
    const filtered = events.filter(e => filter === 'all' ? true : e.type === 'task');
    filtered.sort((a, b) => parseEventDate(a.start_date).getTime() - parseEventDate(b.start_date).getTime());

    const today = filtered.filter(e => getEventDayStr(e.start_date) === todayStr);
    const upcoming = filtered.filter(e => {
      const eDate = parseEventDate(e.start_date);
      return eDate > now && getEventDayStr(e.start_date) !== todayStr;
    });

    return { todayEvents: today, upcomingEvents: upcoming };
  }, [events, filter, todayStr]);

  const toggleTaskStatus = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    if (event.type !== 'task') return;
    const newStatus = event.status === 'completed' ? 'pending' : 'completed';
    onUpdateEvent(event.id, { status: newStatus });
  };

  const renderEventItem = (event: CalendarEvent) => {
    const isTask = event.type === 'task';
    const isCompleted = event.status === 'completed';

    return (
      <div 
        key={event.id}
        onClick={() => onEditEvent(event)}
        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-dark-hover group
          ${isCompleted ? 'opacity-50' : 'opacity-100'}
        `}
      >
        <div className="pt-0.5" onClick={(e) => isTask && toggleTaskStatus(e, event)}>
          {isTask ? (
            isCompleted ? (
              <CheckCircle2 size={18} className="text-emerald-500" />
            ) : (
              <Circle size={18} className="text-dark-subtext group-hover:text-emerald-500 transition-colors" />
            )
          ) : (
            <div className="w-3 h-3 rounded-full mt-1.5" style={{ backgroundColor: event.color || '#4F46E5' }} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium text-dark-text truncate ${isCompleted ? 'line-through' : ''}`}>
            {event.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Clock size={12} className="text-dark-subtext" />
            <span className="text-xs text-dark-subtext">
              {format(parseEventDate(event.start_date), "HH:mm")}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg text-dark-text">
      <div className="p-4 border-b border-dark-border">
        <h2 className="text-lg font-medium font-serif mb-3">Agenda</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-dark-hover text-white' : 'text-dark-subtext'}`}
          >
            Tudo
          </button>
          <button 
            onClick={() => setFilter('tasks')}
            className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'tasks' ? 'bg-dark-hover text-white' : 'text-dark-subtext'}`}
          >
            Apenas Tarefas
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-xs font-bold text-dark-subtext uppercase tracking-wider mb-3">Hoje</h3>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-dark-subtext italic">Nada para hoje.</p>
          ) : (
            <div className="space-y-1">
              {todayEvents.map(renderEventItem)}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-bold text-dark-subtext uppercase tracking-wider mb-3">Próximos Dias</h3>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-dark-subtext italic">Nenhum evento futuro.</p>
          ) : (
            <div className="space-y-1">
              {upcomingEvents.slice(0, 15).map(renderEventItem)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
