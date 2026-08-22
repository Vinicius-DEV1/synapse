import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { Calendar, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { getStoreState, getStoreDispatch } from '../../store/useStore';
import type { CalendarEvent } from '../../types/core';
import { parseEventDate } from '../../utils/date-utils';
import { moveBlockUp, moveBlockDown } from './moveBlockCommands';
import { CalendarEventPopover } from './calendar/CalendarEventPopover';
import { CalendarEventDeleteModal } from './calendar/CalendarEventDeleteModal';

let cachedEventsPromise: Promise<CalendarEvent[]> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 2000;

async function fetchCalendarEventsCached(force = false): Promise<CalendarEvent[]> {
  const now = Date.now();
  if (!force && cachedEventsPromise && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedEventsPromise;
  }
  cacheTimestamp = now;
  cachedEventsPromise = (async () => {
    try {
      if (!window.api?.calendar) return [];
      const events = await window.api.calendar.getEvents();
      return Array.isArray(events) ? events : [];
    } catch (err) {
      cachedEventsPromise = null;
      throw err;
    }
  })();
  return cachedEventsPromise;
}

function invalidateCalendarEventsCache() {
  cachedEventsPromise = null;
  cacheTimestamp = 0;
}

export default function CalendarEventWidgetNodeView(props: any) {
  const { eventId, title, dateStr, status } = props.node.attrs;
  const [eventData, setEventData] = useState<CalendarEvent | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [isCompleted, setIsCompleted] = useState(status === 'completed');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const pos = typeof props.getPos === 'function' ? props.getPos() : null;
  const isNodeSelected = !!(
    props.selected &&
    props.editor?.state?.selection instanceof NodeSelection &&
    typeof pos === 'number' &&
    props.editor.state.selection.from === pos
  );

  useEffect(() => {
    setIsCompleted(status === 'completed');
  }, [status]);

  useEffect(() => {
    let isMounted = true;
    const fetchEvent = async () => {
      if (!eventId || !window.api?.calendar) return;
      try {
        const events = await fetchCalendarEventsCached();
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
        const events = await fetchCalendarEventsCached();
        const found = events.find((ev: CalendarEvent) => ev.id === eventId);
        if (found) {
          await window.api.calendar.updateEvent(eventId, {
            ...found,
            status: newStatus
          });
          invalidateCalendarEventsCache();
        }
      } catch (err) {
        console.error('Erro ao atualizar status do evento na agenda:', err);
      }
    }
  };

  const openCalendarModule = () => {
    const storeState = getStoreState();
    const dispatch = getStoreDispatch();
    dispatch({
      type: 'UPDATE_TAB_MODULE',
      tabId: storeState.activeTabId,
      module: 'calendar'
    });
    setShowPopover(false);
  };

  const deleteWidget = async () => {
    if (eventId && window.api?.calendar) {
      try {
        const events = await fetchCalendarEventsCached();
        const found = events.find((ev: CalendarEvent) => ev.id === eventId);
        if (found) {
          const dateStr = found.end_date || found.start_date;
          const isExpired = dateStr && !isNaN(new Date(dateStr).getTime()) && new Date(dateStr).getTime() < Date.now();
          if (!isExpired) {
            await window.api.calendar.deleteEvent(eventId);
            invalidateCalendarEventsCache();
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
      const d = parseEventDate(isoDate || dateStr);
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

  const [nowTs, setNowTs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const isLive = React.useMemo(() => {
    if (!eventData?.start_date || isCompleted) return false;
    const evTime = new Date(eventData.start_date).getTime();
    if (isNaN(evTime)) return false;
    // Live status window: from 15 minutes before until 60 minutes after
    return nowTs >= evTime - 15 * 60 * 1000 && nowTs <= evTime + 60 * 60 * 1000;
  }, [eventData?.start_date, isCompleted, nowTs]);

  const widgetRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const el = widgetRef.current;
    if (!el) return;
    const handleTriggerConfirm = (e: Event) => {
      e.stopPropagation();
      setShowConfirmDelete(true);
    };
    el.addEventListener('trigger-widget-delete-confirm', handleTriggerConfirm);
    return () => {
      el.removeEventListener('trigger-widget-delete-confirm', handleTriggerConfirm);
    };
  }, []);

  return (
    <NodeViewWrapper as="span" className="inline-block align-middle mx-1 relative">
      <span
        ref={widgetRef}
        onClick={() => setShowPopover(!showPopover)}
        onMouseDown={() => {
          if (typeof props.getPos === 'function' && props.editor) {
            const pos = props.getPos();
            if (typeof pos === 'number') {
              props.editor.commands.setNodeSelection(pos);
            }
          }
        }}
        contentEditable={false}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer select-none text-xs font-medium transition-all ${
          isNodeSelected || showPopover
            ? 'ring-2 ring-brand-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] border-brand-400 bg-brand-500/25 scale-[1.03]'
            : isCompleted
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 line-through opacity-80'
            : isLive
            ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/30'
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
        <span className="inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 ml-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof pos === 'number' && props.editor) {
                moveBlockUp(props.editor.view, pos);
              }
            }}
            className="p-0.5 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
            title="Subir bloco (Mover para cima)"
          >
            <ArrowUp size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof pos === 'number' && props.editor) {
                moveBlockDown(props.editor.view, pos);
              }
            }}
            className="p-0.5 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
            title="Descer bloco (Mover para baixo)"
          >
            <ArrowDown size={11} />
          </button>
        </span>
      </span>

      {showPopover && (
        <CalendarEventPopover
          title={title}
          eventData={eventData}
          formatDateLabel={formatDateLabel}
          remindersLabel={remindersLabel}
          onOpenCalendar={openCalendarModule}
          onOpenDeleteConfirm={() => {
            setShowPopover(false);
            setShowConfirmDelete(true);
          }}
          onClose={() => setShowPopover(false)}
        />
      )}

      {showConfirmDelete && (
        <CalendarEventDeleteModal
          title={title}
          eventData={eventData}
          onConfirm={() => {
            setShowConfirmDelete(false);
            deleteWidget();
          }}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
    </NodeViewWrapper>
  );
}
