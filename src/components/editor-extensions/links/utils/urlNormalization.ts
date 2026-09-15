/**
 * URL normalization utility for Caderno link widgets.
 * Handles canonicalization of YouTube videos/playlists, removes tracking parameters,
 * and extracts URLs from document contents.
 */

const SECONDARY_QUERY_PARAMS = new Set([
  // Google / UTM
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_reader',
  'gclid',
  'dclid',
  '_ga',
  '_gl',
  // Facebook / Meta / Instagram
  'fbclid',
  'igshid',
  // Microsoft
  'msclkid',
  // Mailchimp / Email
  'mc_eid',
  'mc_cid',
  // Yandex
  'yclid',
  // Sharing & Referral tags
  'si',
  'ref',
  'ref_src',
  'source',
  'feature',
  'spm',
  'from',
  'ab_channel',
  // Video timestamp tracking parameters (when comparing videos for identity)
  't',
  'time_continue',
]);

/**
 * Extracts a YouTube video ID if present in the given URL.
 */
export function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0]?.split('?')[0];
      return id || null;
    }

    if (host.includes('youtube.com')) {
      // 1. /watch?v=VIDEO_ID
      const v = parsed.searchParams.get('v');
      if (v) return v;

      // 2. /embed/VIDEO_ID, /shorts/VIDEO_ID, /v/VIDEO_ID, /live/VIDEO_ID
      const match = parsed.pathname.match(/\/(?:embed|shorts|v|live)\/([^/?&#]+)/i);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts a YouTube playlist ID if present in the given URL.
 */
export function getYouTubePlaylistId(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host.includes('youtube.com') || host === 'youtu.be') {
      return parsed.searchParams.get('list');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Normalizes a URL by stripping secondary/tracking query parameters, standardizing
 * protocol/hostname, and converting YouTube links to canonical forms.
 */
export function normalizeLinkUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // 1. YouTube canonicalization
  const ytVideoId = getYouTubeVideoId(trimmed);
  if (ytVideoId) {
    return `https://www.youtube.com/watch?v=${ytVideoId}`;
  }

  const ytPlaylistId = getYouTubePlaylistId(trimmed);
  if (ytPlaylistId) {
    return `https://www.youtube.com/playlist?list=${ytPlaylistId}`;
  }

  // 2. Vimeo canonicalization
  try {
    const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+))/i);
    if (vimeoMatch && vimeoMatch[2]) {
      return `https://vimeo.com/${vimeoMatch[2]}`;
    }
  } catch {
    // Ignore regex error and proceed
  }

  // 3. General URL parsing & normalization
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);

    // Lowercase hostname and remove leading www.
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    // Standardize protocol (https)
    const protocol = 'https:';

    // Normalize pathname (remove duplicate slashes and trailing slash)
    let pathname = parsed.pathname.replace(/\/+/g, '/');
    if (pathname === '/') {
      pathname = '';
    } else if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Strip secondary/tracking query parameters and sort remaining
    const remainingParams = new URLSearchParams();
    const sortedKeys = Array.from(parsed.searchParams.keys()).sort();

    for (const key of sortedKeys) {
      if (!SECONDARY_QUERY_PARAMS.has(key.toLowerCase())) {
        const values = parsed.searchParams.getAll(key);
        for (const val of values) {
          remainingParams.append(key, val);
        }
      }
    }

    const search = remainingParams.toString() ? `?${remainingParams.toString()}` : '';

    // Handle hash: retain only if SPA route (e.g. #/dashboard), strip anchor tags
    let hash = '';
    if (parsed.hash.startsWith('#/')) {
      hash = parsed.hash;
    }

    return `${protocol}//${hostname}${pathname}${search}${hash}`;
  } catch {
    // Fallback for non-standard or relative URLs
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Returns a fast signature string (e.g. videoId or domain path) used for
 * fast preliminary string matching in page contents before running expensive regexes.
 */
export function extractUrlSignature(url: string): string | null {
  const ytId = getYouTubeVideoId(url);
  if (ytId) return ytId;

  const playlistId = getYouTubePlaylistId(url);
  if (playlistId) return playlistId;

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let path = parsed.pathname.length > 1 ? parsed.pathname : '';
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return `${host}${path}`.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Checks whether two URLs point to the same canonical resource.
 */
export function isSameUrl(urlA: string, urlB: string): boolean {
  if (!urlA || !urlB) return false;
  return normalizeLinkUrl(urlA) === normalizeLinkUrl(urlB);
}

/**
 * Extracts all URLs found within an HTML or text content string.
 * Strips surrounding quotation marks, brackets, and trailing punctuation.
 */
export function extractUrlsFromContent(content: string): string[] {
  if (!content || typeof content !== 'string') return [];

  const foundUrls: string[] = [];
  const urlRegex = /(?:https?:\/\/|www\.)[^\s"'<>\\{}|^`[\]]+/gi;

  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(content)) !== null) {
    let raw = match[0];
    // Clean trailing punctuation like ., ), ;, etc.
    raw = raw.replace(/[.,;:!?)]+$/, '');
    if (raw.length > 5) {
      foundUrls.push(raw);
    }
  }

  // Also check explicit attribute patterns: url="...", href="..."
  const attrRegex = /(?:url|href)=["'](https?:\/\/[^"']+)["']/gi;
  while ((match = attrRegex.exec(content)) !== null) {
    if (match[1]) {
      foundUrls.push(match[1]);
    }
  }

  return Array.from(new Set(foundUrls));
}
