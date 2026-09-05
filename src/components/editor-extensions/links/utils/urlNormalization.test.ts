import { describe, it, expect } from 'vitest';
import {
  normalizeLinkUrl,
  isSameUrl,
  getYouTubeVideoId,
  getYouTubePlaylistId,
  extractUrlsFromContent,
  extractUrlSignature,
} from './urlNormalization';

describe('urlNormalization', () => {
  describe('YouTube canonicalization', () => {
    it('normalizes standard watch URL and youtu.be shortlink to the same canonical URL', () => {
      const urlA = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const urlB = 'https://youtu.be/dQw4w9WgXcQ';

      expect(normalizeLinkUrl(urlA)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(normalizeLinkUrl(urlB)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(isSameUrl(urlA, urlB)).toBe(true);
    });

    it('ignores timestamp and tracking parameters in YouTube video links', () => {
      const urlWithTracking = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s&feature=share&ab_channel=RickAstley&si=xyz123';
      const cleanUrl = 'https://youtu.be/dQw4w9WgXcQ?t=20';

      expect(isSameUrl(urlWithTracking, cleanUrl)).toBe(true);
      expect(normalizeLinkUrl(urlWithTracking)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('identifies shorts, embed, and live stream video formats as the same video', () => {
      const shorts = 'https://youtube.com/shorts/dQw4w9WgXcQ';
      const embed = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      const live = 'https://www.youtube.com/live/dQw4w9WgXcQ';

      expect(getYouTubeVideoId(shorts)).toBe('dQw4w9WgXcQ');
      expect(getYouTubeVideoId(embed)).toBe('dQw4w9WgXcQ');
      expect(getYouTubeVideoId(live)).toBe('dQw4w9WgXcQ');
      expect(isSameUrl(shorts, embed)).toBe(true);
      expect(isSameUrl(embed, live)).toBe(true);
    });

    it('handles YouTube playlist canonicalization', () => {
      const playlist1 = 'https://www.youtube.com/playlist?list=PLr6-S5uv57sD3Pj9Wj-E1p_0v9fR7L1q7&si=abc';
      const playlist2 = 'https://youtube.com/playlist?list=PLr6-S5uv57sD3Pj9Wj-E1p_0v9fR7L1q7';

      expect(getYouTubePlaylistId(playlist1)).toBe('PLr6-S5uv57sD3Pj9Wj-E1p_0v9fR7L1q7');
      expect(isSameUrl(playlist1, playlist2)).toBe(true);
      expect(normalizeLinkUrl(playlist1)).toBe('https://www.youtube.com/playlist?list=PLr6-S5uv57sD3Pj9Wj-E1p_0v9fR7L1q7');
    });
  });

  describe('Generic web URL normalization', () => {
    it('ignores secondary query parameters (utm_*, fbclid, ref, etc.)', () => {
      const url1 = 'https://github.com/facebook/react?utm_source=twitter&utm_medium=social&ref=awesome';
      const url2 = 'https://github.com/facebook/react';

      expect(normalizeLinkUrl(url1)).toBe('https://github.com/facebook/react');
      expect(isSameUrl(url1, url2)).toBe(true);
    });

    it('normalizes www prefix and trailing slashes', () => {
      const withWww = 'https://www.wikipedia.org/wiki/TypeScript/';
      const withoutWww = 'https://wikipedia.org/wiki/TypeScript';

      expect(isSameUrl(withWww, withoutWww)).toBe(true);
      expect(normalizeLinkUrl(withWww)).toBe('https://wikipedia.org/wiki/TypeScript');
    });

    it('sorts remaining meaningful query parameters consistently', () => {
      const urlA = 'https://api.example.com/search?page=2&q=solid';
      const urlB = 'https://api.example.com/search?q=solid&page=2';

      expect(normalizeLinkUrl(urlA)).toBe('https://api.example.com/search?page=2&q=solid');
      expect(isSameUrl(urlA, urlB)).toBe(true);
    });

    it('strips non-route anchor fragments', () => {
      const urlWithAnchor = 'https://developer.mozilla.org/en-US/docs/Web/API#specifications';
      const urlClean = 'https://developer.mozilla.org/en-US/docs/Web/API';

      expect(isSameUrl(urlWithAnchor, urlClean)).toBe(true);
    });
  });

  describe('extractUrlsFromContent', () => {
    it('extracts plain text links and HTML attribute links from content', () => {
      const html = `
        <p>Confira este link: https://github.com/facebook/react!</p>
        <div class="link-preview-block" url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></div>
        <a href="https://vite.dev/guide/">Guia</a>
      `;

      const extracted = extractUrlsFromContent(html);
      expect(extracted).toContain('https://github.com/facebook/react');
      expect(extracted).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(extracted).toContain('https://vite.dev/guide/');
    });
  });

  describe('extractUrlSignature', () => {
    it('extracts videoId for YouTube and domain path for standard links', () => {
      expect(extractUrlSignature('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractUrlSignature('https://www.example.com/docs/intro')).toBe('example.com/docs/intro');
    });
  });
});
