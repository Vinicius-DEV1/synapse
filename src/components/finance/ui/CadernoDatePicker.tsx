import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDateSafe } from './TransactionList';

export interface CadernoDatePickerProps {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  accentColor?: 'brand' | 'amber';
  id?: string;
  className?: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function parseYMD(str?: string): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const parts = str.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return { year: parts[0], month: parts[1] - 1, day: parts[2] };
}

function formatYMD(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CadernoDatePicker({
  value,
  onChange,
  label,
  placeholder = 'Selecionar data...',
  required = false,
  disabled = false,
  accentColor = 'brand',
  id,
  className = '',
}: CadernoDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseYMD(value), [value]);

  // View state for month and year being browsed
  const [viewYear, setViewYear] = useState(() => parsed?.year || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsed !== null ? parsed.month : new Date().getMonth());

  // Sync view state when value changes from outside
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value, parsed]);

  // Click-outside listener with mousedown for instant non-blocking closing
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick, { passive: true });
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formatted = formatYMD(viewYear, viewMonth, day);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    onChange(formatYMD(now.getFullYear(), now.getMonth(), now.getDate()));
    setIsOpen(false);
  };

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; ymd: string }> = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({ day: d, isCurrentMonth: false, ymd: formatYMD(prevY, prevM, d) });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, isCurrentMonth: true, ymd: formatYMD(viewYear, viewMonth, d) });
    }

    // Next month filler days to complete grid (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({ day: d, isCurrentMonth: false, ymd: formatYMD(nextY, nextM, d) });
    }

    return days;
  }, [viewYear, viewMonth]);

  const todayYMD = useMemo(() => {
    const now = new Date();
    return formatYMD(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const activeColorClasses = accentColor === 'amber'
    ? 'text-amber-400 focus-within:border-amber-500/50'
    : 'text-brand-400 focus-within:border-brand-500/50';

  return (
    <div ref={containerRef} className={`relative flex flex-col ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs text-dark-subtext mb-1 flex items-center justify-between"
        >
          <span className="flex items-center gap-1 font-medium">
            <Calendar size={12} className={accentColor === 'amber' ? 'text-amber-400' : 'text-brand-400'} />
            <span>{label}</span>
          </span>
          {value && !required && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-dark-subtext hover:text-rose-400 flex items-center gap-0.5 transition-colors cursor-pointer"
              title="Limpar data"
            >
              <X size={11} />
              <span>Limpar</span>
            </button>
          )}
        </label>
      )}

      {/* Main trigger button/display */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(prev => !prev);
          }
        }}
        className={`w-full bg-dark-bg border border-white/10 rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer select-none transition-colors outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'
        } ${activeColorClasses}`}
      >
        <span className={value ? 'text-dark-text font-medium' : 'text-dark-subtext/70'}>
          {value ? formatDateSafe(value) : placeholder}
        </span>

        <div className="flex items-center gap-1">
          {value && !required && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-0.5 text-dark-subtext hover:text-rose-400 rounded transition-colors"
              title="Limpar data"
            >
              <X size={12} />
            </button>
          )}
          <Calendar size={13} className="text-dark-subtext shrink-0" />
        </div>
      </div>

      {/* Floating Calendar Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Calendário"
          className="absolute z-50 mt-1 left-0 top-full bg-dark-card border border-white/[0.12] rounded-xl shadow-2xl p-3 w-64 animate-scale-in select-none"
        >
          {/* Header with Month / Year and navigation */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-dark-subtext hover:text-dark-text hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-xs font-semibold text-dark-text">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-dark-subtext hover:text-dark-text hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES.map((wd) => (
              <span key={wd} className="text-[10px] font-semibold text-dark-subtext/70">
                {wd}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map(({ day, isCurrentMonth, ymd }) => {
              const isSelected = ymd === value;
              const isToday = ymd === todayYMD;

              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-7 w-7 mx-auto flex items-center justify-center text-xs rounded-lg transition-all cursor-pointer font-medium ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : isToday
                      ? 'bg-white/10 text-brand-300 font-bold border border-brand-500/40'
                      : isCurrentMonth
                      ? 'text-dark-text hover:bg-white/5'
                      : 'text-dark-subtext/40 hover:bg-white/5'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer with Today and Clear */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/5 text-xs">
            {!required ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-dark-subtext hover:text-rose-400 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Limpar
              </button>
            ) : <span />}

            <button
              type="button"
              onClick={handleToday}
              className="text-brand-400 hover:text-brand-300 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

