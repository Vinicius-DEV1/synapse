import { useState, useEffect, useCallback } from 'react';
import type { CalendarEvent } from '../../../types/core';
import { parseEventDate } from '../../../utils/date-utils';

export function useHomeDashboard() {
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [tomorrowEvents, setTomorrowEvents] = useState<CalendarEvent[]>([]);
  const [dueCardsCount, setDueCardsCount] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const [greeting, setGreeting] = useState('');

  const computeGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

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
              const total = counts.reduce((acc, count) => acc + count, 0);
              setDueCardsCount(total);
            }
          }
        } catch (err) {
          // Anki module not available or failed to load decks
          console.warn('[HomeDashboard] Anki service not available:', err);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados do dashboard:', e);
    }
  }, []);

  useEffect(() => {
    setGreeting(computeGreeting());
    const id = setInterval(() => setGreeting(computeGreeting()), 60_000);
    return () => clearInterval(id);
  }, [computeGreeting]);

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onFocus = () => {
      setGreeting(computeGreeting());
      setNowTs(Date.now());
      loadDashboardData();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) onFocus();
    });
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [computeGreeting, loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
    window.addEventListener('calendar-event-updated', loadDashboardData);
    return () => window.removeEventListener('calendar-event-updated', loadDashboardData);
  }, [loadDashboardData]);

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
