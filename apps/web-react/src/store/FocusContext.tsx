import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Session, Alarm } from '../components/focus/types';
import type { LofiItem } from '../types';
import { useLofiAudio } from './focus/useLofiAudio';
import { useAlarmScheduler } from './focus/useAlarmScheduler';
import { useFocusTimer } from './focus/useFocusTimer';

type ViewState = 'dashboard' | 'setup' | 'timer' | 'cancel' | 'success' | 'settings' | 'alarms' | 'lofi' | 'stats';

export interface FocusStateContextType {
  view: ViewState;
  sessions: Session[];
  alarms: Alarm[];
  currentSession: Partial<Session> | null;
  resumeMinutes: number | undefined;
  triggeredAlarm: Alarm | null;
  showAlarmSetup: boolean;
  toastMessage: string | null;
  timeLeft: number;
  isPaused: boolean;
  lofis: LofiItem[];
  activeLofi: LofiItem | null;
  isPlayingLofi: boolean;
  lofiVolume: number;
}

export interface FocusActionsContextType {
  setView: (v: ViewState) => void;
  setCurrentSession: (s: Partial<Session> | null) => void;
  setTriggeredAlarm: (a: Alarm | null) => void;
  setShowAlarmSetup: (s: boolean) => void;
  setIsPaused: (p: boolean) => void;
  setActiveLofi: (lofi: LofiItem | null) => void;
  setIsPlayingLofi: (play: boolean) => void;
  setLofiVolume: (vol: number) => void;
  loadLofis: () => Promise<void>;
  loadData: () => Promise<void>;
  showToast: (msg: string) => void;
  handleStartSetup: () => void;
  handleStartTimer: (tag: string, description: string, targetTime: number, explicitId?: string) => string | void;
  handleAddTimeFromSuccess: (minutes: number) => void;
  handleAddTotalTime: (minutes: number) => void;
  handleDeleteSession: (id: number | string) => Promise<void>;
  handleSaveAlarm: (alarm: Alarm) => Promise<void>;
  handleToggleAlarm: (id: number | string, isActive: boolean) => Promise<void>;
  handleDeleteAlarm: (id: number | string) => Promise<void>;
  handleTimerFinish: () => void;
  handleTimerCancel: () => void;
  handleSaveSuccess: (summary: string) => Promise<void>;
  handleSaveCancel: (justification: string) => Promise<void>;
  handleAbortSetup: () => void;
  handleAddQuickTime: (mins: number) => void;
}

export type FocusContextType = FocusStateContextType & FocusActionsContextType;

export interface FocusLofiContextType {
  activeLofi: LofiItem | null;
  setActiveLofi: (lofi: LofiItem | null) => void;
  isPlayingLofi: boolean;
  setIsPlayingLofi: (play: boolean) => void;
  lofiVolume: number;
  setLofiVolume: (vol: number) => void;
}

export interface FocusOverlayContextType {
  triggeredAlarm: Alarm | null;
  setTriggeredAlarm: (a: Alarm | null) => void;
  view: ViewState;
  setView: (v: ViewState) => void;
  currentSession: Partial<Session> | null;
  setCurrentSession: (s: Partial<Session> | null) => void;
  handleSaveSuccess: (summary: string) => Promise<void>;
  handleAddTimeFromSuccess: (minutes: number) => void;
  handleSaveCancel: (justification: string) => Promise<void>;
}

const FocusStateContext = createContext<FocusStateContextType | null>(null);
const FocusActionsContext = createContext<FocusActionsContextType | null>(null);
const FocusContext = createContext<FocusContextType | null>(null);
const FocusLofiContext = createContext<FocusLofiContextType | null>(null);
const FocusOverlayContext = createContext<FocusOverlayContextType | null>(null);

const defaultFocusState: FocusStateContextType = {
  view: 'dashboard',
  sessions: [],
  alarms: [],
  currentSession: null,
  resumeMinutes: undefined,
  triggeredAlarm: null,
  showAlarmSetup: false,
  toastMessage: null,
  timeLeft: 0,
  isPaused: false,
  lofis: [],
  activeLofi: null,
  isPlayingLofi: false,
  lofiVolume: 0.5,
};

const defaultFocusActions: FocusActionsContextType = {
  setView: () => {},
  setCurrentSession: () => {},
  setTriggeredAlarm: () => {},
  setShowAlarmSetup: () => {},
  setIsPaused: () => {},
  setActiveLofi: () => {},
  setIsPlayingLofi: () => {},
  setLofiVolume: () => {},
  loadLofis: async () => {},
  loadData: async () => {},
  showToast: () => {},
  handleStartSetup: () => {},
  handleStartTimer: () => {},
  handleAddTimeFromSuccess: () => {},
  handleAddTotalTime: () => {},
  handleDeleteSession: async () => {},
  handleSaveAlarm: async () => {},
  handleToggleAlarm: async () => {},
  handleDeleteAlarm: async () => {},
  handleTimerFinish: () => {},
  handleTimerCancel: () => {},
  handleSaveSuccess: async () => {},
  handleSaveCancel: async () => {},
  handleAbortSetup: () => {},
  handleAddQuickTime: () => {},
};

const defaultFocusContext: FocusContextType = {
  ...defaultFocusState,
  ...defaultFocusActions,
};

export const useFocusState = (): FocusStateContextType => {
  const ctx = useContext(FocusStateContext);
  return ctx || defaultFocusState;
};

export const useFocusActions = (): FocusActionsContextType => {
  const ctx = useContext(FocusActionsContext);
  return ctx || defaultFocusActions;
};

