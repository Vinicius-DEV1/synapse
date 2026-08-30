export const createStatsApi = (db: any, generateId: () => string) => ({
  startReadingSession: async (data: any) => {
    const session = { id: generateId(), ...data, started_at: new Date().toISOString() };
    await db.put('library_reading_sessions', session);
    return session;
  },
  endReadingSession: async (data: any) => {
    const existing = await db.get('library_reading_sessions', data.id);
    if (existing) {
      await db.put('library_reading_sessions', { ...existing, ...data, ended_at: new Date().toISOString() });
    }
    return true;
  },
  getReadingStats: async (): Promise<{ bookStats?: any; globalStats: any }> => {
    try {
      const books = (await db.getAll('library_books') || []).filter((b: any) => !b.deleted_at);
      const sessions = (await db.getAll('library_reading_sessions') || []).filter((s: any) => !s.deleted_at);

      const totalBooksStarted = books.filter((b: any) => b.reading_status === 'reading').length;
      const totalBooksFinished = books.filter((b: any) => b.reading_status === 'finished').length;

      let totalPagesRead = 0;
      let totalDurationSecs = 0;
      const uniqueDays = new Set<string>();

      for (const s of sessions) {
        if (s.pages_read) totalPagesRead += Number(s.pages_read) || 0;
        if (s.started_at && s.ended_at) {
          const start = new Date(s.started_at).getTime();
          const end = new Date(s.ended_at).getTime();
          const dur = (end - start) / 1000;
          if (dur > 0) {
            totalDurationSecs += Math.min(dur, 28800);
          }
        }
        if (s.started_at) {
          try {
            const day = new Date(s.started_at).toISOString().split('T')[0];
            uniqueDays.add(day);
          } catch {}
        }
      }

      const readingDays = Array.from(uniqueDays).sort();

      let longestStreak = 0;
      let currentStreak = 0;

      if (readingDays.length > 0) {
        let tempStreak = 0;
        let prevDate: Date | null = null;

        for (const dStr of readingDays) {
          const currDate = new Date(dStr + 'T00:00:00Z');
          if (prevDate) {
            const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              tempStreak += 1;
            } else if (diffDays > 1) {
              tempStreak = 1;
            }
          } else {
            tempStreak = 1;
          }
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          prevDate = currDate;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        const lastDay = readingDays[readingDays.length - 1];
        if (lastDay === todayStr || lastDay === yesterdayStr) {
          let cStreak = 1;
          for (let i = readingDays.length - 1; i > 0; i--) {
            const d1 = new Date(readingDays[i] + 'T00:00:00Z').getTime();
            const d0 = new Date(readingDays[i - 1] + 'T00:00:00Z').getTime();
            const diff = Math.round((d1 - d0) / (1000 * 60 * 60 * 24));
            if (diff === 1) cStreak += 1;
            else break;
          }
          currentStreak = cStreak;
        }
      }

      const totalTimeMinutes = Math.round(totalDurationSecs / 60);
      const highlights = (await db.getAll('library_highlights') || []).filter((h: any) => !h.deleted_at);
      const totalHighlights = highlights.length;

      return {
        globalStats: {
          totalBooksStarted,
          totalBooksFinished,
          totalTimeMinutes,
          totalPagesRead,
          totalHighlights,
          currentStreak,
          longestStreak,
          readingDays,
        }
      };
    } catch (err) {
      console.error('Failed to calculate web reading stats', err);
      return {
        globalStats: {
          totalBooksStarted: 0,
          totalBooksFinished: 0,
          totalTimeMinutes: 0,
          totalPagesRead: 0,
          totalHighlights: 0,
          currentStreak: 0,
          longestStreak: 0,
          readingDays: [],
        }
      };
    }
  }
});
