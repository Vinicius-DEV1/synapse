import { format } from 'date-fns';

/**
 * Returns current or given date formatted as 'YYYY-MM-DD' in user's local timezone.
 */
export function getLocalIsoDate(d: Date = new Date()): string {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
}

/**
 * Converts a date string (ISO, 'YYYY-MM-DD', 'YYYY-MM-DDT00:00:00.000Z', etc)
 * to a Date object in user's local timezone without shifting days in negative UTC offsets.
 */
export function parseEventDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date();

  // If format is 'YYYY-MM-DD' or ends with T00:00:00
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ||
    /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z?$/.test(dateStr)
  ) {
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return new Date();
  return parsed;
}

/**
 * Returns the day string ('YYYY-MM-DD') in local timezone safely.
 */
export function getEventDayStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  if (
    dateStr.length >= 10 &&
    (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ||
     /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z?$/.test(dateStr))
  ) {
    return dateStr.slice(0, 10);
  }
  const d = parseEventDate(dateStr);
  return format(d, 'yyyy-MM-dd');
}

/**
 * Returns formatted event time 'HH:mm' in local timezone.
 */
export function getEventTimeStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = parseEventDate(dateStr);
  return format(d, 'HH:mm');
}

/**
 * Formats a date string to 'dd/MM/yyyy HH:mm'
 */
export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = parseEventDate(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Formats a date string to 'dd MMM yyyy, HH:mm:ss'
 */
export function formatDateTimeWithSeconds(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = parseEventDate(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Formats a date string to 'dd MMM' (e.g. '15 out')
 */
export function formatDayMonth(dateStr?: string | null, fallback: string = 'Recente'): string {
  if (!dateStr) return fallback;
  try {
    const d = parseEventDate(dateStr);
    if (isNaN(d.getTime())) return fallback;
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);
  } catch {
    return fallback;
  }
}
