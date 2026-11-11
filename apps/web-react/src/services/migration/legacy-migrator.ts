/**
 * @file legacy-migrator.ts
 * @description Safe, idempotent, reversible migration service for transitioning
 * legacy single-user flat collections into isolated user profiles and collaborative workspaces.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import { MODULE_TABLES } from '../sync/sync-utils';
import { createWorkspace, listUserWorkspaces } from '../workspace/workspace-service';
import { getErrorMessage } from '../../utils/error';

const MIGRATION_BATCH_SIZE = 400;

export interface MigrationSummary {
  dryRun: boolean;
  sourceDocCount: number;
  migratedDocCount: number;
  tablesProcessed: string[];
  workspaceId: string;
  errors: string[];
}

/**
 * Creates an exportable JSON snapshot of all local database records for pre-migration safety.
 */
export async function createLocalBackupSnapshot(): Promise<Record<string, unknown[]>> {
  const snapshot: Record<string, unknown[]> = {};
  if (!window.api?.sync) {
    return snapshot;
  }

  const allTables = Object.values(MODULE_TABLES).flat();
  for (const table of allTables) {
    try {
      const rows = await window.api.sync.getTable(table);
      snapshot[table] = rows || [];
    } catch {
      snapshot[table] = [];
    }
  }

  return snapshot;
}

/**
 * Idempotently migrates all legacy flat collections to a personal workspace under the authenticated user.
 * Preserves legacy collections untouched for zero data loss and instantaneous rollback capability.
 */
export async function migrateLegacyUserToWorkspace(
  userId: string,
  userEmail: string,
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
    // 1. Locate or provision the user's default personal workspace
    const existingWorkspaces = await listUserWorkspaces(userId);
    let personalWs = existingWorkspaces.find((w) => w.isDefault);

    if (!personalWs && !isDryRun) {
      const created = await createWorkspace(
        userId,
        userEmail,
        { name: 'Meu Espaço', icon: '🏠', type: 'personal' },
        masterKey
      );
      personalWs = {
        workspaceId: created.workspace.id,
        name: created.workspace.name,
        icon: created.workspace.icon,
        role: 'owner',
        isDefault: true,
        joinedAt: created.workspace.createdAt,
      };
    }

    const targetWsId = personalWs?.workspaceId || `ws_dryrun_${userId}`;
    summary.workspaceId = targetWsId;

    // 2. Migrate User-Scoped Config (auth_validator, module_keys, security_lock)
    const configDocs = ['auth_validator', 'module_keys', 'security_lock'];
    for (const configName of configDocs) {
      try {
        const legacyRef = doc(db, 'config', configName);
        const legacySnap = await getDoc(legacyRef);

        if (legacySnap.exists()) {
          summary.sourceDocCount++;
          if (!isDryRun) {
            const userConfigRef = doc(db, 'users', userId, 'config', configName);
            const batch = writeBatch(db);
            batch.set(userConfigRef, legacySnap.data(), { merge: true });
            await batch.commit();
            summary.migratedDocCount++;
          }
        }
      } catch (configErr) {
        summary.errors.push(`Erro config/${configName}: ${getErrorMessage(configErr)}`);
      }
    }

    // 3. Migrate All Module Tables to Scoped Workspace Subcollections
    const allTables = Object.values(MODULE_TABLES).flat();
    for (const table of allTables) {
      try {
        const legacyColRef = collection(db, table);
        const legacySnap = await getDocs(legacyColRef);

        if (legacySnap.empty) continue;

        summary.tablesProcessed.push(table);
        const docs = legacySnap.docs;
        summary.sourceDocCount += docs.length;

        if (isDryRun) {
          summary.migratedDocCount += docs.length;
          continue;
        }

        // Commit in safe chunks of 400 documents
        for (let i = 0; i < docs.length; i += MIGRATION_BATCH_SIZE) {
          const chunk = docs.slice(i, i + MIGRATION_BATCH_SIZE);
          const batch = writeBatch(db);

          for (const d of chunk) {
            const targetDocRef = doc(db, 'workspaces', targetWsId, table, d.id);
            const data = d.data() as DocumentData;
            batch.set(
              targetDocRef,
              {
                ...data,
                workspaceId: targetWsId,
                migratedFromLegacy: true,
                migratedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }

          await batch.commit();
          summary.migratedDocCount += chunk.length;
        }
      } catch (tableErr) {
        summary.errors.push(`Erro na tabela ${table}: ${getErrorMessage(tableErr)}`);
      }
    }

    // 4. Mark migration receipt on user profile
    if (!isDryRun) {
      const userProfileRef = doc(db, 'users', userId);
      const batch = writeBatch(db);
      batch.set(
        userProfileRef,
        {
          uid: userId,
          email: userEmail,
          defaultWorkspaceId: targetWsId,
          migrationV2: {
            status: 'completed',
            completedAt: new Date().toISOString(),
            sourceCount: summary.sourceDocCount,
            migratedCount: summary.migratedDocCount,
          },
        },
        { merge: true }
      );
      await batch.commit();
    }
  } catch (globalErr) {
    summary.errors.push(`Falha global na migração: ${getErrorMessage(globalErr)}`);
  }

  return summary;
}
