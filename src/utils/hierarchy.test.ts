import { describe, it, expect } from 'vitest';
import {
  isPageDescendant,
  isValidHierarchyMove,
  getPageAncestors,
  getPagePath,
  getPageBreadcrumbString,
} from './hierarchy';

describe('Hierarchy Utilities', () => {
  const samplePages = [
    { id: 'root-1', title: 'Faculdade', parent_id: null },
    { id: 'child-1-1', title: 'Programação', parent_id: 'root-1' },
    { id: 'child-1-1-1', title: 'POO', parent_id: 'child-1-1' },
    { id: 'root-2', title: 'Pessoal', parent_id: null },
    { id: 'child-2-1', title: 'Finanças', parent_id: 'root-2' },
  ];

  it('detects direct children as descendants', () => {
    expect(isPageDescendant(samplePages, 'root-1', 'child-1-1')).toBe(true);
  });

  it('detects nested children as descendants', () => {
    expect(isPageDescendant(samplePages, 'root-1', 'child-1-1-1')).toBe(true);
  });

  it('returns false for unrelated branches', () => {
    expect(isPageDescendant(samplePages, 'root-1', 'child-2-1')).toBe(false);
    expect(isPageDescendant(samplePages, 'child-1-1', 'root-2')).toBe(false);
  });

  it('validates hierarchy moves preventing circular loops', () => {
    // Moving root-1 into its own sub-child child-1-1-1 is invalid
    expect(isValidHierarchyMove(samplePages, 'root-1', 'child-1-1-1')).toBe(false);
    expect(isValidHierarchyMove(samplePages, 'root-1', 'child-1-1')).toBe(false);
    expect(isValidHierarchyMove(samplePages, 'root-1', 'root-1')).toBe(false);

    // Moving to root is valid
    expect(isValidHierarchyMove(samplePages, 'child-1-1', null)).toBe(true);

    // Moving to another independent branch is valid
    expect(isValidHierarchyMove(samplePages, 'child-1-1', 'root-2')).toBe(true);
  });

  describe('getPageAncestors and getPagePath', () => {
    it('returns empty array for root page ancestors', () => {
      expect(getPageAncestors(samplePages, 'root-1')).toEqual([]);
    });

    it('returns ordered ancestors from root to parent for nested page', () => {
      const ancestors = getPageAncestors(samplePages, 'child-1-1-1');
      expect(ancestors.map(a => a.id)).toEqual(['root-1', 'child-1-1']);
      expect(ancestors.map(a => a.title)).toEqual(['Faculdade', 'Programação']);
    });

    it('returns full path including target page', () => {
      const path = getPagePath(samplePages, 'child-1-1-1');
      expect(path.map(p => p.title)).toEqual(['Faculdade', 'Programação', 'POO']);
    });

    it('handles cyclic parent references without infinite looping', () => {
      const cyclicPages = [
        { id: 'a', title: 'A', parent_id: 'b' },
        { id: 'b', title: 'B', parent_id: 'a' },
      ];
      const ancestors = getPageAncestors(cyclicPages, 'a');
      expect(ancestors.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getPageBreadcrumbString', () => {
    it('returns root label for root items', () => {
      expect(getPageBreadcrumbString(samplePages, 'root-1')).toBe('Início');
      expect(getPageBreadcrumbString(samplePages, 'root-1', { rootLabel: 'Raiz' })).toBe('Raiz');
    });

    it('formats ancestors breadcrumb string with custom separator', () => {
      expect(getPageBreadcrumbString(samplePages, 'child-1-1-1')).toBe('Faculdade › Programação');
      expect(getPageBreadcrumbString(samplePages, 'child-1-1-1', { separator: ' / ' })).toBe('Faculdade / Programação');
    });

    it('formats full path including self if requested', () => {
      expect(getPageBreadcrumbString(samplePages, 'child-1-1-1', { includeSelf: true })).toBe('Faculdade › Programação › POO');
    });

    it('truncates long ancestral breadcrumb when maxAncestors is provided', () => {
      const deepPages = [
        { id: '1', title: 'Nível 1', parent_id: null },
        { id: '2', title: 'Nível 2', parent_id: '1' },
        { id: '3', title: 'Nível 3', parent_id: '2' },
        { id: '4', title: 'Nível 4', parent_id: '3' },
        { id: '5', title: 'Nível 5', parent_id: '4' },
      ];
      const formatted = getPageBreadcrumbString(deepPages, '5', { maxAncestors: 2 });
      expect(formatted).toBe('Nível 1 › ... › Nível 4');
    });
  });
});
