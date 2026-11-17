import { describe, expect, it, vi } from 'vitest';
import { getSyncCollection, getSyncConfigDocument, getSyncDocument, getSyncScopeKey } from './sync-cloud-paths';

vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...segments: string[]) => ({ path: segments.join('/') })),
  doc: vi.fn((_db, ...segments: string[]) => ({ path: segments.join('/') })),
}));

describe('sync cloud path scoping', () => {
  it('keeps user data inside the authenticated user namespace', () => {
    expect(getSyncCollection('pages', { userId: 'user-1' }).path).toBe('users/user-1/sync/data/pages');
    expect(getSyncDocument('pages', 'page-1', { userId: 'user-1' }).path)
      .toBe('users/user-1/sync/data/pages/page-1');
    expect(getSyncConfigDocument('sync_manifest', { userId: 'user-1' }).path)
      .toBe('users/user-1/config/sync_sync_manifest');
    expect(getSyncScopeKey({ userId: 'user-1' })).toBe('user_user-1');
  });

  it('keeps workspace data inside the selected workspace namespace', () => {
    expect(getSyncCollection('pages', { workspaceId: 'workspace-1' }).path)
      .toBe('workspaces/workspace-1/pages');
    expect(getSyncDocument('pages', 'page-1', { workspaceId: 'workspace-1' }).path)
      .toBe('workspaces/workspace-1/pages/page-1');
    expect(getSyncConfigDocument('sync_signal', { workspaceId: 'workspace-1' }).path)
      .toBe('workspaces/workspace-1/config/sync_signal');
    expect(getSyncScopeKey({ workspaceId: 'workspace-1' })).toBe('workspace_workspace-1');
  });

  it('rejects sync calls that do not provide an account or workspace scope', () => {
    expect(() => getSyncCollection('pages', {})).toThrow('Cloud sync requires an authenticated user');
    expect(() => getSyncDocument('pages', 'page-1', {})).toThrow('Cloud sync requires an authenticated user');
  });
});
