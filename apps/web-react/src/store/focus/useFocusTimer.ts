import { useState, useEffect, useRef, useCallback } from 'react';
import type { Session } from '../../components/focus/types';
import { playAlarmSound } from './focus-sound';

type ViewState = 'dashboard' | 'setup' | 'timer' | 'cancel' | 'success' | 'settings' | 'alarms' | 'lofi' | 'stats';

export function useFocusTimer(
  view: ViewState,
  setView: (v: ViewState) => void,
  onReloadData: () => Promise<void>
) {
  const [currentSession, setCurrentSession] = useState<Partial<Session> | null>(null);
  const [resumeMinutes, setResumeMinutes] = useState<number | undefined>(undefined);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const lastTickRef = useRef<number>(Date.now());
  const timerFinishedRef = useRef<boolean>(false);

  // Timer interval with drift compensation and wake/visibility sync
  useEffect(() => {
    lastTickRef.current = Date.now();
    
    if (!currentSession || isPaused || timerFinishedRef.current) return;

    const tick = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastTickRef.current) / 1000);
      
      if (elapsedSeconds > 0) {
        setTimeLeft(prev => {
          const next = Math.max(0, prev - elapsedSeconds);
          if (next <= 0 && !timerFinishedRef.current) {
            timerFinishedRef.current = true;
            playAlarmSound();
            setView('success');
          }
          return next;
        });
        lastTickRef.current += elapsedSeconds * 1000;
      }
    };

    const timer = setInterval(tick, 500);

    const onWakeOrFocus = () => {
      tick();
    };

    window.addEventListener('focus', onWakeOrFocus);
    document.addEventListener('visibilitychange', onWakeOrFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onWakeOrFocus);
      document.removeEventListener('visibilitychange', onWakeOrFocus);
    };
  }, [currentSession, isPaused, setView]);

  // Tray icon manager: reactively update icon on state transition without 10s polling
  const isTimerActive = view === 'timer' && Boolean(currentSession) && !isPaused;
  useEffect(() => {
    const focusApi = window.api?.focus;
    if (!focusApi?.setAppIcon) return;
    focusApi.setAppIcon(isTimerActive ? 'normal' : 'zzz');
  }, [isTimerActive]);

  const currentSessionRef = useRef(currentSession);
  currentSessionRef.current = currentSession;

  const handleStartTimer = useCallback((tag: string, description: string, targetTime: number, explicitId?: string) => {
    const sessionId = explicitId || Date.now().toString();
    setCurrentSession({
      id: sessionId,
      tag,
      description,
      target_time_minutes: targetTime,
      status: 'completed'
    });
    setResumeMinutes(undefined);
    setTimeLeft(targetTime * 60);
    setIsPaused(false);
    timerFinishedRef.current = false;
    setView('timer');
    return sessionId;
  }, [setView]);

  const handleAddTimeFromSuccess = useCallback((minutes: number) => {
    const curr = currentSessionRef.current;
    if (curr) {
      setCurrentSession({
        ...curr,
        target_time_minutes: (curr.target_time_minutes || 0) + minutes
      });
      setResumeMinutes(minutes);
      setTimeLeft(minutes * 60);
      setIsPaused(false);
      timerFinishedRef.current = false;
      setView('timer');
    }
  }, [setView]);

  const handleAddTotalTime = useCallback((minutes: number) => {
    setCurrentSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        target_time_minutes: (prev.target_time_minutes || 0) + minutes
      };
    });
  }, []);

  const handleAddQuickTime = useCallback((mins: number) => {
    setTimeLeft(prev => prev + mins * 60);
    handleAddTotalTime(mins);
    if (timerFinishedRef.current) {
      timerFinishedRef.current = false;
      setView('timer');
    }
  }, [handleAddTotalTime, setView]);

  const handleTimerFinish = useCallback(() => setView('success'), [setView]);
  const handleTimerCancel = useCallback(() => setView('cancel'), [setView]);
  const handleAbortSetup = useCallback(() => setView('dashboard'), [setView]);

  const handleSaveSuccess = useCallback(async (summary: string) => {
    const curr = currentSessionRef.current;
    if (curr && window.api?.focus) {
      await window.api.focus.createSession({
        ...curr,
        status: 'completed',
        summary
      } as Session);
      window.dispatchEvent(new CustomEvent('caderno-focus-ended', { detail: { id: curr.id, status: 'completed' } }));
      setCurrentSession(null);
      await onReloadData();
      setView('dashboard');
    }
  }, [onReloadData, setView]);

  const handleSaveCancel = useCallback(async (justification: string) => {
    const curr = currentSessionRef.current;
    if (curr && window.api?.focus) {
      await window.api.focus.createSession({
        ...curr,
        status: 'cancelled',
        justification
      } as Session);
      window.dispatchEvent(new CustomEvent('caderno-focus-ended', { detail: { id: curr.id, status: 'cancelled' } }));
    }
    await onReloadData();
    setView('dashboard');
    setCurrentSession(null);
  }, [onReloadData, setView]);

  return {
    currentSession,
    setCurrentSession,
    resumeMinutes,
    timeLeft,
    setTimeLeft,
    isPaused,
    setIsPaused,
    handleStartTimer,
    handleAddTimeFromSuccess,
    handleAddTotalTime,
    handleAddQuickTime,
    handleTimerFinish,
    handleTimerCancel,
    handleSaveSuccess,
    handleSaveCancel,
    handleAbortSetup
  };
}
