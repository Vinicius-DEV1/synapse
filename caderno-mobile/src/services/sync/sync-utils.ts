export const MODULE_TABLES: Record<string, string[]> = {
  notes: ['pages'],
  library: [
    'library_books',
    'library_highlights',
    'library_bookmarks',
  ],
};

let memoryDeviceId = 'mobile_' + Math.random().toString(36).substring(2, 9);

export function getDeviceId(): string {
  return memoryDeviceId;
}

export function parseDateSafe(dateStr: string | undefined | null | number): number {
  if (!dateStr) return 0;
  if (typeof dateStr === 'number') return dateStr;
  let s = String(dateStr);
  if (s.length === 19 && s.charAt(10) === ' ') {
    s = s.replace(' ', 'T') + 'Z';
  } else if (s.length === 19 && s.charAt(10) === 'T' && !s.endsWith('Z')) {
    s = s + 'Z';
  }
  const parsed = new Date(s).getTime();
  return isNaN(parsed) ? 0 : parsed;
}
