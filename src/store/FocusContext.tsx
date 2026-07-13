import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import type { Session, Alarm } from '../components/focus/types';
import type { LofiItem } from '../types_lofi';

type ViewState = 'dashboard' | 'setup' | 'timer' | 'cancel' | 'success' | 'settings' | 'alarms' | 'lofi';

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
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [currentSession, setCurrentSession] = useState<Partial<Session> | null>(null);
  const [resumeMinutes, setResumeMinutes] = useState<number | undefined>(undefined);
  const [triggeredAlarm, setTriggeredAlarm] = useState<Alarm | null>(null);
  const [showAlarmSetup, setShowAlarmSetup] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Lofi state
  const [lofis, setLofis] = useState<LofiItem[]>([]);
  const [activeLofi, setActiveLofi] = useState<LofiItem | null>(null);
  const [isPlayingLofi, setIsPlayingLofi] = useState(false);
  const [lofiVolume, setLofiVolume] = useState(() => {
    const saved = localStorage.getItem('lofi_volume');
    return saved ? parseFloat(saved) : 0.5;
  });

  const lastTriggeredTimeRef = useRef<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const timerFinishedRef = useRef<boolean>(false);

  const playAlarmSound = () => {
    if (localStorage.getItem('soundEnabled') === 'false') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.30);
      
      gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Failed to play alarm sound', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 4000);
  };

  const calculateTimeLeft = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    let alarmDate = new Date();
    alarmDate.setHours(hours, minutes, 0, 0);

    if (alarmDate.getTime() <= now.getTime()) {
      alarmDate.setDate(alarmDate.getDate() + 1);
    }

    const diffMins = Math.floor((alarmDate.getTime() - now.getTime()) / 60000);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    
    if (h === 0 && m === 0) return 'less than a minute';
    if (h === 0) return `${m} minute${m !== 1 ? 's' : ''}`;
    if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
    return `${h} hour${h !== 1 ? 's' : ''} and ${m} minute${m !== 1 ? 's' : ''}`;
  };

  const loadLofis = useCallback(async () => {
    if (window.api?.sync) {
      try {
        const rows = await window.api.sync.getTable('lofis');
        setLofis(rows || []);
      } catch (err) {
        console.error('Failed to load lofis', err);
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    if (window.api) {
      try {
        const data = await window.api.focus.getSessions();
        const formattedData = (data.sessions || data || []).map((s: any) => {
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
          setAlarms(alarmsData.alarms || alarmsData || []);
        }
        await loadLofis();
      } catch (err) {
        console.error('Failed to load data', err);
      }
    }
  }, [loadLofis]);

  // loadData is called by AppContent when authenticated

  // Alarms check
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (lastTriggeredTimeRef.current === timeStr) return;

      const activeAlarm = alarms.find(a => a.is_active && a.time_str === timeStr);
      if (activeAlarm) {
        lastTriggeredTimeRef.current = timeStr;
        setTriggeredAlarm(activeAlarm);
        playAlarmSound();
        if (activeAlarm.id) {
          handleToggleAlarm(activeAlarm.id, false); // Single-use: deactivate immediately
        }
      }
    }, 5000); // check every 5s for precision
    return () => clearInterval(interval);
  }, [alarms]);

  // Timer interval
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
            setView('success'); // Auto open success modal
          }
          return next;
        });
        lastTickRef.current += elapsedSeconds * 1000;
      }
    }, 500);

    return () => clearInterval(timer);
  }, [currentSession, isPaused]);

  // Tray icon manager
  useEffect(() => {
    const int = setInterval(() => {
      if (view === 'timer' && currentSession && !isPaused) {
        if (window.api?.setAppIcon) window.api.setAppIcon('normal');
      } else {
        if (window.api?.setAppIcon) window.api.setAppIcon('zzz');
      }
    }, 10000); // check every 10s
    return () => clearInterval(int);
  }, [view, currentSession, isPaused]);

  // Actions
  const handleStartSetup = () => setView('setup');
  
  const handleStartTimer = (tag: string, description: string, targetTime: number, explicitId?: string) => {
    const sessionId = explicitId || Date.now().toString();
    setCurrentSession({
      id: sessionId as any, // using string as temp ID
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

  const handleDeleteSession = async (id: number) => {
    if (window.api) {
      await window.api.focus.deleteSessions({ type: 'specific', id });
      loadData();
    }
  };

  const handleSaveAlarm = async (alarm: Alarm) => {
    if (window.api) {
      await window.api.focus.saveAlarm(alarm);
      setShowAlarmSetup(false);
      loadData();
      if (alarm.is_active) {
        showToast(`Alarm set for ${calculateTimeLeft(alarm.time_str)} from now`);
      }
    }
  };

  const handleToggleAlarm = async (id: number, isActive: boolean) => {
    if (window.api) {
      await window.api.focus.toggleAlarm(id, isActive);
      loadData();
      if (isActive) {
        const alarm = alarms.find(a => a.id === id);
        if (alarm) {
          showToast(`Alarm set for ${calculateTimeLeft(alarm.time_str)} from now`);
        }
      }
    }
  };

  const handleDeleteAlarm = async (id: number) => {
    if (window.api) {
      await window.api.focus.deleteAlarm(id);
      loadData();
    }
  };

  const handleTimerFinish = () => setView('success');
  const handleTimerCancel = () => setView('cancel');

  const handleSaveSuccess = async (summary: string) => {
    if (currentSession && window.api) {
      await window.api.focus.createSession({
        ...currentSession,
        status: 'completed',
        summary
      } as Session);
      window.dispatchEvent(new CustomEvent('caderno-focus-ended', { detail: { id: currentSession.id, status: 'completed' } }));
      setCurrentSession(null);
      loadData();
      setView('dashboard');
    }
  };

  const handleSaveCancel = async (justification: string) => {
    if (currentSession && window.api) {
      await window.api.focus.createSession({
        ...currentSession,
        status: 'cancelled',
        justification
      } as Session);
      window.dispatchEvent(new CustomEvent('caderno-focus-ended', { detail: { id: currentSession.id, status: 'cancelled' } }));
    }
    loadData();
    setView('dashboard');
    setCurrentSession(null);
  };

  const handleAbortSetup = () => setView('dashboard');

  useEffect(() => {
    localStorage.setItem('lofi_volume', lofiVolume.toString());
  }, [lofiVolume]);

  return (
    <FocusContext.Provider value={{
      view, setView, sessions, alarms, currentSession, setCurrentSession, resumeMinutes,
      triggeredAlarm, setTriggeredAlarm, showAlarmSetup, setShowAlarmSetup,
      toastMessage, timeLeft, isPaused, setIsPaused,
      lofis, activeLofi, isPlayingLofi, lofiVolume,
      setActiveLofi, setIsPlayingLofi, setLofiVolume, loadLofis,
      loadData, showToast, handleStartSetup, handleStartTimer,
      handleAddTimeFromSuccess, handleAddTotalTime, handleDeleteSession,
      handleSaveAlarm, handleToggleAlarm, handleDeleteAlarm,
      handleTimerFinish, handleTimerCancel, handleSaveSuccess, handleSaveCancel,
      handleAbortSetup, handleAddQuickTime
    }}>
      {children}
    </FocusContext.Provider>
  );
};
