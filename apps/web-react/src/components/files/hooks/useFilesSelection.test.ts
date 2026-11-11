import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilesSelection } from './useFilesSelection';

describe('useFilesSelection hook', () => {
  const mockItems = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5'];

  it('selects single item on normal click', () => {
    const { result } = renderHook(() => useFilesSelection());

    act(() => {
      result.current.selectItemWithModifiers('item-2', {}, mockItems);
    });

    expect(result.current.selectedIds.size).toBe(1);
    expect(result.current.selectedIds.has('item-2')).toBe(true);

    act(() => {
      result.current.selectItemWithModifiers('item-4', {}, mockItems);
    });

    expect(result.current.selectedIds.size).toBe(1);
    expect(result.current.selectedIds.has('item-4')).toBe(true);
  });

  it('toggles items with Ctrl/Cmd modifier', () => {
    const { result } = renderHook(() => useFilesSelection());

    act(() => {
      result.current.selectItemWithModifiers('item-1', { ctrlKey: true }, mockItems);
    });
    expect(result.current.selectedIds.has('item-1')).toBe(true);

    act(() => {
      result.current.selectItemWithModifiers('item-3', { ctrlKey: true }, mockItems);
    });
    expect(result.current.selectedIds.size).toBe(2);
    expect(result.current.selectedIds.has('item-1')).toBe(true);
    expect(result.current.selectedIds.has('item-3')).toBe(true);

    // Toggle off
    act(() => {
      result.current.selectItemWithModifiers('item-1', { ctrlKey: true }, mockItems);
    });
    expect(result.current.selectedIds.size).toBe(1);
    expect(result.current.selectedIds.has('item-1')).toBe(false);
    expect(result.current.selectedIds.has('item-3')).toBe(true);
  });

  it('selects continuous range with Shift modifier', () => {
    const { result } = renderHook(() => useFilesSelection());

    // Click item-2 first as anchor
    act(() => {
      result.current.selectItemWithModifiers('item-2', {}, mockItems);
    });
    expect(result.current.selectedIds.has('item-2')).toBe(true);

    // Shift click item-4 -> selects item-2, item-3, item-4
    act(() => {
      result.current.selectItemWithModifiers('item-4', { shiftKey: true }, mockItems);
    });

    expect(result.current.selectedIds.size).toBe(3);
    expect(result.current.selectedIds.has('item-2')).toBe(true);
    expect(result.current.selectedIds.has('item-3')).toBe(true);
    expect(result.current.selectedIds.has('item-4')).toBe(true);
  });

  it('selects all items with selectAll and clears with clearSelection', () => {
    const { result } = renderHook(() => useFilesSelection());

    act(() => {
      result.current.selectAll(mockItems);
    });
    expect(result.current.selectedIds.size).toBe(5);

    act(() => {
      result.current.clearSelection();
    });
    expect(result.current.selectedIds.size).toBe(0);
  });
});
