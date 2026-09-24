import type { HabitLog, HabitStats } from '../types/habits';

/**
 * Returns a date string in local YYYY-MM-DD format, avoiding UTC day-shifting.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Shifts a YYYY-MM-DD string by a given number of days.
 */
export function shiftDateString(dateStr: string, daysOffset: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + daysOffset);
  return getLocalDateString(date);
}

/**
 * Calculates habit statistics ($O(N)$ with $O(1)$ set lookups):
 * - Current streak: keeps yesterday's streak alive if today is not yet done
 * - Best streak: maximum consecutive days chain in history
 * - Total completed: total unique completed days
 * - 30-day adherence rate: percentage of completed days in the last 30 days
 */
export function calculateHabitStreak(
  logs: (HabitLog | string)[],
  referenceDateStr?: string
): HabitStats {
  const todayStr = referenceDateStr || getLocalDateString();
  const dateSet = new Set<string>();

  for (const item of logs) {
    const d = typeof item === 'string' ? item : item.date;
    if (d) dateSet.add(d);
  }

  const totalCompleted = dateSet.size;

  // 1. Current Streak calculation
  let currentStreak = 0;
  if (dateSet.has(todayStr)) {
    // Today is completed: streak starts at 1 and counts backwards
    currentStreak = 1;
    let prevDate = shiftDateString(todayStr, -1);
    while (dateSet.has(prevDate)) {
      currentStreak++;
      prevDate = shiftDateString(prevDate, -1);
    }
  } else {
    // Today is not completed yet: check if yesterday was completed to keep the streak alive
    const yesterdayStr = shiftDateString(todayStr, -1);
    if (dateSet.has(yesterdayStr)) {
      currentStreak = 1;
      let prevDate = shiftDateString(yesterdayStr, -1);
      while (dateSet.has(prevDate)) {
        currentStreak++;
        prevDate = shiftDateString(prevDate, -1);
      }
    } else {
      currentStreak = 0;
    }
  }

  // 2. Best Streak calculation
  const sortedDates = Array.from(dateSet).sort();
  let bestStreak = 0;
  let currentChain = 0;
  let lastDate: string | null = null;

  for (const d of sortedDates) {
    if (!lastDate) {
      currentChain = 1;
    } else {
      const expectedNext = shiftDateString(lastDate, 1);
      if (d === expectedNext) {
        currentChain++;
      } else {
        currentChain = 1;
      }
    }
    if (currentChain > bestStreak) {
      bestStreak = currentChain;
    }
    lastDate = d;
  }

  // 3. 30-day Completion Rate
  let past30Count = 0;
  for (let i = 0; i < 30; i++) {
    const checkDate = shiftDateString(todayStr, -i);
    if (dateSet.has(checkDate)) {
      past30Count++;
    }
  }
  const completionRate30Days = Math.round((past30Count / 30) * 100);

  return {
    currentStreak,
    bestStreak,
    totalCompleted,
    completionRate30Days,
  };
}

/**
 * Parses dates from page titles (e.g. "25-09-2026", "25/09/2026", "2026-09-25", "Daily Note 25-09-2026").
 * Returns normalized 'YYYY-MM-DD' or fallback date.
 */
export function resolveDateFromPageTitle(
  pageTitle: string | null | undefined,
  fallbackDate?: string
): string {
  const fallback = fallbackDate || getLocalDateString();
  if (!pageTitle) return fallback;

  const trimmed = pageTitle.trim();

  // Pattern 1: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/(?:^|\D)(0[1-9]|[12][0-9]|3[01])[-/.](0[1-9]|1[012])[-/.](20\d\d)(?:\D|$)/);
  if (dmyMatch) {
    const day = dmyMatch[1];
    const month = dmyMatch[2];
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Pattern 2: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/(?:^|\D)(20\d\d)[-/.](0[1-9]|1[012])[-/.](0[1-9]|[12][0-9]|3[01])(?:\D|$)/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2];
    const day = ymdMatch[3];
    return `${year}-${month}-${day}`;
  }

  return fallback;
}

/**
 * Global reactive event dispatcher to update all habit widgets across notes in real-time.
 */
export function broadcastHabitUpdate(detail: {
  habitId: string;
  date?: string;
  completed?: boolean;
}): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('caderno-habit-updated', { detail }));
  }
}
