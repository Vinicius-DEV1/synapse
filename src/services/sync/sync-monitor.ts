export type FirebaseOpType = 'read' | 'write' | 'delete';

export interface SyncStats {
  date: string;
  reads: number;
  writes: number;
  deletes: number;
  bytesDownloaded?: number;
  bytesUploaded?: number;
  hourly?: Record<string, { reads: number; writes: number; deletes: number; bytesDownloaded?: number; bytesUploaded?: number }>;
}

export interface SyncEventLog {
  id: string;
  timestamp: string;
  type: 'push' | 'pull' | 'error' | 'info';
  message: string;
  bytes?: number;
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
      stats = { date: key, reads: 0, writes: 0, deletes: 0, hourly: {} };
    }
  } catch {
    stats = { date: key, reads: 0, writes: 0, deletes: 0, hourly: {} };
  }

  if (!stats.hourly) stats.hourly = {};
  const hour = new Date().getHours().toString();
  if (!stats.hourly[hour]) {
    stats.hourly[hour] = { reads: 0, writes: 0, deletes: 0 };
  }

  if (type === 'read') {
    stats.reads += count;
    stats.hourly[hour].reads += count;
  } else if (type === 'write') {
    stats.writes += count;
    stats.hourly[hour].writes += count;
  } else if (type === 'delete') {
    stats.deletes += count;
    stats.hourly[hour].deletes += count;
  }

  localStorage.setItem(key, JSON.stringify(stats));

  checkBurnRate(type, count);
}

export function logFirebaseTraffic(bytesDown: number, bytesUp: number): void {
  if (bytesDown <= 0 && bytesUp <= 0) return;
  const key = getTodayKey();
  let stats: SyncStats;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      stats = JSON.parse(raw);
    } else {
      stats = { date: key, reads: 0, writes: 0, deletes: 0, bytesDownloaded: 0, bytesUploaded: 0, hourly: {} };
    }
  } catch {
    stats = { date: key, reads: 0, writes: 0, deletes: 0, bytesDownloaded: 0, bytesUploaded: 0, hourly: {} };
  }

  if (!stats.bytesDownloaded) stats.bytesDownloaded = 0;
  if (!stats.bytesUploaded) stats.bytesUploaded = 0;
  
  if (!stats.hourly) stats.hourly = {};
  const hour = new Date().getHours().toString();
  if (!stats.hourly[hour]) {
    stats.hourly[hour] = { reads: 0, writes: 0, deletes: 0, bytesDownloaded: 0, bytesUploaded: 0 };
  }
  if (!stats.hourly[hour].bytesDownloaded) stats.hourly[hour].bytesDownloaded = 0;
  if (!stats.hourly[hour].bytesUploaded) stats.hourly[hour].bytesUploaded = 0;

  stats.bytesDownloaded += bytesDown;
  stats.bytesUploaded += bytesUp;
  stats.hourly[hour].bytesDownloaded! += bytesDown;
  stats.hourly[hour].bytesUploaded! += bytesUp;

  localStorage.setItem(key, JSON.stringify(stats));
}

export function logSyncEvent(type: SyncEventLog['type'], message: string, bytes?: number): void {
  try {
    const raw = localStorage.getItem('caderno_sync_events');
    let logs: SyncEventLog[] = raw ? JSON.parse(raw) : [];
    
    logs.unshift({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      message,
      bytes
    });

    // Limit to 50 items
    if (logs.length > 50) {
      logs = logs.slice(0, 50);
    }

    localStorage.setItem('caderno_sync_events', JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent('caderno-sync-events-updated'));
  } catch (err) {
    console.error('Failed to log sync event', err);
  }
}

export function getSyncEvents(): SyncEventLog[] {
  try {
    const raw = localStorage.getItem('caderno_sync_events');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
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

  // Aumento do limite para 2000 writes e 5000 reads para permitir sync de offline longo
  if (burnAccumulator.writes > 2000 || burnAccumulator.reads > 5000) {
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
  return { date: key, reads: 0, writes: 0, deletes: 0, hourly: {} };
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
        stats.push({ date: key, reads: 0, writes: 0, deletes: 0, hourly: {} });
      }
    } catch {
      stats.push({ date: key, reads: 0, writes: 0, deletes: 0, hourly: {} });
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