export const useFocusContext = (): FocusContextType => {
  const ctx = useContext(FocusContext);
  return ctx || defaultFocusContext;
};

export const useFocusLofi = (): FocusLofiContextType => {
  const ctx = useContext(FocusLofiContext);
  const fallback = useContext(FocusContext);
  if (ctx) return ctx;
  const src = fallback || defaultFocusContext;
  return {
    activeLofi: src.activeLofi,
    setActiveLofi: src.setActiveLofi,
    isPlayingLofi: src.isPlayingLofi,
    setIsPlayingLofi: src.setIsPlayingLofi,
    lofiVolume: src.lofiVolume,
    setLofiVolume: src.setLofiVolume,
  };
};

export const useFocusOverlays = (): FocusOverlayContextType => {
  const ctx = useContext(FocusOverlayContext);
  const fallback = useContext(FocusContext);
  if (ctx) return ctx;
  const src = fallback || defaultFocusContext;
  return {
    triggeredAlarm: src.triggeredAlarm,
    setTriggeredAlarm: src.setTriggeredAlarm,
    view: src.view,
    setView: src.setView,
    currentSession: src.currentSession,
    setCurrentSession: src.setCurrentSession,
    handleSaveSuccess: src.handleSaveSuccess,
    handleAddTimeFromSuccess: src.handleAddTimeFromSuccess,
    handleSaveCancel: src.handleSaveCancel,
  };
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
        const formattedData: Session[] = (data || []).map((s: Session) => {
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

  const handleDeleteSession = useCallback(async (id: number | string) => {
    if (window.api?.focus) {
      await window.api.focus.deleteSessions({ type: 'specific', id });
      loadData();
    }
  }, [loadData]);

  const handleStartSetup = useCallback(() => setView('setup'), []);

  const stateValue = useMemo<FocusStateContextType>(() => ({
    view,
    sessions,
    alarms: alarmControls.alarms,
    currentSession: timerControls.currentSession,
    resumeMinutes: timerControls.resumeMinutes,
    triggeredAlarm: alarmControls.triggeredAlarm,
    showAlarmSetup: alarmControls.showAlarmSetup,
    toastMessage: alarmControls.toastMessage,
    timeLeft: timerControls.timeLeft,
    isPaused: timerControls.isPaused,
    lofis,
    activeLofi,
    isPlayingLofi,
    lofiVolume
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
    lofiVolume
  ]);

  const actionsValue = useMemo<FocusActionsContextType>(() => ({
    setView,
    setCurrentSession: timerControls.setCurrentSession,
    setTriggeredAlarm: alarmControls.setTriggeredAlarm,
    setShowAlarmSetup: alarmControls.setShowAlarmSetup,
    setIsPaused: timerControls.setIsPaused,
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
    timerControls.setCurrentSession,
    alarmControls.setTriggeredAlarm,
    alarmControls.setShowAlarmSetup,
    timerControls.setIsPaused,
    setActiveLofi,
    setIsPlayingLofi,
    setLofiVolume,
    loadLofis,
    loadData,
    alarmControls.showToast,
    handleStartSetup,
    timerControls.handleStartTimer,
    timerControls.handleAddTimeFromSuccess,
    timerControls.handleAddTotalTime,
    handleDeleteSession,
    alarmControls.handleSaveAlarm,
    alarmControls.handleToggleAlarm,
    alarmControls.handleDeleteAlarm,
    timerControls.handleTimerFinish,
    timerControls.handleTimerCancel,
    timerControls.handleSaveSuccess,
    timerControls.handleSaveCancel,
    timerControls.handleAbortSetup,
    timerControls.handleAddQuickTime
  ]);

  const lofiValue = useMemo<FocusLofiContextType>(() => ({
    activeLofi,
    setActiveLofi,
    isPlayingLofi,
    setIsPlayingLofi,
    lofiVolume,
    setLofiVolume,
  }), [activeLofi, setActiveLofi, isPlayingLofi, setIsPlayingLofi, lofiVolume, setLofiVolume]);

  const overlayValue = useMemo<FocusOverlayContextType>(() => ({
    triggeredAlarm: alarmControls.triggeredAlarm,
    setTriggeredAlarm: alarmControls.setTriggeredAlarm,
    view,
    setView,
    currentSession: timerControls.currentSession,
    setCurrentSession: timerControls.setCurrentSession,
    handleSaveSuccess: timerControls.handleSaveSuccess,
    handleAddTimeFromSuccess: timerControls.handleAddTimeFromSuccess,
    handleSaveCancel: timerControls.handleSaveCancel,
  }), [
    alarmControls.triggeredAlarm,
    alarmControls.setTriggeredAlarm,
    view,
    timerControls.currentSession,
    timerControls.setCurrentSession,
    timerControls.handleSaveSuccess,
    timerControls.handleAddTimeFromSuccess,
    timerControls.handleSaveCancel,
  ]);

  const combinedValue = useMemo<FocusContextType>(() => ({
    ...stateValue,
    ...actionsValue
  }), [stateValue, actionsValue]);

  return (
    <FocusActionsContext.Provider value={actionsValue}>
      <FocusLofiContext.Provider value={lofiValue}>
        <FocusOverlayContext.Provider value={overlayValue}>
          <FocusStateContext.Provider value={stateValue}>
            <FocusContext.Provider value={combinedValue}>
              {children}
            </FocusContext.Provider>
          </FocusStateContext.Provider>
        </FocusOverlayContext.Provider>
      </FocusLofiContext.Provider>
    </FocusActionsContext.Provider>
  );
};
