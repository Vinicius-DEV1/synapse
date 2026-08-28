/**
 * Data, duration and file size formatting utilities.
 */

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds?: number | null, fallback: string = ''): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds <= 0) return fallback;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatHumanDuration(
  seconds?: number | null,
  options?: { includeSeconds?: boolean; fallback?: string }
): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds <= 0) {
    return options?.fallback ?? '0m';
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (options?.includeSeconds) {
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');
    if (h > 0) return `${h}h ${mStr}m ${sStr}s`;
    return `${m}m ${sStr}s`;
  }

  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
