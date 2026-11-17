import { collection, doc, type CollectionReference, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { db } from '../firebase';

export interface SyncCloudScope {
  workspaceId?: string;
  userId?: string;
}

function getUserId(scope: SyncCloudScope): string {
  if (scope.userId) return scope.userId;
  throw new Error('Cloud sync requires an authenticated user or workspace scope.');
}

export function getSyncCollection(
  table: string,
  scope: SyncCloudScope
): CollectionReference<DocumentData> {
  if (scope.workspaceId) return collection(db, 'workspaces', scope.workspaceId, table);
  return collection(db, 'users', getUserId(scope), 'sync', 'data', table);
}

export function getSyncDocument(
  table: string,
  documentId: string,
  scope: SyncCloudScope
): DocumentReference<DocumentData> {
  if (scope.workspaceId) return doc(db, 'workspaces', scope.workspaceId, table, documentId);
  return doc(db, 'users', getUserId(scope), 'sync', 'data', table, documentId);
}

export function getSyncConfigDocument(
  configName: string,
  scope: SyncCloudScope
): DocumentReference<DocumentData> {
  if (scope.workspaceId) return doc(db, 'workspaces', scope.workspaceId, 'config', configName);
  return doc(db, 'users', getUserId(scope), 'config', `sync_${configName}`);
}

export function getSyncScopeKey(scope: SyncCloudScope): string {
  return scope.workspaceId ? `workspace_${scope.workspaceId}` : `user_${getUserId(scope)}`;
}
