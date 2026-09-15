/**
 * High-performance DOM Distiller & Sanitizer for Caderno Link Intelligence.
 * Strips ads, scripts, cookie modals, trackers, and navigation boilerplate,
 * extracting clean semantic text, embedded YouTube video IDs, and key conceptual images.
 */

export interface DistilledKeyImage {
  src: string;
  caption?: string;
}

export interface DistilledOutboundLink {
  href: string;
  text: string;
}

export interface DistilledContent {
  title: string;
  cleanText: string;
  embeddedYouTubeVideoIds: string[];
  keyImages: DistilledKeyImage[];
  keyOutboundLinks: DistilledOutboundLink[];
  wordCount: number;
}

const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'canvas',
  'form',
  'input',
  'select',
  'textarea',
  'nav',
  'header',
  'footer',
  'aside',
  // Ads & Trackers
  '[class*="cookie" i]',
  '[id*="cookie" i]',
  '[class*="consent" i]',
  '[id*="consent" i]',
  '[class*="banner" i]',
  '[id*="banner" i]',
  '[class*="advert" i]',
  '[id*="advert" i]',
  '[class*="sponsor" i]',
  '[id*="sponsor" i]',
  '[class*="popup" i]',
  '[id*="popup" i]',
  '[class*="modal" i]',
  '[class*="sidebar" i]',
  '[class*="newsletter" i]',
  '[class*="share-button" i]',
  '[class*="social" i]',
  '[class*="taboola" i]',
  '[class*="outbrain" i]',
  '[role="alert"]',
  '[role="dialog"]',
  '[aria-hidden="true"]',
];

const CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '#content',
  '.content',
  '.post-content',
  '.article-content',
  '.article-body',
  '.markdown-body',
  '.entry-content',
];

/**
 * Extracts YouTube Video ID from any URL or embed src.
 */
function extractVideoIdFromEmbed(src: string): string | null {
  if (!src) return null;
  const match = src.match(/(?:embed\/|v\/|watch\?v=|youtu\.be\/|\/shorts\/)([^/?&#]+)/i);
  return match ? match[1] : null;
}

/**
 * Distills raw HTML into clean, noise-free text and extracts rich media context.
 */
export function distillHtmlContent(rawHtml: string, originalUrl?: string): DistilledContent {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return {
      title: '',
      cleanText: '',
      embeddedYouTubeVideoIds: [],
      keyImages: [],
      keyOutboundLinks: [],
      wordCount: 0,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // 1. Extract Title
  let title = '';
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const docTitle = doc.title;
  const h1 = doc.querySelector('h1')?.textContent?.trim();
  title = ogTitle || h1 || docTitle || '';

  // 2. Discover Embedded YouTube Videos BEFORE stripping iframes
  const embeddedYouTubeVideoIds: string[] = [];
  const iframes = Array.from(doc.querySelectorAll('iframe'));
  for (const iframe of iframes) {
    const src = iframe.getAttribute('src') || iframe.getAttribute('data-src') || '';
    if (src.includes('youtube.com') || src.includes('youtu.be')) {
      const vid = extractVideoIdFromEmbed(src);
      if (vid && !embeddedYouTubeVideoIds.includes(vid)) {
        embeddedYouTubeVideoIds.push(vid);
      }
    }
  }

  // 3. Discover Key Conceptual Images (og:image + figures + rich alt images)
  const keyImages: DistilledKeyImage[] = [];
  const seenImageSrcs = new Set<string>();

  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (ogImage && ogImage.startsWith('http')) {
    keyImages.push({ src: ogImage, caption: 'Imagem de Capa / Destaque' });
    seenImageSrcs.add(ogImage);
  }

  const figures = Array.from(doc.querySelectorAll('figure'));
  for (const fig of figures) {
    const img = fig.querySelector('img');
    const caption = fig.querySelector('figcaption')?.textContent?.trim();
    const src = img?.getAttribute('src') || img?.getAttribute('data-src');
    if (src && !seenImageSrcs.has(src) && !src.startsWith('data:') && src.length > 5) {
      keyImages.push({ src, caption });
      seenImageSrcs.add(src);
      if (keyImages.length >= 5) break;
    }
  }

  // 4. Discover Outbound Reference Links (before purging)
  const keyOutboundLinks: DistilledOutboundLink[] = [];
  const currentHost = originalUrl ? (() => { try { return new URL(originalUrl).hostname; } catch { return ''; } })() : '';
  const links = Array.from(doc.querySelectorAll('a[href]'));
  for (const a of links) {
    const href = a.getAttribute('href') || '';
    const text = a.textContent?.trim() || '';
    if (
      href.startsWith('http') &&
      text.length > 3 &&
      text.length < 80 &&
      !href.includes('twitter.com') &&
      !href.includes('facebook.com') &&
      !href.includes('linkedin.com')
    ) {
      try {
        const linkHost = new URL(href).hostname;
        if (linkHost !== currentHost && !keyOutboundLinks.some((l) => l.href === href)) {
          keyOutboundLinks.push({ href, text });
          if (keyOutboundLinks.length >= 8) break;
        }
      } catch {}
    }
  }

  // 5. Purge Noise & Boilerplate Elements
  for (const selector of NOISE_SELECTORS) {
    try {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    } catch {}
  }

  // 6. Find Primary Content Container
  let contentRoot: Element | null = null;
  for (const selector of CONTENT_SELECTORS) {
    const match = doc.querySelector(selector);
    if (match && (match.textContent?.trim().length || 0) > 150) {
      contentRoot = match;
      break;
    }
  }

  // Fallback: evaluate element with highest paragraph text density
  if (!contentRoot) {
    contentRoot = doc.body || doc.documentElement;
  }

  // 7. Format clean, readable text preserving headings, paragraphs, lists and code blocks
  const textBlocks: string[] = [];
  const walker = doc.createTreeWalker(contentRoot, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const tag = (node as Element).tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'blockquote', 'pre', 'code', 'table'].includes(tag)) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    },
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    const el = currentNode as Element;
    const tag = el.tagName.toLowerCase();
    const text = el.textContent?.trim() || '';

    if (text.length > 0) {
      if (tag.startsWith('h')) {
        const level = tag[1];
        textBlocks.push(`\n${'#'.repeat(Number(level))} ${text}\n`);
      } else if (tag === 'li') {
        textBlocks.push(`• ${text}`);
      } else if (tag === 'blockquote') {
        textBlocks.push(`> ${text}`);
      } else if (tag === 'pre') {
        textBlocks.push(`\`\`\`\n${text}\n\`\`\``);
      } else {
        textBlocks.push(text);
      }
    }
    currentNode = walker.nextNode();
  }

  // If tree-walker yielded few elements, fallback to clean textContent of contentRoot
  let cleanText = textBlocks.join('\n\n').trim();
  if (cleanText.length < 100 && contentRoot.textContent) {
    cleanText = contentRoot.textContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  // Cap clean text at 35,000 characters (~8,000 tokens) to guarantee rapid response and low token consumption
  const MAX_CLEAN_TEXT_LENGTH = 35000;
  if (cleanText.length > MAX_CLEAN_TEXT_LENGTH) {
    cleanText = `${cleanText.slice(0, MAX_CLEAN_TEXT_LENGTH)}\n\n[...conteúdo truncado para brevidade...]`;
  }

  const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;

  return {
    title: title.trim(),
    cleanText,
    embeddedYouTubeVideoIds,
    keyImages,
    keyOutboundLinks,
    wordCount,
  };
}
