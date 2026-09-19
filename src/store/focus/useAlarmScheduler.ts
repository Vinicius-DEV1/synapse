import { useState, useEffect, useRef, useCallback } from 'react';
import type { Alarm } from '../../components/focus/types';
import { playAlarmSound } from './focus-sound';

export function useAlarmScheduler(onReloadData: () => Promise<void>) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [triggeredAlarm, setTriggeredAlarm] = useState<Alarm | null>(null);
  const [showAlarmSetup, setShowAlarmSetup] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const lastTriggeredTimeRef = useRef<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 4000);
  }, []);

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

  const handleToggleAlarm = useCallback(async (id: number, isActive: boolean) => {
    if (window.api?.focus) {
      await window.api.focus.updateAlarm(id, { is_active: isActive });
      await onReloadData();
      if (isActive) {
        const alarm = alarms.find(a => a.id === id);
        if (alarm) {
          showToast(`Alarm set for ${calculateTimeLeft(alarm.time_str)} from now`);
        }
      }
    }
  }, [alarms, onReloadData, showToast]);

  // Alarms check every 5s
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
          handleToggleAlarm(activeAlarm.id, false);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [alarms, handleToggleAlarm]);

  const handleSaveAlarm = useCallback(async (alarm: Alarm) => {
    if (window.api?.focus) {
      await window.api.focus.createAlarm(alarm);
      setShowAlarmSetup(false);
      await onReloadData();
      if (alarm.is_active) {
        showToast(`Alarm set for ${calculateTimeLeft(alarm.time_str)} from now`);
      }
    }
  }, [onReloadData, showToast]);

  const handleDeleteAlarm = useCallback(async (id: number) => {
    if (window.api?.focus) {
      await window.api.focus.deleteAlarm(id);
      await onReloadData();
    }
  }, [onReloadData]);

  return {
    alarms,
    setAlarms,
    triggeredAlarm,
    setTriggeredAlarm,
    showAlarmSetup,
    setShowAlarmSetup,
    toastMessage,
    showToast,
    handleSaveAlarm,
    handleToggleAlarm,
    handleDeleteAlarm
  };
}
