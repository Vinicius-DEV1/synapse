import { describe, it, expect } from 'vitest';
import { isPageDescendant, isValidHierarchyMove } from './hierarchy';

describe('Hierarchy Utilities', () => {
  const samplePages = [
    { id: 'root-1', parent_id: null },
    { id: 'child-1-1', parent_id: 'root-1' },
    { id: 'child-1-1-1', parent_id: 'child-1-1' },
    { id: 'root-2', parent_id: null },
    { id: 'child-2-1', parent_id: 'root-2' },
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
});
