/**
 * Helper functions for YouTube playlist items:
 * - Detecting members-only (subscriber_only) videos
 * - Formatting video release/upload dates strictly as DD/MM/YYYY
 */

export interface YouTubeVideoItem {
  id: string;
  title: string;
  duration?: number | null;
  uploader?: string | null;
  channel?: string | null;
  upload_date?: string | null;
  timestamp?: number | null;
  release_timestamp?: number | null;
  availability?: string | null;
  [key: string]: unknown;
}

export interface YouTubePlaylistData {
  title?: string;
  entries?: YouTubeVideoItem[];
  _error?: string;
  [key: string]: unknown;
}

/**
 * Shared in-memory caches preventing duplicate fetches across cards and modals (0ms perceived latency).
 */
export const playlistCache = new Map<string, YouTubePlaylistData>();
export const watchedCache = new Map<string, string[]>();

/**
 * Determines whether a YouTube video is exclusive to channel members.
 */
export function isMembersOnlyVideo(video?: Partial<YouTubeVideoItem> | null): boolean {
  if (!video) return false;

  const availability = (video.availability || '').toLowerCase().trim();
  if (
    availability === 'subscriber_only' ||
    availability === 'premium_only' ||
    availability === 'needs_auth'
  ) {
    return true;
  }

  // Check title markers for members-only indicators
  const title = (video.title || '').toLowerCase();
  if (
    title.includes('[membros]') ||
    title.includes('(membros)') ||
    title.includes('[members]') ||
    title.includes('(members)') ||
    title.includes('exclusivo para membros') ||
    title.includes('somente para membros')
  ) {
    return true;
  }

  return false;
}

/**
 * Formats video release/upload date strictly into "DD/MM/YYYY" (e.g. "15/05/2024").
 */
export function formatVideoReleaseDate(
  timestamp?: number | null,
  uploadDate?: string | null
): string {
  // 1. Try YYYYMMDD string (standard yt-dlp format e.g. "20240515")
  if (typeof uploadDate === 'string' && /^\d{8}$/.test(uploadDate.trim())) {
    const clean = uploadDate.trim();
    const year = clean.slice(0, 4);
    const month = clean.slice(4, 6);
    const day = clean.slice(6, 8);
    return `${day}/${month}/${year}`;
  }

  // 2. Try standard ISO date string
  if (typeof uploadDate === 'string' && uploadDate.trim()) {
    const d = new Date(uploadDate);
    if (!isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  // 3. Try Unix timestamp in seconds (use UTC to prevent negative timezone offsets from shifting the day backwards)
  if (typeof timestamp === 'number' && timestamp > 0) {
    const d = new Date(timestamp * 1000);
    if (!isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  return '';
}
