import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { Calendar, Check, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { getStoreState, getStoreDispatch } from '../../store/useStore';
import type { CalendarEvent } from '../../types/core';
import { parseEventDate } from '../../utils/date-utils';
import { moveBlockUp, moveBlockDown } from './moveBlockCommands';
import { CalendarEventPopover } from './calendar/CalendarEventPopover';
import { CalendarEventDeleteModal } from './calendar/CalendarEventDeleteModal';
import { Portal } from '../ui/Portal';
import { playUiClickSound, playUiToggleSound, playUiDeleteSound } from '../../utils/uiSounds';
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
  const { eventId, title, dateStr, status, color: rawColor } = props.node.attrs;
  const color = rawColor || 'default';
  const [eventData, setEventData] = useState<CalendarEvent | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [showPopover, setShowPopover] = useState(false);
  const [showDeletedNotice, setShowDeletedNotice] = useState(false);
  const [isCompleted, setIsCompleted] = useState(status === 'completed');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const mountedRef = useRef(true);
  const reqIdRef = useRef(0);

  const pos = typeof props.getPos === 'function' ? props.getPos() : null;
  const isNodeSelected = !!(
    props.selected &&
    props.editor?.state?.selection instanceof NodeSelection &&
    typeof pos === 'number' &&
    props.editor.state.selection.from === pos
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setIsCompleted(status === 'completed');
  }, [status]);

  const fetchEvent = async () => {
    const currentReqId = ++reqIdRef.current;
    if (!eventId || !window.api?.calendar) {
      if (mountedRef.current) setIsLoadingEvents(false);
      return;
    }
    if (mountedRef.current) setIsLoadingEvents(true);
    try {
      const events = await fetchCalendarEventsCached();
      const found = events.find((e: CalendarEvent) => e.id === eventId);
      if (mountedRef.current && currentReqId === reqIdRef.current) {
        if (found) {
          setEventData(found);
          setIsCompleted(found.status === 'completed');
        } else {
          setEventData(null);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar evento do widget:', err);
      if (mountedRef.current && currentReqId === reqIdRef.current) setEventData(null);
    } finally {
      if (mountedRef.current && currentReqId === reqIdRef.current) setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvent();

    const handleSync = () => {
      invalidateCalendarEventsCache();
      fetchEvent();
    };

    window.addEventListener('app-sync-trigger', handleSync);
    window.addEventListener('caderno-sync-complete', handleSync);
    window.addEventListener('caderno-calendar-updated', handleSync);

    return () => {
      window.removeEventListener('app-sync-trigger', handleSync);
      window.removeEventListener('caderno-sync-complete', handleSync);
      window.removeEventListener('caderno-calendar-updated', handleSync);
    };
  }, [eventId]);

  const isNotFound = !isLoadingEvents && eventData === null;

  const toggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNotFound) {
      setShowDeletedNotice(true);
      return;
    }
    const newStatus = isCompleted ? 'pending' : 'completed';
    playUiToggleSound(!isCompleted);
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
    playUiDeleteSound();
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
    if (!eventData?.start_date || isCompleted || isNotFound) return false;
    const evTime = new Date(eventData.start_date).getTime();
    if (isNaN(evTime)) return false;
    return nowTs >= evTime - 15 * 60 * 1000 && nowTs <= evTime + 60 * 60 * 1000;
  }, [eventData?.start_date, isCompleted, isNotFound, nowTs]);

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

  const isCustomColor = Boolean(color && color !== 'default') && !isNotFound;
  const customWidgetStyle: React.CSSProperties = isNotFound
    ? {
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderColor: isNodeSelected || showPopover ? 'rgba(239, 68, 68, 1)' : 'rgba(239, 68, 68, 0.4)',
        boxShadow: isNodeSelected || showPopover
          ? '0 0 0 2px rgba(239, 68, 68, 0.5), 0 0 12px rgba(239, 68, 68, 0.2)'
          : undefined,
      }
    : isCustomColor && !isCompleted && !isLive
    ? {
        backgroundColor: `${color}18`,
        borderColor: isNodeSelected || showPopover ? color : `${color}60`,
        color: color,
        boxShadow: isNodeSelected || showPopover
          ? `0 0 0 2px ${color}80, 0 0 15px ${color}30`
          : `0 0 0 1px ${color}20, 0 2px 6px ${color}10`,
      }
    : {};

  return (
    <NodeViewWrapper as="span" className="inline-block align-middle mx-1 relative">
      <span
        ref={widgetRef}
        onClick={() => {
          playUiClickSound();
          if (isNotFound) {
            setShowDeletedNotice(true);
          } else {
            setShowPopover(!showPopover);
          }
        }}
        onMouseDown={() => {
          if (typeof props.getPos === 'function' && props.editor) {
            const pos = props.getPos();
            if (typeof pos === 'number') {
              props.editor.commands.setNodeSelection(pos);
            }
          }
        }}
        contentEditable={false}
        style={customWidgetStyle}
        title={isNotFound ? 'Evento excluído da agenda. Clique para opções.' : undefined}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer select-none text-xs font-medium transition-all ${
          isNotFound
            ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:border-red-500/70 hover:bg-red-500/20'
            : isCustomColor && !isCompleted && !isLive
            ? 'bg-dark-card/90 hover:brightness-110'
            : isNodeSelected || showPopover
            ? 'ring-2 ring-brand-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] border-brand-400 bg-brand-500/25 scale-[1.03]'
            : isCompleted
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 line-through opacity-80'
            : isLive
            ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/30'
            : 'bg-brand-500/10 border-brand-500/30 text-brand-300 hover:bg-brand-500/20 hover:border-brand-500/50'
        }`}
      >
        {!isNotFound && (
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
        )}

        {isNotFound ? (
          <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
        ) : (
          <Calendar size={13} className="flex-shrink-0" />
        )}
        <span className="truncate max-w-[180px]">
          {eventData?.title || title}{isNotFound ? ' (Evento Excluído)' : ''}
        </span>
        {!isNotFound && (
          <span className="text-[10px] opacity-75">
            • {formatDateLabel(eventData?.start_date)}
          </span>
        )}
        <span className="inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 ml-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              playUiClickSound();
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
              playUiClickSound();
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

      {showDeletedNotice && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" contentEditable={false}>
            <div className="bg-dark-card border border-red-500/30 rounded-xl p-5 w-[340px] shadow-2xl flex flex-col gap-4 animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-base leading-tight">Evento Excluído</h3>
                  <p className="text-dark-subtext text-xs mt-0.5">Evento não encontrado na agenda</p>
                </div>
              </div>
              
              <p className="text-dark-subtext text-sm leading-relaxed">
                O evento <strong className="text-white">"{title || eventData?.title || 'Evento'}"</strong> foi excluído da agenda. Deseja remover este widget do documento?
              </p>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setShowDeletedNotice(false)}
                  className="flex-1 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 hover:text-white transition-colors text-sm"
                >
                  Manter
                </button>
                <button
                  onClick={() => {
                    playUiClickSound();
                    setShowDeletedNotice(false);
                    props.deleteNode();
                  }}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm shadow-lg shadow-red-500/20"
                >
                  Remover Widget
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showPopover && (
        <CalendarEventPopover
          anchorRef={widgetRef}
          title={title}
          eventData={eventData}
          formatDateLabel={formatDateLabel}
          remindersLabel={remindersLabel}
          color={color}
          onChangeColor={(newColor: string) => props.updateAttributes?.({ color: newColor })}
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

