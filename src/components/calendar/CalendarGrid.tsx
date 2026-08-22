import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { CalendarEvent } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, getDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { parseEventDate, getEventDayStr } from '../../utils/date-utils';
import { DraggableEvent } from './DraggableEvent';
import { DroppableDay } from './DroppableDay';

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

  const days = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate.getTime(), endDate.getTime()]);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const dayStr = getEventDayStr(e.start_date);
      if (dayStr) {
        const list = map.get(dayStr);
        if (list) list.push(e);
        else map.set(dayStr, [e]);
      }
    }
    return map;
  }, [events]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeEvent = active.data.current as CalendarEvent;
      const targetDateStr = over.id as string; // 'yyyy-MM-dd'
      
      const newStartDate = parseEventDate(activeEvent.start_date);
      const [year, month, day] = targetDateStr.split('-').map(Number);
      newStartDate.setFullYear(year, month - 1, day);

      const newEndDate = parseEventDate(activeEvent.end_date);
      const diff = newEndDate.getTime() - parseEventDate(activeEvent.start_date).getTime();
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
              const dayEvents = eventsByDay.get(dayStr) || [];

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
