import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Calendar, Clock, BookOpen } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { useStore } from '../../store/useStore';
import type { CalendarEvent } from '../../types/core';

interface ConfirmModalProps {
  pageId: string;
  pageName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function isEventExpired(ev: CalendarEvent): boolean {
  const dateStr = ev.end_date || ev.start_date;
  if (!dateStr) return false;
  const evTime = new Date(dateStr).getTime();
  if (isNaN(evTime)) return false;
  // Expirado: prazo já executado no passado (< agora)
  return evTime < Date.now();
}

export default function ConfirmModal({ pageId, pageName, onConfirm, onCancel }: ConfirmModalProps) {
  const { state } = useStore();
  const [activeEvents, setActiveEvents] = useState<CalendarEvent[]>([]);
  const [_isLoadingEvents, setIsLoadingEvents] = useState(true);

  // 1. Coletar o ID da página e todas as subpáginas/descendentes recursivamente
  const targetPageIds = useMemo(() => {
    const ids = new Set<string>();
    const collect = (parentId: string) => {
      ids.add(parentId);
      state.pages
        .filter(p => p.parent_id === parentId)
        .forEach(p => collect(p.id));
    };
    if (pageId) collect(pageId);
    return Array.from(ids);
  }, [pageId, state.pages]);

  // 2. Find calendar events linked to any of the target pages
  useEffect(() => {
    let isMounted = true;
    const fetchEvents = async () => {
      if (!window.api?.calendar) {
        setIsLoadingEvents(false);
        return;
      }
      try {
        const events = await window.api.calendar.getEvents();
        if (!isMounted) return;

        const found: CalendarEvent[] = [];
        for (const ev of events) {
          // Ignorar eventos expirados (cujo prazo já foi executado no passado)
          if (isEventExpired(ev)) {
            continue;
          }

          let isLinked = false;
          // Checar vínculo direto via ev.page_id
          if (ev.page_id && targetPageIds.includes(ev.page_id)) {
            isLinked = true;
          } else {
            // Check if any inline widget in the page references this event
            for (const pId of targetPageIds) {
              const pageObj = state.pages.find(p => p.id === pId);
              if (pageObj?.content && pageObj.content.includes(`data-event-id="${ev.id}"`)) {
                isLinked = true;
                break;
              }
            }
          }

          if (isLinked) {
            found.push(ev);
          }
        }

        setActiveEvents(found);
      } catch (err) {
        console.error('Erro ao buscar eventos vinculados à página para exclusão:', err);
      } finally {
        if (isMounted) setIsLoadingEvents(false);
      }
    };

    fetchEvents();
    return () => {
      isMounted = false;
    };
  }, [targetPageIds, state.pages]);

  const hasActiveEvents = activeEvents.length > 0;

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
        <div
          className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-4 mb-5">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                hasActiveEvents
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {hasActiveEvents ? (
                <Calendar size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {hasActiveEvents
                  ? 'Excluir Página com Eventos da Agenda'
                  : 'Excluir página'}
              </h3>
              <p className="text-sm text-dark-subtext leading-relaxed">
                Tem certeza que deseja excluir <strong>{pageName}</strong>?
                {hasActiveEvents
                  ? ' Ela (ou suas subpáginas) possui eventos da agenda associados.'
                  : ' Esta ação removerá também todas as sub-páginas e não pode ser desfeita.'}
              </p>
            </div>
          </div>

          {/* Alerta de Eventos Ativos na Agenda */}
          {hasActiveEvents && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5 mb-6">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle size={15} className="flex-shrink-0" />
                <span>
                  Atenção: Há {activeEvents.length} evento(s) na agenda não expirado(s)!
                </span>
              </div>
              <p className="leading-relaxed text-amber-200/90">
                Os widgets da agenda em <strong>{pageName}</strong> (e subpáginas) têm prazos ainda não executados. Ao confirmar, <strong>os eventos também serão removidos da agenda</strong>.
              </p>

              {/* Lista rolável de eventos afetados */}
              <div className="max-h-32 overflow-y-auto space-y-1.5 pt-2 border-t border-amber-500/20">
                {activeEvents.map(ev => {
                  const pageTitle =
                    state.pages.find(p => p.id === ev.page_id)?.title || pageName;
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/5"
                    >
                      <div className="truncate">
                        <p className="font-medium text-white truncate text-xs">
                          📅 {ev.title}
                        </p>
                        <p className="text-[10px] text-amber-400/80 truncate flex items-center gap-1 mt-0.5">
                          <BookOpen size={10} />
                          <span>Em: {pageTitle}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-amber-300/90 flex-shrink-0">
                        <Clock size={11} />
                        <span>
                          {ev.start_date
                            ? new Date(ev.start_date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Sem data'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-500/20"
            >
              <span>
                {hasActiveEvents
                  ? `Sim, excluir página e ${activeEvents.length} evento(s)`
                  : 'Sim, excluir'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
