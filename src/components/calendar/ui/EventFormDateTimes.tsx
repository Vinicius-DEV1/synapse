import { Calendar as CalendarIcon } from 'lucide-react';

interface EventFormDateTimesProps {
  isAllDay: boolean;
  setIsAllDay: (val: boolean) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  startTime: string;
  setStartTime: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  endTime: string;
  setEndTime: (val: string) => void;
}

export function EventFormDateTimes({
  isAllDay,
  setIsAllDay,
  startDate,
  setStartDate,
  startTime,
  setStartTime,
  endDate,
  setEndDate,
  endTime,
  setEndTime,
}: EventFormDateTimesProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isAllDay}
          onChange={(e) => setIsAllDay(e.target.checked)}
          className="rounded border-dark-border bg-dark-bg text-emerald-500 focus:ring-emerald-500/20"
        />
        <span className="text-sm text-dark-text">Dia inteiro</span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
            <CalendarIcon size={14} /> Início
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-md px-2 py-1.5 text-sm text-dark-text focus:outline-none focus:border-emerald-500"
              required
            />
            {!isAllDay && (
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-24 bg-dark-bg border border-dark-border rounded-md px-2 py-1.5 text-sm text-dark-text focus:outline-none focus:border-emerald-500"
                required
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-dark-subtext flex items-center gap-1.5">
            <CalendarIcon size={14} /> Fim
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-md px-2 py-1.5 text-sm text-dark-text focus:outline-none focus:border-emerald-500"
              required
            />
            {!isAllDay && (
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-24 bg-dark-bg border border-dark-border rounded-md px-2 py-1.5 text-sm text-dark-text focus:outline-none focus:border-emerald-500"
                required
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
