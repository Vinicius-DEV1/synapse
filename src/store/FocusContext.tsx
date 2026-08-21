import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Session, Alarm } from '../components/focus/types';
import type { LofiItem } from '../types';
import { useLofiAudio } from './focus/useLofiAudio';
import { useAlarmScheduler } from './focus/useAlarmScheduler';
import { useFocusTimer } from './focus/useFocusTimer';

type ViewState = 'dashboard' | 'setup' | 'timer' | 'cancel' | 'success' | 'settings' | 'alarms' | 'lofi' | 'stats';

interface FocusContextType {
  view: ViewState;
  setView: (v: ViewState) => void;
  sessions: Session[];
  alarms: Alarm[];
  currentSession: Partial<Session> | null;
  setCurrentSession: (s: Partial<Session> | null) => void;
  resumeMinutes: number | undefined;
  triggeredAlarm: Alarm | null;
  setTriggeredAlarm: (a: Alarm | null) => void;
  showAlarmSetup: boolean;
  setShowAlarmSetup: (s: boolean) => void;
  toastMessage: string | null;
  
  // Timer State
  timeLeft: number;
  isPaused: boolean;
  setIsPaused: (p: boolean) => void;

  // Lofi State
  lofis: LofiItem[];
  activeLofi: LofiItem | null;
  isPlayingLofi: boolean;
  lofiVolume: number;
  setActiveLofi: (lofi: LofiItem | null) => void;
  setIsPlayingLofi: (play: boolean) => void;
  setLofiVolume: (vol: number) => void;
  loadLofis: () => Promise<void>;
  
  // Actions
  loadData: () => Promise<void>;
  showToast: (msg: string) => void;
  handleStartSetup: () => void;
  handleStartTimer: (tag: string, description: string, targetTime: number, explicitId?: string) => string | void;
  handleAddTimeFromSuccess: (minutes: number) => void;
  handleAddTotalTime: (minutes: number) => void;
  handleDeleteSession: (id: number) => Promise<void>;
  handleSaveAlarm: (alarm: Alarm) => Promise<void>;
  handleToggleAlarm: (id: number, isActive: boolean) => Promise<void>;
  handleDeleteAlarm: (id: number) => Promise<void>;
  handleTimerFinish: () => void;
  handleTimerCancel: () => void;
  handleSaveSuccess: (summary: string) => Promise<void>;
  handleSaveCancel: (justification: string) => Promise<void>;
  handleAbortSetup: () => void;
  handleAddQuickTime: (mins: number) => void;
}

const FocusContext = createContext<FocusContextType | null>(null);

export const useFocusContext = () => {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocusContext must be used within FocusProvider');
  return ctx;
};

export const FocusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [sessions, setSessions] = useState<Session[]>([]);

  const {
    lofis,
    activeLofi,
    setActiveLofi,
    isPlayingLofi,
    setIsPlayingLofi,
    lofiVolume,
    setLofiVolume,
    loadLofis
  } = useLofiAudio();

  const loadData = useCallback(async () => {
    if (window.api?.focus) {
      try {
        const data = await window.api.focus.getSessions();
        const formattedData = (data || []).map((s: any) => {
          let iso = s.created_at;
          if (iso && !iso.includes('T')) {
            iso = iso.replace(' ', 'T') + 'Z';
          }
          return {
            ...s,
            created_at: iso ? new Date(iso).toISOString() : undefined
          };
        });
        setSessions(formattedData);
        if (window.api.focus.getAlarms) {
          const alarmsData = await window.api.focus.getAlarms();
          alarmControls.setAlarms(alarmsData || []);
        }
        await loadLofis();
      } catch (err) {
        console.error('Failed to load data', err);
      }
    }
  }, [loadLofis]);

  const alarmControls = useAlarmScheduler(loadData);

  const timerControls = useFocusTimer(view, setView, loadData);

  useEffect(() => {
    const handleSyncComplete = () => {
      loadLofis();
      loadData();
    };
    window.addEventListener('caderno-sync-complete', handleSyncComplete);
    return () => window.removeEventListener('caderno-sync-complete', handleSyncComplete);
  }, [loadLofis, loadData]);

  const handleDeleteSession = async (id: number) => {
    if (window.api?.focus) {
      await window.api.focus.deleteSessions({ type: 'specific', id });
      loadData();
    }
  };

  const handleStartSetup = () => setView('setup');

  const contextValue = useMemo(() => ({
    view,
    setView,
    sessions,
    alarms: alarmControls.alarms,
    currentSession: timerControls.currentSession,
    setCurrentSession: timerControls.setCurrentSession,
    resumeMinutes: timerControls.resumeMinutes,
    triggeredAlarm: alarmControls.triggeredAlarm,
    setTriggeredAlarm: alarmControls.setTriggeredAlarm,
    showAlarmSetup: alarmControls.showAlarmSetup,
    setShowAlarmSetup: alarmControls.setShowAlarmSetup,
    toastMessage: alarmControls.toastMessage,
    timeLeft: timerControls.timeLeft,
    isPaused: timerControls.isPaused,
    setIsPaused: timerControls.setIsPaused,
    lofis,
    activeLofi,
    isPlayingLofi,
    lofiVolume,
    setActiveLofi,
    setIsPlayingLofi,
    setLofiVolume,
    loadLofis,
    loadData,
    showToast: alarmControls.showToast,
    handleStartSetup,
    handleStartTimer: timerControls.handleStartTimer,
    handleAddTimeFromSuccess: timerControls.handleAddTimeFromSuccess,
    handleAddTotalTime: timerControls.handleAddTotalTime,
    handleDeleteSession,
    handleSaveAlarm: alarmControls.handleSaveAlarm,
    handleToggleAlarm: alarmControls.handleToggleAlarm,
    handleDeleteAlarm: alarmControls.handleDeleteAlarm,
    handleTimerFinish: timerControls.handleTimerFinish,
    handleTimerCancel: timerControls.handleTimerCancel,
    handleSaveSuccess: timerControls.handleSaveSuccess,
    handleSaveCancel: timerControls.handleSaveCancel,
    handleAbortSetup: timerControls.handleAbortSetup,
    handleAddQuickTime: timerControls.handleAddQuickTime
  }), [
    view,
    sessions,
    alarmControls.alarms,
    timerControls.currentSession,
    timerControls.resumeMinutes,
    alarmControls.triggeredAlarm,
    alarmControls.showAlarmSetup,
    alarmControls.toastMessage,
    timerControls.timeLeft,
    timerControls.isPaused,
    lofis,
    activeLofi,
    isPlayingLofi,
    lofiVolume,
    loadLofis,
    loadData,
    alarmControls.showToast,
    timerControls.handleStartTimer,
    timerControls.handleAddTimeFromSuccess,
    timerControls.handleAddTotalTime,
    alarmControls.handleSaveAlarm,
    alarmControls.handleToggleAlarm,
    alarmControls.handleDeleteAlarm,
    timerControls.handleTimerFinish,
    timerControls.handleTimerCancel,
    timerControls.handleSaveSuccess,
    timerControls.handleSaveCancel,
    timerControls.handleAbortSetup,
    timerControls.handleAddQuickTime,
    alarmControls.setShowAlarmSetup,
    alarmControls.setTriggeredAlarm,
    timerControls.setIsPaused,
    timerControls.setCurrentSession,
    setActiveLofi,
    setIsPlayingLofi,
    setLofiVolume
  ]);

  return (
    <FocusContext.Provider value={contextValue}>
      {children}
    </FocusContext.Provider>
  );
};
