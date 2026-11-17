/**
 * @file legacy-migrator.ts
 * @description Copies the authenticated installation's local data into its private workspace.
 */

import { doc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { MODULE_TABLES } from '../sync/sync-utils';
import { pushAllToCloud } from '../sync/sync-push';
import { createWorkspace, listUserWorkspaces } from '../workspace/workspace-service';
import { getErrorMessage } from '../../utils/error';

export interface MigrationSummary {
  dryRun: boolean;
  sourceDocCount: number;
  migratedDocCount: number;
  tablesProcessed: string[];
  workspaceId: string;
  errors: string[];
}

/**
 * Copies local rows into the authenticated user's workspace without reading or copying shared legacy roots.
 */
export async function migrateLegacyUserToWorkspace(
  userId: string,
  userEmail: string,
  moduleKeys: Record<string, CryptoKey>,
  masterKey: CryptoKey,
  options: { dryRun?: boolean } = {}
): Promise<MigrationSummary> {
  const isDryRun = options.dryRun ?? false;
  const summary: MigrationSummary = {
    dryRun: isDryRun,
    sourceDocCount: 0,
    migratedDocCount: 0,
    tablesProcessed: [],
    workspaceId: '',
    errors: [],
  };

  try {
    if (!auth.currentUser || auth.currentUser.isAnonymous || auth.currentUser.uid !== userId) {
      throw new Error('The signed-in Firebase account does not match the migration target.');
    }
    if (!window.api?.sync) {
      throw new Error('Local sync API is unavailable; migration cannot read local data.');
    }

    const localTables = Object.values(MODULE_TABLES).flat();
    for (const table of localTables) {
      try {
        const rows = await window.api.sync.getTable<unknown>(table);
        if (!Array.isArray(rows)) throw new Error(`Local table ${table} returned an invalid row list.`);
        if (rows.length > 0) {
          summary.sourceDocCount += rows.length;
          summary.tablesProcessed.push(table);
        }
      } catch (tableError: unknown) {
        summary.errors.push(`Could not inspect local table ${table}: ${getErrorMessage(tableError)}`);
      }
    }
    if (summary.errors.length > 0) return summary;

    const existingWorkspaces = await listUserWorkspaces(userId);
    let personalWorkspace = existingWorkspaces.find((workspace) => workspace.isDefault);

    if (!personalWorkspace && !isDryRun) {
      const created = await createWorkspace(
        userId,
        userEmail,
        { name: 'Meu Espaço', icon: '🏠', type: 'personal' },
        masterKey
      );
      personalWorkspace = {
        workspaceId: created.workspace.id,
        name: created.workspace.name,
        icon: created.workspace.icon,
        role: 'owner',
        isDefault: true,
        joinedAt: created.workspace.createdAt,
      };
    }

    const targetWorkspaceId = personalWorkspace?.workspaceId || `ws_dryrun_${userId}`;
    summary.workspaceId = targetWorkspaceId;
    if (isDryRun) return summary;

    await pushAllToCloud(moduleKeys, undefined, targetWorkspaceId, userId);

    const profileBatch = writeBatch(db);
    profileBatch.set(
      doc(db, 'users', userId),
      {
        uid: userId,
        email: userEmail,
        defaultWorkspaceId: targetWorkspaceId,
        migrationV2: {
          status: 'completed',
          completedAt: new Date().toISOString(),
          sourceCount: summary.sourceDocCount,
          migratedCount: summary.sourceDocCount,
        },
      },
      { merge: true }
    );
    await profileBatch.commit();
    summary.migratedDocCount = summary.sourceDocCount;
  } catch (migrationError: unknown) {
    summary.errors.push(`Local-to-workspace migration failed: ${getErrorMessage(migrationError)}`);
  }

  return summary;
}
