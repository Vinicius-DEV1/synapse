import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FocusProvider, useFocusContext, useFocusActions } from './FocusContext';

describe('FocusContext (store/FocusContext)', () => {
  beforeEach(() => {
    (window as any).api = {
      focus: {
        getSessions: vi.fn().mockResolvedValue([]),
        getAlarms: vi.fn().mockResolvedValue([]),
        deleteSessions: vi.fn().mockResolvedValue(undefined),
        saveAlarm: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FocusProvider>{children}</FocusProvider>
  );

  it('initializes with default dashboard view and empty sessions', () => {
    const { result } = renderHook(() => useFocusContext(), { wrapper });
    expect(result.current.view).toBe('dashboard');
    expect(result.current.sessions).toEqual([]);
    expect(result.current.isPaused).toBe(false);
  });

  it('changes view to setup when handleStartSetup is called', () => {
    const { result } = renderHook(() => useFocusContext(), { wrapper });

    act(() => {
      result.current.handleStartSetup();
    });

    expect(result.current.view).toBe('setup');
  });

  it('starts timer and sets view to timer', () => {
    const { result } = renderHook(() => useFocusContext(), { wrapper });

    act(() => {
      result.current.handleStartTimer('Deep Work', 'Coding tests', 25);
    });

    expect(result.current.view).toBe('timer');
    expect(result.current.timeLeft).toBe(25 * 60);
    expect(result.current.currentSession?.tag).toBe('Deep Work');
    expect(result.current.currentSession?.description).toBe('Coding tests');
  });

  it('pauses and resumes timer', () => {
    const { result } = renderHook(() => useFocusContext(), { wrapper });

    act(() => {
      result.current.handleStartTimer('Study', 'Reading', 10);
    });

    act(() => {
      result.current.setIsPaused(true);
    });

    expect(result.current.isPaused).toBe(true);

    act(() => {
      result.current.setIsPaused(false);
    });

    expect(result.current.isPaused).toBe(false);
  });

  it('cancels timer and switches view to cancel', () => {
    const { result } = renderHook(() => useFocusContext(), { wrapper });

    act(() => {
      result.current.handleStartTimer('Study', 'Math', 15);
    });

    act(() => {
      result.current.handleTimerCancel();
    });

    expect(result.current.view).toBe('cancel');
  });

  it('provides stable actions via useFocusActions without throwing', () => {
    const { result } = renderHook(() => useFocusActions(), { wrapper });
    expect(typeof result.current.handleStartTimer).toBe('function');
    expect(typeof result.current.loadData).toBe('function');
    expect(typeof result.current.handleSaveAlarm).toBe('function');
  });
});
