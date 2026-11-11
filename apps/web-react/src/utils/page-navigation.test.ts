import { describe, it, expect } from 'vitest';
import { getFlatPageOrder, getSiblingPageNavigation, getSiblingPages } from './page-navigation';
import type { AppState, Page } from '../types';

describe('pageNavigation - getFlatPageOrder & getSiblingPageNavigation', () => {
  const createMockPage = (
    id: string,
    parent_id: string | null = null,
    is_pinned = false,
    pinned_order?: number,
    updated_at = new Date().toISOString(),
    title?: string,
    sort_order = 0
  ): Page =>
    ({
      id,
      title: title ?? `Page ${id}`,
      icon: '📄',
      sort_order,
      parent_id,
      is_pinned,
      pinned_order,
      updated_at,
      created_at: updated_at,
      content: '',
      color: 'default',
    } as unknown as Page);

  it('orders pinned pages first according to pinned_order', () => {
    const pages = [
      createMockPage('p2', null, true, 2),
      createMockPage('p1', null, true, 1),
      createMockPage('p0', null, true, 0),
      createMockPage('root1', null, false),
    ];

    const state = { pages } as AppState;
    const flat = getFlatPageOrder(state);

    expect(flat.map((p) => p.id)).toEqual(['p0', 'p1', 'p2', 'root1']);
  });

  it('sorts pages by sort_order and natural title alphanumeric order', () => {
    const pages = [
      createMockPage('30-08-2026', null, false, undefined, undefined, '30-08-2026', 0),
      createMockPage('01-08-2026', null, false, undefined, undefined, '01-08-2026', 0),
      createMockPage('28-08-2026', null, false, undefined, undefined, '28-08-2026', 0),
      createMockPage('25-08-2026', null, false, undefined, undefined, '25-08-2026', 0),
    ];

    const state = { pages } as AppState;
    const flat = getFlatPageOrder(state);

    expect(flat.map((p) => p.title)).toEqual([
      '01-08-2026',
      '25-08-2026',
      '28-08-2026',
      '30-08-2026',
    ]);
  });

  it('recursively flattens child pages in natural order under their parent', () => {
    const pages = [
      createMockPage('root-1', null, false, undefined, undefined, 'AGENDA'),
      createMockPage('child-30', 'root-1', false, undefined, undefined, '30-08-2026', 3),
      createMockPage('child-25', 'root-1', false, undefined, undefined, '25-08-2026', 1),
      createMockPage('child-28', 'root-1', false, undefined, undefined, '28-08-2026', 2),
      createMockPage('root-2', null, false, undefined, undefined, 'NOTAS'),
    ];

    const state = { pages } as AppState;
    const flat = getFlatPageOrder(state);

    expect(flat.map((p) => p.id)).toEqual([
      'root-1',
      'child-25',
      'child-28',
      'child-30',
      'root-2',
    ]);
  });

  it('navigates strictly within sibling pages of the same folder', () => {
    const pages = [
      createMockPage('agosto', null, false, undefined, undefined, 'AGOSTO 08'),
      createMockPage('p25', 'agosto', false, undefined, undefined, '25-08-2026', 1),
      createMockPage('p28', 'agosto', false, undefined, undefined, '28-08-2026', 2),
      createMockPage('p30', 'agosto', false, undefined, undefined, '30-08-2026', 3),
      createMockPage('setembro', null, false, undefined, undefined, 'SETEMBRO 09'),
      createMockPage('p01-set', 'setembro', false, undefined, undefined, '01-09-2026', 1),
    ];

    const state = { pages } as AppState;

    // Middle page in agosto
    const nav28 = getSiblingPageNavigation(state, pages[2]);
    expect(nav28.prevPage?.id).toBe('p25');
    expect(nav28.nextPage?.id).toBe('p30');

    // First page in agosto
    const nav25 = getSiblingPageNavigation(state, pages[1]);
    expect(nav25.prevPage).toBeNull();
    expect(nav25.nextPage?.id).toBe('p28');

    // Last page in agosto (stays confined in agosto, does NOT jump into setembro)
    const nav30 = getSiblingPageNavigation(state, pages[3]);
    expect(nav30.prevPage?.id).toBe('p28');
    expect(nav30.nextPage).toBeNull();
  });

  it('excludes soft-deleted pages from sibling navigation and flat order', () => {
    const pages = [
      createMockPage('p1', null, false, undefined, undefined, 'Active Page 1', 1),
      { ...createMockPage('p2', null, false, undefined, undefined, 'Deleted Page', 2), deleted_at: '2026-09-02T12:00:00Z' },
      createMockPage('p3', null, false, undefined, undefined, 'Active Page 2', 3),
    ];

    const state = { pages } as AppState;

    const siblings = getSiblingPages(state, pages[0]);
    expect(siblings.map(p => p.id)).toEqual(['p1', 'p3']);

    const nav1 = getSiblingPageNavigation(state, pages[0]);
    expect(nav1.nextPage?.id).toBe('p3'); // Skips p2 since it's deleted

    const flat = getFlatPageOrder(state);
    expect(flat.map(p => p.id)).toEqual(['p1', 'p3']);
  });
});
