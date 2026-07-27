import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Calendar, Check, ExternalLink, Clock, Trash2, Bell } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { CalendarEvent } from '../../types/core';

export default function CalendarEventWidgetNodeView(props: any) {
  const { eventId, title, dateStr, pageId, status } = props.node.attrs;
  const { state, dispatch } = useStore();
  const [eventData, setEventData] = useState<CalendarEvent | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [isCompleted, setIsCompleted] = useState(status === 'completed');

  useEffect(() => {
    setIsCompleted(status === 'completed');
  }, [status]);

  useEffect(() => {
    let isMounted = true;
    const fetchEvent = async () => {
      if (!eventId || !window.api?.calendar) return;
      try {
        const events = await window.api.calendar.getEvents();
        const found = events.find((e: CalendarEvent) => e.id === eventId);
        if (found && isMounted) {
          setEventData(found);
          setIsCompleted(found.status === 'completed');
        }
      } catch (err) {
        console.error('Erro ao buscar evento do widget:', err);
      }
    };
    fetchEvent();
    return () => {
      isMounted = false;
    };
  }, [eventId]);

  const toggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = isCompleted ? 'pending' : 'completed';
    setIsCompleted(!isCompleted);
    props.updateAttributes({ status: newStatus });

    if (eventId && window.api?.calendar) {
      try {
        const events = await window.api.calendar.getEvents();
        const found = events.find((ev: CalendarEvent) => ev.id === eventId);
        if (found) {
          await window.api.calendar.updateEvent(eventId, {
            ...found,
            status: newStatus
          });
        }
      } catch (err) {
        console.error('Erro ao atualizar status do evento na agenda:', err);
      }
    }
  };

  const openCalendarModule = () => {
    dispatch({
      type: 'UPDATE_TAB_MODULE',
      tabId: state.activeTabId,
      module: 'calendar'
    });
    setShowPopover(false);
  };

  const deleteWidget = async () => {
    if (eventId && window.api?.calendar) {
      try {
        const events = await window.api.calendar.getEvents();
        const found = events.find((ev: CalendarEvent) => ev.id === eventId);
        if (found) {
          const dateStr = found.end_date || found.start_date;
          const isExpired = dateStr && !isNaN(new Date(dateStr).getTime()) && new Date(dateStr).getTime() < Date.now();
          if (!isExpired) {
            await window.api.calendar.deleteEvent(eventId);
          }
        }
      } catch (err) {
        console.error('Erro ao excluir evento da agenda ao remover widget:', err);
      }
    }
    props.deleteNode();
  };

  const formatDateLabel = (isoDate?: string) => {
    if (!isoDate && !dateStr) return 'Sem data';
    try {
      const d = new Date(isoDate || dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr || '';
    }
  };

  const formatRemindersLabel = (remindersVal?: any) => {
    if (!remindersVal) return null;
    let arr: number[] = [];
    if (Array.isArray(remindersVal)) {
      arr = remindersVal;
    } else if (typeof remindersVal === 'string') {
      try { arr = JSON.parse(remindersVal); } catch { arr = []; }
    }
    if (arr.length === 0) return null;
    return arr.map(m => {
      if (m === 1440) return '1 dia antes';
      if (m >= 60 && m % 60 === 0) return `${m / 60}h antes`;
      return `${m}m antes`;
    }).join(', ');
  };

  const remindersLabel = formatRemindersLabel(eventData?.reminders);

  return (
    <NodeViewWrapper as="span" className="inline-block align-middle mx-1 relative">
      <span
        onClick={() => setShowPopover(!showPopover)}
        contentEditable={false}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer select-none text-xs font-medium transition-all ${
          isCompleted
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 line-through opacity-80'
            : 'bg-brand-500/10 border-brand-500/30 text-brand-300 hover:bg-brand-500/20 hover:border-brand-500/50'
        }`}
      >
        <button
          onClick={toggleStatus}
          className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
            isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-dark-bg'
              : 'border-white/30 hover:border-brand-400'
          }`}
          title={isCompleted ? 'Concluído (clique para reabrir)' : 'Marcar como concluído'}
        >
          {isCompleted && <Check size={10} strokeWidth={3} />}
        </button>

        <Calendar size={13} className="flex-shrink-0" />
        <span className="truncate max-w-[180px]">{eventData?.title || title}</span>
        <span className="text-[10px] opacity-75">
          • {formatDateLabel(eventData?.start_date)}
        </span>
      </span>

      {showPopover && (
        <div className="absolute left-0 top-full mt-1.5 z-[100] w-64 bg-dark-card border border-white/10 rounded-xl shadow-2xl p-3 text-left animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2 mb-2">
            <div>
              <p className="text-xs font-semibold text-white">{eventData?.title || title}</p>
              <p className="text-[11px] text-dark-subtext flex items-center gap-1 mt-0.5">
                <Clock size={11} />
                <span>{formatDateLabel(eventData?.start_date)}</span>
              </p>
            </div>
            <button
              onClick={() => setShowPopover(false)}
              className="text-dark-subtext hover:text-white p-1 rounded-md"
            >
              ×
            </button>
          </div>

          {remindersLabel && (
            <div className="flex items-center gap-1.5 text-[11px] text-brand-300 bg-brand-500/10 px-2 py-1 rounded-lg mb-2.5">
              <Bell size={11} />
              <span>Avisos: {remindersLabel}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-1">
            <button
              onClick={openCalendarModule}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <ExternalLink size={12} />
              <span>Abrir na Agenda</span>
            </button>

            <button
              onClick={deleteWidget}
              className="p-1.5 text-dark-subtext hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Remover widget do texto"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
