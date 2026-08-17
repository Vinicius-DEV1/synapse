import type { CalendarEvent } from '../../types';
import { X, Clock, Type, Palette, BookOpen } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { useStore } from '../../store/useStore';
import { useEventForm, CALENDAR_EVENT_COLORS } from './hooks/useEventForm';
import { EventFormDateTimes } from './ui/EventFormDateTimes';
import { EventFormReminders } from './ui/EventFormReminders';
import { EventModalFooter } from './ui/EventModalFooter';

interface EventModalProps {
  event: CalendarEvent | null;
  onSave: (eventData: Partial<CalendarEvent>) => void;
  onClose: () => void;
  onDelete?: (deleteAll: boolean) => void;
  initialDate?: Date;
}

export default function EventModal({ event, onSave, onClose, onDelete, initialDate }: EventModalProps) {
  const { state, dispatch } = useStore();
  const linkedPage = state.pages.find(p => p.id === event?.page_id);

  const {
    title,
    setTitle,
    description,
    setDescription,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    type,
    setType,
    color,
    setColor,
    isAllDay,
    setIsAllDay,
    recurrence,
    setRecurrence,
    reminders,
    toggleReminder,
    handleSubmit,
  } = useEventForm(event, initialDate, onSave);

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#1a1924] border border-dark-border rounded-xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center px-4 py-3 border-b border-dark-border flex-shrink-0">
            <h2 className="text-lg font-medium text-dark-text">
              {event ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-dark-hover text-dark-subtext">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-3.5 flex-1 overflow-y-auto min-h-0">
            {/* Tipo Toggle */}
            <div className="flex bg-dark-bg rounded-lg p-1 border border-dark-border">
              <button
                type="button"
                onClick={() => setType('event')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${type === 'event' ? 'bg-dark-hover text-white shadow-sm' : 'text-dark-subtext hover:text-dark-text'}`}
              >
                Evento
              </button>
              <button
                type="button"
                onClick={() => setType('task')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${type === 'task' ? 'bg-dark-hover text-white shadow-sm' : 'text-dark-subtext hover:text-dark-text'}`}
              >
                Tarefa
              </button>
            </div>

            {/* Título */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
                <Type size={14} /> Título
              </label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder={type === 'event' ? 'Reunião de Alinhamento' : 'Comprar leite'}
                required
              />
            </div>

            {/* Datas */}
            <EventFormDateTimes
              isAllDay={isAllDay}
              setIsAllDay={setIsAllDay}
              startDate={startDate}
              setStartDate={setStartDate}
              startTime={startTime}
              setStartTime={setStartTime}
              endDate={endDate}
              setEndDate={setEndDate}
              endTime={endTime}
              setEndTime={setEndTime}
            />

            {/* Repetição e Cor */}
            <div className={`grid ${!event ? 'grid-cols-2' : 'grid-cols-1'} gap-3 items-center`}>
              {!event && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
                    <Clock size={14} /> Repetir
                  </label>
                  <select
                    value={recurrence}
                    onChange={e => setRecurrence(e.target.value as any)}
                    className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-1.5 text-sm text-dark-text focus:outline-none focus:border-emerald-500"
                  >
                    <option className="bg-dark-bg text-white" value="none">Não repetir</option>
                    <option className="bg-dark-bg text-white" value="daily">Todos os dias</option>
                    <option className="bg-dark-bg text-white" value="weekly">Toda semana</option>
                    <option className="bg-dark-bg text-white" value="monthly">Todo mês</option>
                    <option className="bg-dark-bg text-white" value="yearly">Todo ano</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
                  <Palette size={14} /> Cor
                </label>
                <div className="flex gap-2 py-0.5">
                  {CALENDAR_EVENT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white/20' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Lembretes */}
            <EventFormReminders
              reminders={reminders}
              toggleReminder={toggleReminder}
            />

            {/* Vínculo com Página */}
            {event?.page_id && (
              <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-brand-300 truncate">
                  <BookOpen size={14} className="flex-shrink-0" />
                  <span className="truncate">Vinculado a: <strong>{linkedPage?.title || 'Página do Caderno'}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (event.page_id) {
                      dispatch({ type: 'NAVIGATE_IN_TAB', pageId: event.page_id });
                      onClose();
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors flex-shrink-0"
                >
                  <span>🔗 Ver na Página</span>
                </button>
              </div>
            )}

            {/* Descrição */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
                Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-1.5 text-sm text-dark-text focus:outline-none focus:border-emerald-500 min-h-[60px] max-h-[100px] resize-none"
                placeholder="Detalhes adicionais..."
              />
            </div>
          </form>

          <EventModalFooter
            event={event}
            onDelete={onDelete}
            onClose={onClose}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </Portal>
  );
}

