import { parseDateSafe, type SyncRow } from './sync-utils';

export interface InitialSyncPushTablePlan {
  rowIds: ReadonlySet<string>;
  checkpoint: number;
}

export type InitialSyncPushPlan = ReadonlyMap<string, InitialSyncPushTablePlan>;

interface MutableTablePlan {
  cloudTimes: Map<string, number>;
  pushIds: Set<string>;
  checkpoint: number;
}

function getRowSyncTime(row: SyncRow): number {
  return Math.max(
    parseDateSafe(row.updated_at || row.created_at || 0),
    parseDateSafe(row.deleted_at || 0),
  );
}

export class InitialSyncPushPlanBuilder {
  private readonly tablePlans = new Map<string, MutableTablePlan>();

  private table(table: string): MutableTablePlan {
    let plan = this.tablePlans.get(table);
    if (!plan) {
      plan = { cloudTimes: new Map(), pushIds: new Set(), checkpoint: 0 };
      this.tablePlans.set(table, plan);
    }
    return plan;
  }

  addCloudRows(table: string, rows: readonly { id: string; syncTime: number }[]): void {
    const plan = this.table(table);
    for (const row of rows) {
      plan.cloudTimes.set(row.id, Math.max(plan.cloudTimes.get(row.id) || 0, row.syncTime));
    }
  }

  addPushCandidates(table: string, ids: readonly string[]): void {
    const plan = this.table(table);
    for (const id of ids) plan.pushIds.add(id);
  }

  completeTable(
    table: string,
    localRows: readonly SyncRow[],
    cloudCheckpoint: number,
  ): void {
    const plan = this.table(table);
    let checkpoint = cloudCheckpoint;
    for (const row of localRows) {
      const localTime = getRowSyncTime(row);
      checkpoint = Math.max(checkpoint, localTime);
      const cloudTime = plan.cloudTimes.get(row.id);
      if (cloudTime === undefined || localTime > cloudTime) plan.pushIds.add(row.id);
    }
    plan.checkpoint = checkpoint;
  }

  build(): InitialSyncPushPlan {
    return new Map([...this.tablePlans].map(([table, plan]) => [table, {
      rowIds: new Set(plan.pushIds),
      checkpoint: plan.checkpoint,
    }]));
  }
}

export function selectInitialSyncPushRows(
  rows: readonly SyncRow[],
  plan: InitialSyncPushTablePlan,
): SyncRow[] {
  return rows.filter((row) => plan.rowIds.has(row.id));
}
