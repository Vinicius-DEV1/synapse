import React, { useState } from 'react';
import { Calendar, Clock, Bell, BookOpen, X, Sparkles } from 'lucide-react';
import type { CalendarEvent } from '../../types/core';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventId: string, title: string, dateStr: string, pageId: string | null) => void;
  initialTitle?: string;
  pageId?: string | null;
  pageTitle?: string;
}

const REMINDER_OPTIONS = [
  { value: 1440, label: '1 dia antes (24 horas)', defaultChecked: true },
  { value: 120, label: '2 horas antes', defaultChecked: true },
  { value: 15, label: '15 minutos antes', defaultChecked: true },
  { value: 0, label: 'No momento do evento', defaultChecked: false }
];

export default function CalendarEventModal({
  isOpen,
  onClose,
  onSave,
  initialTitle = '',
  pageId = null,
  pageTitle = ''
}: CalendarEventModalProps) {
  const [title, setTitle] = useState(initialTitle || 'Novo Evento');
  
  // Data e hora padrão: amanhã 14:00
  const defaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState('14:00');
  const [type_, setType_] = useState('mentoria');
  const [selectedReminders, setSelectedReminders] = useState<number[]>(
    REMINDER_OPTIONS.filter(o => o.defaultChecked).map(o => o.value)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleReminder = (val: number) => {
    if (selectedReminders.includes(val)) {
      setSelectedReminders(selectedReminders.filter(v => v !== val));
    } else {
      setSelectedReminders([...selectedReminders, val].sort((a, b) => b - a));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const isoDateStr = `${date}T${time}:00.000Z`;

      const newEventData: Partial<CalendarEvent> = {
        title: title.trim(),
        description: pageTitle ? `Evento vinculado à página: ${pageTitle}` : '',
        start_date: isoDateStr,
        end_date: isoDateStr,
        type_: type_,
        status: 'pending',
        color: '#8B5CF6',
        page_id: pageId || null,
        reminders: selectedReminders,
        notified_reminders: []
      };

      let created: CalendarEvent;
      if (window.api?.calendar) {
        created = await window.api.calendar.createEvent(newEventData);
      } else {
        // Fallback para mock caso api offline
        created = {
          id: crypto.randomUUID(),
          ...newEventData,
          type_: newEventData.type_ || 'geral',
          status: 'pending',
          color: '#8B5CF6'
        } as CalendarEvent;
      }

      onSave(created.id, created.title, created.start_date || isoDateStr, pageId || null);
    } catch (err) {
      console.error('Erro ao criar evento na agenda:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm sm:text-base">Criar Evento na Agenda</h3>
              <p className="text-[11px] text-dark-subtext">Vínculo inline com avisos automáticos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-dark-subtext hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="p-4 space-y-4">
          {/* Linked Page info */}
          {pageTitle && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs">
              <BookOpen size={14} className="flex-shrink-0" />
              <span className="truncate">Vinculado à página: <strong>{pageTitle}</strong></span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-dark-subtext mb-1">
              Título do Evento *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Mentoria 01 - Arquitetura"
              className="w-full px-3 py-2 bg-dark-bg border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
              autoFocus
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-dark-subtext mb-1 flex items-center gap-1">
                <Calendar size={12} />
                <span>Data</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-dark-bg border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-subtext mb-1 flex items-center gap-1">
                <Clock size={12} />
                <span>Hora</span>
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-dark-bg border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-dark-subtext mb-1">
              Tipo de Evento
            </label>
            <select
              value={type_}
              onChange={e => setType_(e.target.value)}
              className="w-full px-3 py-2 bg-dark-bg border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="mentoria">🎯 Mentoria</option>
              <option value="reuniao">🤝 Reunião</option>
              <option value="aula">📚 Aula / Curso</option>
              <option value="estudo">✏️ Estudo</option>
              <option value="geral">📅 Geral</option>
            </select>
          </div>

          {/* Reminders Checkboxes */}
          <div className="pt-2 border-t border-white/10">
            <label className="block text-xs font-medium text-dark-subtext mb-2 flex items-center gap-1.5">
              <Bell size={13} className="text-brand-400" />
              <span>Lembretes e Avisos Automáticos</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REMINDER_OPTIONS.map(opt => {
                const checked = selectedReminders.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    onClick={() => toggleReminder(opt.value)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                      checked
                        ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 font-medium'
                        : 'bg-white/5 border-white/5 text-dark-subtext hover:bg-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-0"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
            >
              <Sparkles size={14} />
              <span>{isSubmitting ? 'Criando...' : 'Criar Evento Inline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
