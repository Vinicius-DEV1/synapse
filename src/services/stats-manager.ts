import type { ActivityLog } from '../types';

const ACTIVITY_LOGS_TABLE = 'activity_logs';

const getLocalIsoDate = (d: Date = new Date()) => {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export async function logActivity(
  moduleName: 'lofi' | 'video' | 'library',
  itemId: string,
  itemTitle: string,
  durationSeconds: number
): Promise<void> {
  if (durationSeconds <= 0) return;
  
  if (!window.api?.sync) {
    console.warn("Sync API not available for logging activity");
    return;
  }

  const date = getLocalIsoDate();
  const id = `${moduleName}_${itemId}_${date}`;

  try {
    const allLogs = await window.api.sync.getTable(ACTIVITY_LOGS_TABLE);
    const existing = allLogs.find(l => l.id === id);

    const log: ActivityLog = {
      id,
      module: moduleName,
      item_id: itemId,
      item_title: itemTitle,
      date,
      duration_seconds: (existing?.duration_seconds || 0) + durationSeconds,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await window.api.sync.upsertRow(ACTIVITY_LOGS_TABLE, log);
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  if (!window.api?.sync) return [];
  try {
    return await window.api.sync.getTable(ACTIVITY_LOGS_TABLE);
  } catch (err) {
    console.error("Failed to get activity logs:", err);
    return [];
  }
}
