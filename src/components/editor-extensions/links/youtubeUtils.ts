export { formatDuration } from '../../../utils/format';

export const formatSingleDate = (raw: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.includes('/')) return trimmed;

  // Format: YYYYMMDD (8 digits)
  if (/^\d{8}$/.test(trimmed)) {
    const year = trimmed.substring(0, 4);
    const month = trimmed.substring(4, 6);
    const day = trimmed.substring(6, 8);
    return `${day}/${month}/${year}`;
  }

  // Format: YYYY-MM-DD (ISO)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  // Fallback: Date parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const year = parsed.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  return trimmed;
};

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Check for range like "20210101 - 20230510" or "2021-01-01 - 2023-05-10" or "20210101 – 20230510"
  if (trimmed.includes(' - ') || trimmed.includes(' – ') || trimmed.includes(' to ')) {
    const parts = trimmed.split(/ [-–] | to /);
    if (parts.length === 2) {
      const start = formatSingleDate(parts[0]);
      const end = formatSingleDate(parts[1]);
      if (start && end && start !== end) {
        return `${start} – ${end}`;
      }
      return start || end || '';
    }
  }

  return formatSingleDate(trimmed);
};

export const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

export const getVideoId = (videoUrl: string): string | null => {
  try {
    const urlObj = new URL(videoUrl);
    if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    }
    return urlObj.searchParams.get('v');
  } catch {
    return null;
  }
};
