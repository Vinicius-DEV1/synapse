import { Bell } from 'lucide-react';

interface EventFormRemindersProps {
  reminders: number[];
  toggleReminder: (val: number) => void;
}

const REMINDER_OPTIONS = [
  { value: 1440, label: '1 dia antes (24h)' },
  { value: 120, label: '2 horas antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 0, label: 'No momento do evento' },
];

export function EventFormReminders({ reminders, toggleReminder }: EventFormRemindersProps) {
  return (
    <div className="space-y-1.5 pt-2 border-t border-white/5">
      <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
        <Bell size={14} className="text-brand-400" /> Avisos / Lembretes Automáticos
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        {REMINDER_OPTIONS.map((opt) => {
          const checked = reminders.includes(opt.value);
          return (
            <div
              key={opt.value}
              onClick={() => toggleReminder(opt.value)}
              className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                checked
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 font-medium'
                  : 'bg-white/5 border-white/5 text-dark-subtext hover:bg-white/10'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                readOnly
                className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-0 pointer-events-none"
              />
              <span>{opt.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
