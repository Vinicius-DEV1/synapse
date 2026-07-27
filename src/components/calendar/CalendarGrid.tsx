import React, { useState, useEffect, useRef } from 'react';
import type { CalendarEvent } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

interface CalendarGridProps {
  events: CalendarEvent[];
  onEditEvent: (event: CalendarEvent) => void;
  onUpdateEvent: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
  onDayClick: (date: Date) => void;
}

const DraggableEvent = ({ event, onClick }: { event: CalendarEvent, onClick: () => void }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    data: event,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: event.color || '#4F46E5' }}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`text-xs px-1.5 py-1 mb-1 rounded text-white truncate cursor-pointer shadow-sm
        ${event.status === 'completed' ? 'opacity-50 line-through' : 'opacity-90 hover:opacity-100'}
      `}
    >
      {event.type === 'task' ? '✓ ' : ''}{event.title}
    </div>
  );
};

interface DroppableDayProps {
  date: Date;
  isCurrentMonth: boolean;
  children: React.ReactNode;
  onClick: () => void;
  todayRef?: React.Ref<HTMLDivElement>;
}

const DroppableDay = ({ date, isCurrentMonth, children, onClick, todayRef }: DroppableDayProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, 'yyyy-MM-dd'),
    data: { date },
  });

  const combineRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (todayRef) {
      if (typeof todayRef === 'function') {
        todayRef(node);
      } else if ('current' in todayRef) {
        (todayRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    }
  };

  return (
    <div
      ref={combineRefs}
      onClick={onClick}
      className={`min-h-[85px] border-r border-b border-dark-border p-1.5 transition-colors cursor-pointer relative
        ${!isCurrentMonth ? 'bg-dark-bg/40' : isToday(date) ? 'bg-emerald-500/[0.04] border-emerald-500/30' : 'bg-transparent'}
        ${isOver ? 'bg-dark-hover/50' : 'hover:bg-dark-hover/30'}
      `}
    >
      <div className={`text-xs p-1 mb-1 font-medium w-6 h-6 flex items-center justify-center rounded-full
        ${isToday(date) ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/50' : 'text-dark-subtext'}
      `}>
        {format(date, 'd')}
      </div>
      <div className="flex flex-col gap-0.5">
        {children}
      </div>
    </div>
  );
};

export default function CalendarGrid({ events, onEditEvent, onUpdateEvent, onDayClick }: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const todayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (todayRef.current) {
        todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [currentDate, events.length]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Adjusted to make week start on Sunday (0)
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - getDay(monthStart));
  
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - getDay(monthEnd)));

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeEvent = active.data.current as CalendarEvent;
      const targetDateStr = over.id as string; // 'yyyy-MM-dd'
      
      const newStartDate = new Date(activeEvent.start_date);
      const [year, month, day] = targetDateStr.split('-').map(Number);
      newStartDate.setFullYear(year, month - 1, day);

      const newEndDate = new Date(activeEvent.end_date);
      const diff = newEndDate.getTime() - new Date(activeEvent.start_date).getTime();
      newEndDate.setTime(newStartDate.getTime() + diff);

      onUpdateEvent(activeEvent.id, {
        start_date: newStartDate.toISOString(),
        end_date: newEndDate.toISOString()
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-border">
        <h2 className="text-lg font-medium text-dark-text capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 rounded hover:bg-dark-hover text-dark-subtext">
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => {
              setCurrentDate(new Date());
              setTimeout(() => {
                if (todayRef.current) {
                  todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 50);
            }} 
            className="px-3 py-1 text-sm rounded hover:bg-dark-hover text-dark-subtext"
          >
            Hoje
          </button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 rounded hover:bg-dark-hover text-dark-subtext">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex flex-col overflow-auto">
          <div className="grid grid-cols-7 border-b border-dark-border">
            {weekDays.map(day => (
              <div key={day} className="text-center py-2 text-xs font-medium text-dark-subtext border-r border-dark-border uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          
          <div className="flex-1 grid grid-cols-7 auto-rows-fr">
            {days.map((day, i) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayEvents = events.filter(e => {
                const eventStartStr = format(new Date(e.start_date), 'yyyy-MM-dd');
                return eventStartStr === dayStr;
              });

              return (
                <DroppableDay 
                  key={day.toISOString() + i} 
                  date={day} 
                  isCurrentMonth={isSameMonth(day, currentDate)}
                  onClick={() => onDayClick(day)}
                  todayRef={isToday(day) ? todayRef : undefined}
                >
                  {dayEvents.map(ev => (
                    <DraggableEvent key={ev.id} event={ev} onClick={() => onEditEvent(ev)} />
                  ))}
                </DroppableDay>
              );
            })}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
