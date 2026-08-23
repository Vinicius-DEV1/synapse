import { Clock, Bell, ExternalLink, Trash2 } from 'lucide-react';
import type { CalendarEvent } from '../../../types/core';
import { BG_COLORS } from '../../../utils/colors';

interface CalendarEventPopoverProps {
  title: string;
  eventData: CalendarEvent | null;
  formatDateLabel: (isoDate?: string) => string;
  remindersLabel: string | null;
  color?: string;
  onChangeColor?: (color: string) => void;
  onOpenCalendar: () => void;
  onOpenDeleteConfirm: () => void;
  onClose: () => void;
}

export function CalendarEventPopover({
  title,
  eventData,
  formatDateLabel,
  remindersLabel,
  color,
  onChangeColor,
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

      {onChangeColor && (
        <div className="mb-2.5">
          <div className="text-[10px] font-medium text-dark-subtext uppercase tracking-wider mb-1 px-0.5">Cor do Widget</div>
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={() => onChangeColor('default')}
              className={`h-5 rounded border text-[10px] flex items-center justify-center transition-all ${
                !color || color === 'default'
                  ? 'border-white bg-white/20 text-white'
                  : 'border-white/10 hover:border-white/30 text-dark-subtext'
              }`}
              title="Padrão"
            >
              ✕
            </button>
            {BG_COLORS.filter((c) => c.value !== 'transparent').map((c) => {
              const isSelected = color === c.hex || color === c.value;
              return (
                <button
                  key={c.name}
                  onClick={() => onChangeColor(c.hex)}
                  className={`h-5 rounded border border-white/15 transition-transform hover:scale-105 ${
                    isSelected ? 'ring-1 ring-white ring-offset-1 ring-offset-dark-card scale-105' : ''
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              );
            })}
          </div>
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
