import { describe, it, expect } from 'vitest';
import { getFlatPageOrder } from './pageNavigation';
import type { AppState, Page } from '../types';

describe('pageNavigation - getFlatPageOrder', () => {
  const createMockPage = (
    id: string,
    parent_id: string | null = null,
    is_pinned = false,
    pinned_order?: number,
    updated_at = new Date().toISOString()
  ): Page =>
    ({
      id,
      title: `Page ${id}`,
      icon: '📄',
      sort_order: 0,
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

  it('sorts root pages by updated_at descending after pinned pages', () => {
    const t1 = new Date('2026-01-01T10:00:00Z').toISOString();
    const t2 = new Date('2026-01-02T10:00:00Z').toISOString();
    const t3 = new Date('2026-01-03T10:00:00Z').toISOString();

    const pages = [
      createMockPage('root-old', null, false, undefined, t1),
      createMockPage('root-new', null, false, undefined, t3),
      createMockPage('root-mid', null, false, undefined, t2),
    ];

    const state = { pages } as AppState;
    const flat = getFlatPageOrder(state);

    expect(flat.map((p) => p.id)).toEqual(['root-new', 'root-mid', 'root-old']);
  });

  it('recursively flattens child pages under their respective parent', () => {
    const t1 = new Date('2026-01-01T10:00:00Z').toISOString();
    const t2 = new Date('2026-01-02T10:00:00Z').toISOString();

    const pages = [
      createMockPage('root-1', null, false, undefined, t1),
      createMockPage('child-1-1', 'root-1', false, undefined, t1),
      createMockPage('child-1-2', 'root-1', false, undefined, t2),
      createMockPage('child-1-1-1', 'child-1-1', false, undefined, t1),
      createMockPage('root-2', null, false, undefined, t2),
    ];

    const state = { pages } as AppState;
    const flat = getFlatPageOrder(state);

    // root-2 comes first because t2 > t1.
    // under root-1, child-1-2 comes first (t2 > t1), then child-1-1 followed by child-1-1-1.
    expect(flat.map((p) => p.id)).toEqual([
      'root-2',
      'root-1',
      'child-1-2',
      'child-1-1',
      'child-1-1-1',
    ]);
  });
});
