import { describe, it, expect } from 'vitest';
import { stripHtml, extractImagesFromHtml, getPageAndDescendants } from './content-extractor';
import type { Page } from '../types';

describe('content-extractor', () => {
  describe('stripHtml', () => {
    it('strips html tags and returns clean text', () => {
      const html = '<p>Hello <strong>World</strong>! <span>Caderno</span></p>';
      expect(stripHtml(html)).toBe('Hello World! Caderno');
    });

    it('returns fallback message when html is empty or undefined', () => {
      expect(stripHtml('')).toBe('(página sem conteúdo em texto)');
      expect(stripHtml(undefined)).toBe('(página sem conteúdo em texto)');
    });
  });

  describe('extractImagesFromHtml', () => {
    it('extracts base64 data:image urls from img tags', () => {
      const html = `
        <div>
          <img src="data:image/png;base64,iVBORw0KGgoAAAANS..." />
          <img src="https://example.com/image.jpg" />
          <img src="data:image/jpeg;base64,/9j/4AAQSkZJRg..." />
        </div>
      `;

      const images = extractImagesFromHtml(html);
      expect(images).toHaveLength(2);
      expect(images[0]).toContain('data:image/png;base64,');
      expect(images[1]).toContain('data:image/jpeg;base64,');
    });

    it('returns empty array if no base64 images found', () => {
      expect(extractImagesFromHtml('<p>no images</p>')).toEqual([]);
      expect(extractImagesFromHtml(undefined)).toEqual([]);
    });
  });

  describe('getPageAndDescendants', () => {
    it('recursively gathers root page and all child descendants in order', () => {
      const pages: Page[] = [
        { id: '1', title: 'Root 1', parent_id: null, content: 'Root 1 content' } as Page,
        { id: '2', title: 'Child 1.1', parent_id: '1', content: 'Child 1.1 content' } as Page,
        { id: '3', title: 'Child 1.1.1', parent_id: '2', content: 'Child 1.1.1 content' } as Page,
        { id: '4', title: 'Child 1.2', parent_id: '1', content: 'Child 1.2 content' } as Page,
        { id: '5', title: 'Root 2', parent_id: null, content: 'Root 2 content' } as Page,
      ];

      const result = getPageAndDescendants('1', pages);
      expect(result.map(r => r.id)).toEqual(['1', '2', '4', '3']);
    });
  });
});
