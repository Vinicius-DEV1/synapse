import React, { useState, useEffect } from 'react';
import type { CalendarEvent } from '../../types';
import { X, Calendar as CalendarIcon, Clock, Type, Palette } from 'lucide-react';
import { format } from 'date-fns';

interface EventModalProps {
  event: CalendarEvent | null;
  onSave: (eventData: Partial<CalendarEvent>) => void;
  onClose: () => void;
  onDelete?: (deleteAll: boolean) => void;
  initialDate?: Date;
}

const COLORS = ['#4F46E5', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#64748B'];

export default function EventModal({ event, onSave, onClose, onDelete, initialDate }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [type, setType] = useState<'event' | 'task'>('event');
  const [color, setColor] = useState(COLORS[0]);
  const [isAllDay, setIsAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setType(event.type);
      setColor(event.color || COLORS[0]);

      if (event.start_date) {
        const start = new Date(event.start_date);
        if (!isNaN(start.getTime())) {
          setStartDate(format(start, 'yyyy-MM-dd'));
          setStartTime(format(start, 'HH:mm'));
        }
      }

      if (event.end_date) {
        const end = new Date(event.end_date);
        if (!isNaN(end.getTime())) {
          setEndDate(format(end, 'yyyy-MM-dd'));
          setEndTime(format(end, 'HH:mm'));
        }
      }
      
      // Se for de 00:00 até 23:59, consideramos "Dia Inteiro"
      if (event.start_date && event.end_date) {
        const start = new Date(event.start_date);
        const end = new Date(event.end_date);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          if (format(start, 'HH:mm') === '00:00' && format(end, 'HH:mm') === '23:59') {
            setIsAllDay(true);
          }
        }
      } else {
        setIsAllDay(false);
      }
    } else {
      const now = initialDate || new Date();
      setStartDate(format(now, 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
      setIsAllDay(false);
    }
  }, [event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !startTime || !endDate || !endTime) return;
    const finalStartTime = isAllDay ? '00:00' : startTime;
    const finalEndTime = isAllDay ? '23:59' : endTime;

    const start_date = new Date(`${startDate}T${finalStartTime}`).toISOString();
    const end_date = new Date(`${endDate}T${finalEndTime}`).toISOString();

    onSave({
      title: title.trim(),
      description: description.trim(),
      start_date,
      end_date,
      type,
      color,
      status: event?.status || 'pending',
      recurrence_rule: recurrence !== 'none' ? recurrence : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1924] border border-dark-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-dark-border">
          <h2 className="text-lg font-medium text-dark-text">
            {event ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-dark-hover text-dark-subtext">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 flex-1 overflow-y-auto">
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
          <div className="space-y-1.5">
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
          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isAllDay} 
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="rounded border-dark-border bg-dark-bg text-emerald-500 focus:ring-emerald-500/20"
              />
              <span className="text-sm text-dark-text">Dia inteiro</span>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
                  <CalendarIcon size={14} /> Início
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-md px-2 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500"
                    required
                  />
                  {!isAllDay && (
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-24 bg-dark-bg border border-dark-border rounded-md px-2 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500"
                      required
                    />
                  )}
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
                  <CalendarIcon size={14} /> Fim
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-md px-2 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500"
                    required
                  />
                  {!isAllDay && (
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-24 bg-dark-bg border border-dark-border rounded-md px-2 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500"
                      required
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Repetição (Apenas na Criação) */}
          {!event && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
                <Clock size={14} /> Repetir
              </label>
              <select
                value={recurrence}
                onChange={e => setRecurrence(e.target.value as any)}
                className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500"
              >
                <option value="none">Não repetir</option>
                <option value="daily">Todos os dias</option>
                <option value="weekly">Toda semana</option>
                <option value="monthly">Todo mês</option>
                <option value="yearly">Todo ano</option>
              </select>
            </div>
          )}
          {/* Cor */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
              <Palette size={14} /> Cor
            </label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white/20' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500 min-h-[80px] resize-none"
              placeholder="Detalhes adicionais..."
            />
          </div>
        </form>

        <div className="p-4 border-t border-dark-border flex justify-between bg-dark-bg/50">
          {onDelete && event ? (
            event.recurrence_rule?.startsWith('group_') ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onDelete(false)}
                  className="px-2 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
                >
                  Excluir Este
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(true)}
                  className="px-2 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
                >
                  Excluir Série
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onDelete(false)}
                className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
              >
                Excluir
              </button>
            )
          ) : <div></div>}
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-dark-subtext hover:text-dark-text hover:bg-dark-hover rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-sm"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
