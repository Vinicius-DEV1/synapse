import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with fallback value when key does not exist in localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', 'initial_val'));
    expect(result.current[0]).toBe('initial_val');
  });

  it('initializes with parsed value when key already exists in localStorage', () => {
    localStorage.setItem('existing_key', JSON.stringify({ theme: 'dark' }));
    const { result } = renderHook(() => useLocalStorage('existing_key', { theme: 'light' }));
    expect(result.current[0]).toEqual({ theme: 'dark' });
  });

  it('updates state and persists to localStorage on setValue', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));

    act(() => {
      result.current[1](5);
    });

    expect(result.current[0]).toBe(5);
    expect(JSON.parse(localStorage.getItem('counter')!)).toBe(5);

    // Functional update
    act(() => {
      result.current[1]((prev: number) => prev + 10);
    });

    expect(result.current[0]).toBe(15);
    expect(JSON.parse(localStorage.getItem('counter')!)).toBe(15);
  });
});
