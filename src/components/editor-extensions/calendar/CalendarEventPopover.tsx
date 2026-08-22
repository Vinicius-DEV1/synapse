import React from 'react';
import { Clock, Bell, ExternalLink, Trash2 } from 'lucide-react';
import type { CalendarEvent } from '../../../types/core';

interface CalendarEventPopoverProps {
  title: string;
  eventData: CalendarEvent | null;
  formatDateLabel: (isoDate?: string) => string;
  remindersLabel: string | null;
  onOpenCalendar: () => void;
  onOpenDeleteConfirm: () => void;
  onClose: () => void;
}

export function CalendarEventPopover({
  title,
  eventData,
  formatDateLabel,
  remindersLabel,
  onOpenCalendar,
  onOpenDeleteConfirm,
  onClose,
}: CalendarEventPopoverProps) {
  return (
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
          onClick={onClose}
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
          onClick={onOpenCalendar}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
        >
          <ExternalLink size={12} />
          <span>Abrir na Agenda</span>
        </button>

        <button
          onClick={onOpenDeleteConfirm}
          className="p-1.5 text-dark-subtext hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Remover widget do texto"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
