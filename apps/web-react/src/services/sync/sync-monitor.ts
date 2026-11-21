export type FirebaseOpType = 'read' | 'write' | 'delete';

const SYNC_READ_BURN_LIMIT_PER_MINUTE = 10_000;
const SYNC_WRITE_BURN_LIMIT_PER_MINUTE = 8_000;
const SYNC_MONITOR_FLUSH_DEBOUNCE_MS = 1000;
const SYNC_EVENTS_STORAGE_KEY = 'caderno_sync_events';

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

// In-memory write-behind caches to eliminate synchronous JSON.parse/stringify
// and localStorage thrashing on every Firebase read/write/log during sync.
const statsMemoryCache = new Map<string, SyncStats>();
const dirtyStatsKeys = new Set<string>();
let eventsMemoryCache: SyncEventLog[] | null = null;
let eventsDirty = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let unloadListenersAttached = false;

function getTodayKey(): string {
  return `sync_stats_${new Date().toISOString().split('T')[0]}`;
}

function loadStatsForKey(key: string): SyncStats {
  const cached = statsMemoryCache.get(key);
  if (cached) return cached;

  let stats: SyncStats;
  try {
    const raw = localStorage.getItem(key);
    stats = raw ? JSON.parse(raw) : { date: key, reads: 0, writes: 0, deletes: 0, hourly: {} };
  } catch {
    stats = { date: key, reads: 0, writes: 0, deletes: 0, hourly: {} };
  }
  statsMemoryCache.set(key, stats);
  return stats;
}

function loadEvents(): SyncEventLog[] {
  if (eventsMemoryCache !== null) return eventsMemoryCache;
  try {
    const raw = localStorage.getItem(SYNC_EVENTS_STORAGE_KEY);
    eventsMemoryCache = raw ? JSON.parse(raw) : [];
  } catch (err: unknown) {
    console.debug('[sync-monitor] Failed to parse caderno_sync_events:', err);
    eventsMemoryCache = [];
  }
  return eventsMemoryCache!;
}

/** Flushes buffered sync telemetry/events to localStorage immediately. */
export function flushSyncMonitor(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  for (const key of dirtyStatsKeys) {
    const stats = statsMemoryCache.get(key);
    if (stats) {
      try {
        localStorage.setItem(key, JSON.stringify(stats));
      } catch (err) {
        console.debug('[sync-monitor] Failed to persist sync stats:', err);
      }
    }
  }
  dirtyStatsKeys.clear();

  if (eventsDirty && eventsMemoryCache !== null) {
    try {
      localStorage.setItem(SYNC_EVENTS_STORAGE_KEY, JSON.stringify(eventsMemoryCache));
    } catch (err) {
      console.debug('[sync-monitor] Failed to persist sync events:', err);
    }
    eventsDirty = false;
  }
}

function scheduleFlush(): void {
  if (typeof window !== 'undefined' && !unloadListenersAttached) {
    unloadListenersAttached = true;
    window.addEventListener('pagehide', flushSyncMonitor);
    window.addEventListener('beforeunload', flushSyncMonitor);
  }
  if (flushTimer !== null) return;
  flushTimer = setTimeout(flushSyncMonitor, SYNC_MONITOR_FLUSH_DEBOUNCE_MS);
}

export function logFirebaseOp(type: FirebaseOpType, count: number): void {
  if (count <= 0) return;
  const key = getTodayKey();
  const stats = loadStatsForKey(key);

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

  dirtyStatsKeys.add(key);
  scheduleFlush();

  checkBurnRate(type, count);
}

export function logFirebaseTraffic(bytesDown: number, bytesUp: number): void {
  if (bytesDown <= 0 && bytesUp <= 0) return;
  const key = getTodayKey();
  const stats = loadStatsForKey(key);

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

  dirtyStatsKeys.add(key);
  scheduleFlush();
}

export function logSyncEvent(type: SyncEventLog['type'], message: string, bytes?: number): void {
  try {
    const logs = loadEvents();

    logs.unshift({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      message,
      bytes,
    });

    // Limit to 50 items
    if (logs.length > 50) {
      logs.length = 50;
    }

    eventsDirty = true;
    scheduleFlush();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('caderno-sync-events-updated'));
    }
  } catch (err) {
    console.error('Failed to log sync event', err);
  }
}

export function getSyncEvents(): SyncEventLog[] {
  return [...loadEvents()];
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

  // A complete initial account sync may process the existing dataset in one minute.
  if (
    burnAccumulator.writes > SYNC_WRITE_BURN_LIMIT_PER_MINUTE
    || burnAccumulator.reads > SYNC_READ_BURN_LIMIT_PER_MINUTE
  ) {
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
  const stats = loadStatsForKey(key);
  return { ...stats, hourly: stats.hourly ? { ...stats.hourly } : {} };
}

export function getWeeklyStats(): SyncStats[] {
  const stats: SyncStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `sync_stats_${d.toISOString().split('T')[0]}`;
    const cached = statsMemoryCache.get(key);
    if (cached) {
      stats.push({ ...cached, hourly: cached.hourly ? { ...cached.hourly } : {} });
      continue;
    }
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
