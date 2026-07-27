import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppNotification, CalendarEvent } from '../../types/core';
import { playZenChime } from '../../utils/audio';

export function useNotificationScheduler() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isCheckingRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !window.api?.notifications) return;
    try {
      const list = await window.api.notifications.getNotifications();
      setNotifications(list);
      setUnreadCount(list.filter((n: AppNotification) => !n.is_read).length);
    } catch (e) {
      console.error('Erro ao buscar notificações:', e);
    }
  }, []);

  const markRead = useCallback(async (id?: string) => {
    if (!window.api?.notifications) return;
    await window.api.notifications.markRead(id);
    await fetchNotifications();
  }, [fetchNotifications]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!window.api?.notifications) return;
    await window.api.notifications.deleteNotification(id);
    await fetchNotifications();
  }, [fetchNotifications]);

  const formatOffsetLabel = (minutes: number) => {
    if (minutes === 1440) return 'em 1 dia (24h)';
    if (minutes >= 60 && minutes % 60 === 0) return `em ${minutes / 60} hora(s)`;
    return `em ${minutes} minuto(s)`;
  };

  const formatTimeStr = (isoDateStr: string) => {
    try {
      const d = new Date(isoDateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoDateStr;
    }
  };

  const triggerDesktopNotification = (title: string, body: string) => {
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '🔔' });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, { body, icon: '🔔' });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Falha ao enviar notificação OS:', e);
    }
  };

  const checkReminders = useCallback(async () => {
    if (isCheckingRef.current || !window.api?.calendar || !window.api?.notifications) return;
    isCheckingRef.current = true;
    try {
      const events: CalendarEvent[] = await window.api.calendar.getEvents();
      const now = Date.now();

      for (const event of events) {
        if (event.status === 'completed' || !event.start_date) continue;
        const eventTime = new Date(event.start_date).getTime();
        if (isNaN(eventTime)) continue;

        // Se reminders for string JSON ou array
        let remArray: number[] = [];
        if (Array.isArray(event.reminders)) {
          remArray = event.reminders;
        } else if (typeof event.reminders === 'string') {
          try { remArray = JSON.parse(event.reminders); } catch { remArray = []; }
        }
        if (remArray.length === 0 && typeof event.reminder_minutes === 'number') {
          remArray = [event.reminder_minutes];
        }

        let notifiedArray: number[] = [];
        if (Array.isArray(event.notified_reminders)) {
          notifiedArray = event.notified_reminders;
        } else if (typeof event.notified_reminders === 'string') {
          try { notifiedArray = JSON.parse(event.notified_reminders); } catch { notifiedArray = []; }
        }

        let hasNewNotification = false;
        const newNotifiedArray = [...notifiedArray];

        for (const rem of remArray) {
          if (typeof rem !== 'number' || notifiedArray.includes(rem)) continue;

          const reminderTime = eventTime - rem * 60 * 1000;
          // Se o momento de lembrete já chegou e o evento ainda não aconteceu (ou faz menos de 24h)
          if (now >= reminderTime && now <= eventTime + 24 * 60 * 60 * 1000) {
            const offsetLabel = formatOffsetLabel(rem);
            const formattedDate = formatTimeStr(event.start_date);
            const title = '📅 Lembrete de Agenda';
            const message = `"${event.title}" começa ${offsetLabel} (${formattedDate})`;

            await window.api.notifications.addNotification({
              title,
              message,
              type: 'calendar_event',
              target_page_id: event.page_id || null,
              event_id: event.id,
              scheduled_for: event.start_date,
              is_read: false
            });

            triggerDesktopNotification(title, message);
            newNotifiedArray.push(rem);
            hasNewNotification = true;
          }
        }

        if (hasNewNotification) {
          playZenChime();
          await window.api.calendar.updateEvent(event.id, {
            ...event,
            notified_reminders: newNotifiedArray
          });
        }
      }

      await fetchNotifications();
    } catch (e) {
      console.error('Erro ao processar lembretes da agenda:', e);
    } finally {
      isCheckingRef.current = false;
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
    checkReminders();
    const interval = setInterval(() => {
      checkReminders();
    }, 60 * 1000); // Check a cada 1 minuto

    const handleFocusOrVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        checkReminders();
        fetchNotifications();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleFocusOrVisible);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisible);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleFocusOrVisible);
      }
    };
  }, [fetchNotifications, checkReminders]);

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markRead,
    deleteNotification
  };
}
