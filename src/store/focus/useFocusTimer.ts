import { useState, useEffect, useRef } from 'react';
import type { Session } from '../../components/focus/types';
import { playAlarmSound } from './focus-sound';

type ViewState = 'dashboard' | 'setup' | 'timer' | 'cancel' | 'success' | 'settings' | 'alarms' | 'lofi' | 'stats';

// `setAppIcon` é implementado dentro de `window.api.focus` (ver
// src/api/web/focus.ts e src/api/tauri/focus.ts), embora o tipo
// `ICadernoAPI['focus']` (src/api/types.ts) ainda não declare esse campo.
type FocusApiWithIcon = NonNullable<NonNullable<typeof window.api>['focus']> & {
  setAppIcon?: (type: 'normal' | 'zzz') => Promise<void>;
};

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

  // Timer interval with drift compensation
  useEffect(() => {
    lastTickRef.current = Date.now();
    
    if (!currentSession || isPaused || timerFinishedRef.current) return;

    const timer = setInterval(() => {
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
    }, 500);

    return () => clearInterval(timer);
  }, [currentSession, isPaused, setView]);

  // Tray icon manager
  useEffect(() => {
    const int = setInterval(() => {
      const focusApi = window.api?.focus as FocusApiWithIcon | undefined;
      if (view === 'timer' && currentSession && !isPaused) {
        if (focusApi?.setAppIcon) focusApi.setAppIcon('normal');
      } else {
        if (focusApi?.setAppIcon) focusApi.setAppIcon('zzz');
      }
    }, 10000);
    return () => clearInterval(int);
  }, [view, currentSession, isPaused]);

  const handleStartTimer = (tag: string, description: string, targetTime: number, explicitId?: string) => {
    const sessionId = explicitId || Date.now().toString();
    setCurrentSession({
      id: sessionId as any,
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
  };

  const handleAddTimeFromSuccess = (minutes: number) => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        target_time_minutes: (currentSession.target_time_minutes || 0) + minutes
      });
      setResumeMinutes(minutes);
      setTimeLeft(minutes * 60);
      setIsPaused(false);
      timerFinishedRef.current = false;
      setView('timer');
    }
  };

  const handleAddTotalTime = (minutes: number) => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        target_time_minutes: (currentSession.target_time_minutes || 0) + minutes
      });
    }
  };

  const handleAddQuickTime = (mins: number) => {
    setTimeLeft(prev => prev + mins * 60);
    handleAddTotalTime(mins);
    if (timerFinishedRef.current) {
      timerFinishedRef.current = false;
      setView('timer');
    }
  };

  const handleTimerFinish = () => setView('success');
  const handleTimerCancel = () => setView('cancel');
  const handleAbortSetup = () => setView('dashboard');

  const handleSaveSuccess = async (summary: string) => {
    if (currentSession && window.api?.focus) {
      await window.api.focus.createSession({
        ...currentSession,
        status: 'completed',
        summary
      } as Session);
      window.dispatchEvent(new CustomEvent('caderno-focus-ended', { detail: { id: currentSession.id, status: 'completed' } }));
      setCurrentSession(null);
      await onReloadData();
      setView('dashboard');
    }
  };

  const handleSaveCancel = async (justification: string) => {
    if (currentSession && window.api?.focus) {
      await window.api.focus.createSession({
        ...currentSession,
        status: 'cancelled',
        justification
      } as Session);
      window.dispatchEvent(new CustomEvent('caderno-focus-ended', { detail: { id: currentSession.id, status: 'cancelled' } }));
    }
    await onReloadData();
    setView('dashboard');
    setCurrentSession(null);
  };

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
