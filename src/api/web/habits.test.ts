import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webHabitsApi } from './habits';

describe('webHabitsApi (IndexedDB)', () => {
  let api: any;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('habits');
    await db.clear('habit_logs');
    api = webHabitsApi(db);
  });

  it('creates, retrieves, updates and soft-deletes habits', async () => {
    const created = await api.createHabit({
      title: 'Ler inglês',
      color: 'emerald',
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Ler inglês');
    expect(created.color).toBe('emerald');

    let habits = await api.getHabits();
    expect(habits).toHaveLength(1);
    expect(habits[0].title).toBe('Ler inglês');

    await api.updateHabit(created.id, { title: 'Ler inglês avançado' });
    const fetched = await api.getHabit(created.id);
    expect(fetched?.title).toBe('Ler inglês avançado');

    const deleted = await api.deleteHabit(created.id);
    expect(deleted).toBe(true);

    habits = await api.getHabits();
    expect(habits).toHaveLength(0);
  });

  it('toggles daily habit logs with idempotency', async () => {
    const habit = await api.createHabit({ title: 'Meditar' });

    // 1. Toggle ON for 2026-09-25
    const res1 = await api.toggleDayLog(habit.id, '2026-09-25');
    expect(res1.completed).toBe(true);
    expect(res1.log?.date).toBe('2026-09-25');

    let logs = await api.getLogs(habit.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].date).toBe('2026-09-25');

    // 2. Toggle OFF for 2026-09-25
    const res2 = await api.toggleDayLog(habit.id, '2026-09-25');
    expect(res2.completed).toBe(false);

    logs = await api.getLogs(habit.id);
    expect(logs).toHaveLength(0);
  });

  it('calculates habit stats correctly via getHabitWithStats', async () => {
    const habit = await api.createHabit({ title: 'Exercício' });

    await api.toggleDayLog(habit.id, '2026-09-20');
    await api.toggleDayLog(habit.id, '2026-09-21');
    await api.toggleDayLog(habit.id, '2026-09-22');

    const habitWithStats = await api.getHabitWithStats(habit.id);
    expect(habitWithStats).not.toBeNull();
    expect(habitWithStats?.habit.id).toBe(habit.id);
    expect(habitWithStats?.logs).toHaveLength(3);
    expect(habitWithStats?.stats.totalCompleted).toBe(3);
    expect(habitWithStats?.stats.bestStreak).toBe(3);
  });
});
