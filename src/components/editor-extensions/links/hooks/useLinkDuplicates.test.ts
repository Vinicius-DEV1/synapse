import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findDuplicatePagesForLink,
  clearPageContentCache,
} from './useLinkDuplicates';
import type { Page } from '../../../../types';

describe('useLinkDuplicates', () => {
  beforeEach(() => {
    clearPageContentCache();
    vi.restoreAllMocks();
  });

  const mockPages: Page[] = [
    {
      id: 'page-current',
      parent_id: null,
      title: 'Página Atual',
      icon: '📝',
      content: '<p>Texto da página atual</p>',
      sort_order: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'page-parent',
      parent_id: null,
      title: 'Página Pai',
      icon: '📁',
      content: '',
      sort_order: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'page-child',
      parent_id: 'page-parent',
      title: 'Página Filho',
      icon: '📄',
      content: `
        <h2>Anotações de Estudo</h2>
        <div class="link-preview-block" url="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s"></div>
      `,
      sort_order: 2,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'page-other',
      parent_id: null,
      title: 'Outro Projeto',
      icon: '🚀',
      content: '<p>Link para doc: <a href="https://github.com/facebook/react?utm_source=test">React</a></p>',
      sort_order: 3,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'page-deleted',
      parent_id: null,
      title: 'Página Lixeira',
      icon: '🗑️',
      content: '<p>https://www.youtube.com/watch?v=dQw4w9WgXcQ</p>',
      deleted_at: '2026-01-02',
      sort_order: 4,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  it('detects duplicate YouTube video link across different URLs and ignores timestamp params', async () => {
    const targetUrl = 'https://youtu.be/dQw4w9WgXcQ'; // Target uses shortlink
    const duplicates = await findDuplicatePagesForLink(targetUrl, mockPages, 'page-current');

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].id).toBe('page-child');
    expect(duplicates[0].title).toBe('Página Filho');
    expect(duplicates[0].ancestors).toHaveLength(1);
    expect(duplicates[0].ancestors[0].title).toBe('Página Pai');
  });

  it('detects duplicate web link ignoring utm tracking parameters', async () => {
    const targetUrl = 'https://github.com/facebook/react/';
    const duplicates = await findDuplicatePagesForLink(targetUrl, mockPages, 'page-current');

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].id).toBe('page-other');
    expect(duplicates[0].title).toBe('Outro Projeto');
  });

  it('excludes current page and deleted pages from duplicate search', async () => {
    // Both page-current and page-deleted should be ignored
    const targetUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const duplicates = await findDuplicatePagesForLink(targetUrl, mockPages, 'page-child');

    // Since page-child is the current page, and page-deleted has deleted_at, it should find 0 duplicates
    expect(duplicates).toHaveLength(0);
  });

  it('fetches content via window.api when page content is not resident in memory', async () => {
    const pagesWithoutContent: Page[] = [
      {
        id: 'page-lazy',
        parent_id: null,
        title: 'Página Descarregada',
        icon: '📦',
        sort_order: 0,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];

    (window as any).api = {
      getPageContent: vi.fn().mockResolvedValue({
        content: '<p>Link inserido aqui: https://vite.dev/guide</p>',
      }),
    };

    const duplicates = await findDuplicatePagesForLink(
      'https://vite.dev/guide?ref=twitter',
      pagesWithoutContent,
      'other-page'
    );

    expect((window as any).api.getPageContent).toHaveBeenCalledWith('page-lazy');
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].id).toBe('page-lazy');
  });
});
