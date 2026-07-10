import React from 'react';
import type { CalendarEvent } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, CheckCircle2, Circle, Clock } from 'lucide-react';

interface DayModalProps {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onNewEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onToggleTask: (event: CalendarEvent) => void;
}

export default function DayModal({ date, events, onClose, onNewEvent, onEditEvent, onToggleTask }: DayModalProps) {
  const dayEvents = events.filter(e => {
    const eDate = new Date(e.start_date);
    return format(eDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
  }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-[#1a1924] border border-dark-border rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-dark-border">
          <h2 className="text-lg font-medium text-dark-text capitalize">
            {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-dark-hover text-dark-subtext">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto max-h-[60vh] space-y-2">
          {dayEvents.length === 0 ? (
            <p className="text-sm text-dark-subtext text-center py-4 italic">Nenhum evento neste dia.</p>
          ) : (
            dayEvents.map(event => {
              const isTask = event.type === 'task';
              const isCompleted = event.status === 'completed';

              return (
                <div 
                  key={event.id}
                  onClick={() => onEditEvent(event)}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-dark-hover group border border-dark-border bg-dark-bg/50
                    ${isCompleted ? 'opacity-50' : 'opacity-100'}
                  `}
                >
                  <div 
                    className="pt-0.5" 
                    onClick={(e) => {
                      if (isTask) {
                        e.stopPropagation();
                        onToggleTask(event);
                      }
                    }}
                  >
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
                        {format(new Date(event.start_date), "HH:mm")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-dark-border bg-dark-bg/50">
          <button
            onClick={onNewEvent}
            className="w-full px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-sm"
          >
            + Novo Agendamento
          </button>
        </div>
      </div>
    </div>
  );
}
