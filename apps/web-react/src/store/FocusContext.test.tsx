import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import {
  FocusProvider,
  useFocusContext,
  useFocusActions,
  useFocusLofi,
  useFocusOverlays,
  useFocusTimerTick,
} from './FocusContext';

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

  it('does not re-render useFocusLofi or useFocusOverlays on 1Hz timer ticks', () => {
    vi.useFakeTimers();
    let lofiRenders = 0;
    let overlayRenders = 0;
    let tickValue = 0;
    let startTimerFn: ((tag: string, desc: string, mins: number) => void) | null = null;

    function LofiObserver() {
      lofiRenders += 1;
      useFocusLofi();
      return null;
    }
    function OverlayObserver() {
      overlayRenders += 1;
      useFocusOverlays();
      return null;
    }
    function TickObserver() {
      tickValue = useFocusTimerTick();
      const { handleStartTimer } = useFocusActions();
      startTimerFn = handleStartTimer;
      return null;
    }

    render(
      <FocusProvider>
        <LofiObserver />
        <OverlayObserver />
        <TickObserver />
      </FocusProvider>
    );

    act(() => {
      startTimerFn?.('Deep Work', 'Test', 5);
    });

    const lofiAfterStart = lofiRenders;
    const overlayAfterStart = overlayRenders;
    const initialTick = tickValue;

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(tickValue).toBeLessThan(initialTick);
    expect(lofiRenders).toBe(lofiAfterStart);
    expect(overlayRenders).toBe(overlayAfterStart);
    vi.useRealTimers();
  });
});
