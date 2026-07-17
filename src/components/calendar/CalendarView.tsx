import React, { useState, useEffect } from 'react';
import CalendarGrid from './CalendarGrid';
import TaskFeed from './TaskFeed';
import EventModal from './EventModal';
import DayModal from './DayModal';
import type { CalendarEvent } from '../../types';

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const loadEvents = async () => {
    if (window.api?.calendar) {
      try {
        const data = await window.api.calendar.getEvents();
        setEvents(data);
      } catch (err) {
        console.error('Failed to load events:', err);
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
      if (editingEvent) {
        await window.api.calendar.updateEvent(editingEvent.id, eventData);
      } else {
        const recRule = eventData.recurrence_rule;
        try {
          if (recRule && ['daily', 'weekly', 'monthly', 'yearly'].includes(recRule)) {
            const groupId = `group_${crypto.randomUUID()}`;
            const copies: any[] = [];
            const start = new Date(eventData.start_date!);
            const end = new Date(eventData.end_date!);
            const duration = end.getTime() - start.getTime();
            
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
          } else {
            const newEvent = { ...eventData, id: crypto.randomUUID() };
            await window.api.calendar.createEvent(newEvent);
          }
        } catch (e) {
          console.error("Erro ao salvar eventos:", e);
        }
      }
      setIsModalOpen(false);
      setEditingEvent(null);
      loadEvents();
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
        } else {
          await window.api.calendar.deleteEvent(id);
        }
      } catch (e) {
        console.error("Erro ao deletar eventos:", e);
      }
      loadEvents();
    }
  };

  return (
    <div className="flex h-full bg-dark-bg text-dark-text">
      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold font-serif text-dark-text">Calendário</h1>
          <button
            onClick={() => {
              setEditingEvent(null);
              setSelectedDay(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium transition-colors"
          >
            + Novo
          </button>
        </div>
        
        <div className="flex-1 bg-dark-hover rounded-xl border border-dark-border overflow-hidden">
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
      <div className="w-80 border-l border-dark-border bg-dark-bg flex flex-col">
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
