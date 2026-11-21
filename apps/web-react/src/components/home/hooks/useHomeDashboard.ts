import { useState, useEffect, useCallback, useRef } from 'react';
import type { CalendarEvent } from '../../../types/core';
import { parseEventDate } from '../../../utils/date-utils';
import { useI18n } from '../../../i18n';

const FOCUS_REFRESH_COOLDOWN_MS = 10_000;

export function useHomeDashboard(isActive = true) {
  const { t } = useI18n();
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [tomorrowEvents, setTomorrowEvents] = useState<CalendarEvent[]>([]);
  const [dueCardsCount, setDueCardsCount] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const [greeting, setGreeting] = useState('');
  const lastFocusRefreshRef = useRef(0);

  const computeGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greetings.morning');
    if (hour < 18) return t('home.greetings.afternoon');
    return t('home.greetings.evening');
  }, [t]);

  const loadDashboardData = useCallback(async () => {
    try {
      if (window.api?.calendar) {
        const evs = await window.api.calendar.getEvents();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
        const tomorrowEnd = todayEnd + 24 * 60 * 60 * 1000;
        
        const today = evs.filter(e => {
          if (!e.start_date) return false;
          const time = parseEventDate(e.start_date).getTime();
          return time >= todayStart && time <= todayEnd;
        }).sort((a, b) => parseEventDate(a.start_date!).getTime() - parseEventDate(b.start_date!).getTime());
        setTodayEvents(today);

        const tomorrow = evs.filter(e => {
          if (!e.start_date) return false;
          const time = parseEventDate(e.start_date).getTime();
          return time > todayEnd && time <= tomorrowEnd;
        }).sort((a, b) => parseEventDate(a.start_date!).getTime() - parseEventDate(b.start_date!).getTime());
        setTomorrowEvents(tomorrow);
      }
      
      const ankiApi = window.api?.anki;
      if (ankiApi) {
        try {
          if (typeof ankiApi.getTotalDueCount === 'function') {
            const total = await ankiApi.getTotalDueCount();
            setDueCardsCount(total);
          } else {
            const decksRes = await ankiApi.getDecks();
            if (decksRes.success && decksRes.decks?.length) {
              const counts = await Promise.all(
                decksRes.decks.map(async (deck: { id: string }) => {
                  try {
                    const dueRes = await ankiApi.getDueCards(deck.id);
                    if (Array.isArray(dueRes)) {
                      return dueRes.length;
                    }
                    if (
                      dueRes &&
                      typeof dueRes === 'object' &&
                      'cards' in dueRes &&
                      Array.isArray((dueRes as { cards?: unknown[] }).cards)
                    ) {
                      return (dueRes as { cards: unknown[] }).cards.length;
                    }
                  } catch (err) {
                    console.warn('[HomeDashboard] Failed to fetch due cards for deck:', deck.id, err);
                    return 0;
                  }
                  return 0;
                })
              );
              const total = counts.reduce((acc: number, count: number) => acc + count, 0);
              setDueCardsCount(total);
            }
          }
        } catch (err) {
          console.warn('[HomeDashboard] Anki service not available:', err);
        }
      }
    } catch (e) {
      console.error('[HomeDashboard] Failed to load dashboard data:', e);
    }
  }, []);

  useEffect(() => {
    setGreeting(computeGreeting());
    if (!isActive) return;
    const id = setInterval(() => setGreeting(computeGreeting()), 60_000);
    return () => clearInterval(id);
  }, [computeGreeting, isActive]);

  useEffect(() => {
    if (!isActive) return;
    setNowTs(Date.now());
    const id = setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusRefreshRef.current < FOCUS_REFRESH_COOLDOWN_MS) return;
      lastFocusRefreshRef.current = now;
      setGreeting(computeGreeting());
      setNowTs(now);
      loadDashboardData();
    };
    const onVisibilityChange = () => {
      if (!document.hidden) {
        onFocus();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [computeGreeting, loadDashboardData, isActive]);

  useEffect(() => {
    if (!isActive) return;
    loadDashboardData();
    window.addEventListener('calendar-event-updated', loadDashboardData);
    return () => window.removeEventListener('calendar-event-updated', loadDashboardData);
  }, [loadDashboardData, isActive]);

  const isEventLive = useCallback((ev: CalendarEvent) => {
    if (ev.status === 'completed' || !ev.start_date) return false;
    const time = parseEventDate(ev.start_date).getTime();
    return nowTs >= time - 15 * 60 * 1000 && nowTs <= time + 60 * 60 * 1000;
  }, [nowTs]);

  return {
    greeting,
    todayEvents,
    tomorrowEvents,
    dueCardsCount,
    isEventLive,
    loadDashboardData
  };
}
