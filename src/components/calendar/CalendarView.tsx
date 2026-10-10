import { useState, useEffect } from 'react';
import CalendarGrid from './CalendarGrid';
import TaskFeed from './TaskFeed';
import EventModal from './EventModal';
import DayModal from './DayModal';
import type { CalendarEvent } from '../../types';
import { triggerToast } from '../ui/ToastContext';

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [mobileTab, setMobileTab] = useState<'calendar' | 'feed'>('calendar');

  const pendingTasksCount = events.filter(e => e.status !== 'completed').length;

  const loadEvents = async () => {
    if (window.api?.calendar) {
      try {
        const data = await window.api.calendar.getEvents();
        setEvents(data || []);
      } catch (err: unknown) {
        console.error('Failed to load events:', err);
        const msg = err instanceof Error ? err.message : 'Erro ao carregar eventos do calendário';
        triggerToast(msg, 'error');
      }
    }
  };

  useEffect(() => {
    loadEvents();
    // Listen for sync events to reload data
    const cleanup = window.api?.onSyncTrigger?.(() => {
      loadEvents();
    });
    return cleanup;
  }, []);

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    if (window.api?.calendar) {
      try {
        if (editingEvent) {
          await window.api.calendar.updateEvent(editingEvent.id, eventData);
          triggerToast('Evento atualizado com sucesso!', 'success');
        } else {
          const recRule = eventData.recurrence_rule;
          if (recRule && ['daily', 'weekly', 'monthly', 'yearly'].includes(recRule)) {
            const groupId = `group_${crypto.randomUUID()}`;
            const copies: (Partial<CalendarEvent> & { id: string })[] = [];
            const start = eventData.start_date ? new Date(eventData.start_date) : new Date();
            const end = eventData.end_date ? new Date(eventData.end_date) : new Date(start.getTime() + 60 * 60 * 1000);
            const duration = !isNaN(end.getTime()) && !isNaN(start.getTime()) && end.getTime() >= start.getTime()
              ? end.getTime() - start.getTime()
              : 60 * 60 * 1000;
            
            let count = 0;
            if (recRule === 'daily') count = 90;
            else if (recRule === 'weekly') count = 52;
            else if (recRule === 'monthly') count = 12;
            else if (recRule === 'yearly') count = 5;

            for (let i = 0; i < count; i++) {
              const currentStart = new Date(start);
              if (recRule === 'daily') currentStart.setDate(start.getDate() + i);
              else if (recRule === 'weekly') currentStart.setDate(start.getDate() + (i * 7));
              else if (recRule === 'monthly') currentStart.setMonth(start.getMonth() + i);
              else if (recRule === 'yearly') currentStart.setFullYear(start.getFullYear() + i);

              const currentEnd = new Date(currentStart.getTime() + duration);
              
              copies.push({
                ...eventData,
                id: crypto.randomUUID(),
                start_date: currentStart.toISOString(),
                end_date: currentEnd.toISOString(),
                recurrence_rule: groupId
              });
            }
            
            for (const copy of copies) {
              await window.api.calendar.createEvent(copy);
            }
            triggerToast(`${copies.length} eventos recorrentes criados!`, 'success');
          } else {
            const newEvent = { ...eventData, id: crypto.randomUUID() };
            await window.api.calendar.createEvent(newEvent);
            triggerToast('Evento adicionado ao calendário!', 'success');
          }
        }
        setIsModalOpen(false);
        setEditingEvent(null);
        loadEvents();
      } catch (e: unknown) {
        console.error("Erro ao salvar eventos:", e);
        const msg = e instanceof Error ? e.message : 'Erro ao salvar evento.';
        triggerToast(msg, 'error');
      }
    }
  };

  const handleDeleteEvent = async (id: string, deleteAll: boolean = false) => {
    if (window.api?.calendar) {
      try {
        const ev = events.find(e => e.id === id);
        if (deleteAll && ev?.recurrence_rule?.startsWith('group_')) {
          const groupEvents = events.filter(e => e.recurrence_rule === ev.recurrence_rule);
          for (const ge of groupEvents) {
            await window.api.calendar.deleteEvent(ge.id);
          }
          triggerToast(`${groupEvents.length} eventos da série foram excluídos.`, 'info');
        } else {
          await window.api.calendar.deleteEvent(id);
          triggerToast('Evento excluído do calendário.', 'info');
        }
        loadEvents();
      } catch (e: unknown) {
        console.error("Erro ao deletar eventos:", e);
        const msg = e instanceof Error ? e.message : 'Erro ao excluir evento.';
        triggerToast(msg, 'error');
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-dark-bg text-dark-text overflow-hidden">
      {/* Main Calendar Area */}
      <div className={`flex-1 flex flex-col p-3 sm:p-6 overflow-hidden ${mobileTab === 'feed' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex justify-between items-center mb-3 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-dark-text">Calendário</h1>
          <button
            onClick={() => {
              setEditingEvent(null);
              setSelectedDay(null);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-95"
          >
            + Novo
          </button>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center bg-dark-card/60 p-1 rounded-xl border border-white/5 mb-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('calendar')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mobileTab === 'calendar'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-sm'
                : 'text-dark-subtext hover:text-white'
            }`}
          >
            Calendário
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('feed')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mobileTab === 'feed'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-sm'
                : 'text-dark-subtext hover:text-white'
            }`}
          >
            Tarefas ({pendingTasksCount})
          </button>
        </div>
        
        <div className="flex-1 bg-dark-hover rounded-xl border border-dark-border overflow-hidden min-h-0">
          <CalendarGrid 
            events={events} 
            onEditEvent={(ev) => {
              setEditingEvent(ev);
              setIsModalOpen(true);
            }} 
            onUpdateEvent={async (id, data) => {
              if (window.api?.calendar) {
                 await window.api.calendar.updateEvent(id, data);
                 loadEvents();
              }
            }}
            onDayClick={(date) => setSelectedDay(date)}
          />
        </div>
      </div>

      {/* Task Feed Sidebar */}
      <div className={`w-full md:w-80 border-t md:border-t-0 md:border-l border-dark-border bg-dark-bg flex flex-col ${mobileTab === 'calendar' ? 'hidden md:flex' : 'flex-1 md:flex-none'}`}>
        {/* Mobile Header for Feed */}
        <div className="flex md:hidden items-center justify-between p-3 border-b border-dark-border shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('calendar')}
            className="text-xs text-brand-400 font-medium hover:underline flex items-center gap-1"
          >
            ← Voltar ao Calendário
          </button>
          <span className="text-xs text-dark-subtext font-medium">Tarefas & Compromissos</span>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <TaskFeed 
            events={events} 
            onUpdateEvent={async (id, data) => {
              if (window.api?.calendar) {
                await window.api.calendar.updateEvent(id, data);
                loadEvents();
              }
            }}
            onEditEvent={(ev) => {
               setEditingEvent(ev);
               setIsModalOpen(true);
            }}
          />
        </div>
      </div>

      {isModalOpen && (
        <EventModal
          event={editingEvent}
          initialDate={selectedDay || undefined}
          onSave={handleSaveEvent}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEvent(null);
            if (!editingEvent) setSelectedDay(null); // Keep DayModal open if we just cancelled creating a new event from DayModal
          }}
          onDelete={editingEvent ? (deleteAll) => { handleDeleteEvent(editingEvent.id, deleteAll); setIsModalOpen(false); setEditingEvent(null); } : undefined}
        />
      )}

      {selectedDay && !isModalOpen && (
        <DayModal
          date={selectedDay}
          events={events}
          onClose={() => setSelectedDay(null)}
          onNewEvent={() => setIsModalOpen(true)}
          onEditEvent={(ev) => {
            setEditingEvent(ev);
            setIsModalOpen(true);
          }}
          onToggleTask={async (event) => {
            if (window.api?.calendar) {
              const newStatus = event.status === 'completed' ? 'pending' : 'completed';
              await window.api.calendar.updateEvent(event.id, { status: newStatus });
              loadEvents();
            }
          }}
        />
      )}
    </div>
  );
}
