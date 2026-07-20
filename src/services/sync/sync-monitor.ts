export type FirebaseOpType = 'read' | 'write' | 'delete';

export interface SyncStats {
  date: string;
  reads: number;
  writes: number;
  deletes: number;
}

function getTodayKey(): string {
  return `sync_stats_${new Date().toISOString().split('T')[0]}`;
}

export function logFirebaseOp(type: FirebaseOpType, count: number): void {
  if (count <= 0) return;
  const key = getTodayKey();
  let stats: SyncStats;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      stats = JSON.parse(raw);
    } else {
      stats = { date: key, reads: 0, writes: 0, deletes: 0 };
    }
  } catch {
    stats = { date: key, reads: 0, writes: 0, deletes: 0 };
  }

  if (type === 'read') stats.reads += count;
  else if (type === 'write') stats.writes += count;
  else if (type === 'delete') stats.deletes += count;

  localStorage.setItem(key, JSON.stringify(stats));

  checkBurnRate(type, count);
}

let burnAccumulator = {
  reads: 0,
  writes: 0,
  lastReset: Date.now()
};

function checkBurnRate(type: FirebaseOpType, count: number) {
  const now = Date.now();
  if (now - burnAccumulator.lastReset > 60000) {
    burnAccumulator = { reads: 0, writes: 0, lastReset: now };
  }
  if (type === 'read') burnAccumulator.reads += count;
  if (type === 'write') burnAccumulator.writes += count;

  // Se gastar mais de 500 escritas ou 2000 leituras em 1 minuto, pausar
  if (burnAccumulator.writes > 500 || burnAccumulator.reads > 2000) {
    console.error(`🚨 FIREBASE BURN RATE DETECTED! ${burnAccumulator.writes} writes, ${burnAccumulator.reads} reads in 1 min!`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('caderno-sync-error', { 
        detail: { message: `ALERTA: Foram detectadas muitas operações. Sincronismo bloqueado.`, code: 'burn-rate-detected' } 
      }));
    }
    localStorage.setItem('sync_emergency_stop', 'true');
    burnAccumulator = { reads: 0, writes: 0, lastReset: now };
  }
}

export function getTodayStats(): SyncStats {
  const key = getTodayKey();
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { date: key, reads: 0, writes: 0, deletes: 0 };
}

export function getWeeklyStats(): SyncStats[] {
  const stats: SyncStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `sync_stats_${d.toISOString().split('T')[0]}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        stats.push(JSON.parse(raw));
      } else {
        stats.push({ date: key, reads: 0, writes: 0, deletes: 0 });
      }
    } catch {
      stats.push({ date: key, reads: 0, writes: 0, deletes: 0 });
    }
  }
  return stats;
}

export function isEmergencyStopped(): boolean {
  return localStorage.getItem('sync_emergency_stop') === 'true';
}

export function clearEmergencyStop(): void {
  localStorage.removeItem('sync_emergency_stop');
}
