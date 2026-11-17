import { beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateLegacyUserToWorkspace } from './legacy-migrator';
import * as workspaceService from '../workspace/workspace-service';
import * as syncPush from '../sync/sync-push';

const firebase = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'user-1', isAnonymous: false } as { uid: string; isAnonymous: boolean } | null },
  batch: { set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../firebase', () => ({ auth: firebase.auth, db: {} }));
vi.mock('../workspace/workspace-service', () => ({
  listUserWorkspaces: vi.fn(),
  createWorkspace: vi.fn(),
}));
vi.mock('../sync/sync-push', () => ({ pushAllToCloud: vi.fn().mockResolvedValue(undefined) }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...segments: string[]) => ({ path: segments.join('/') })),
  writeBatch: vi.fn(() => firebase.batch),
}));

describe('migrateLegacyUserToWorkspace', () => {
  const moduleKeys = { core: {} as CryptoKey, notes: {} as CryptoKey };
  const masterKey = {} as CryptoKey;
  const localTableReader = vi.fn().mockImplementation((table: string) =>
    Promise.resolve(table === 'pages' ? [{ id: 'page-1' }] : [])
  );

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.auth.currentUser = { uid: 'user-1', isAnonymous: false };
    firebase.batch.commit.mockResolvedValue(undefined);
    localTableReader.mockImplementation((table: string) =>
      Promise.resolve(table === 'pages' ? [{ id: 'page-1' }] : [])
    );
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { sync: { getTable: localTableReader } },
    });
    vi.mocked(workspaceService.listUserWorkspaces).mockResolvedValue([
      { workspaceId: 'workspace-1', name: 'Personal', isDefault: true, role: 'owner', icon: '📁', joinedAt: '' },
    ]);
  });

  it('dry-runs local rows without writing to Firestore or the cloud sync service', async () => {
    const result = await migrateLegacyUserToWorkspace('user-1', 'user@example.com', moduleKeys, masterKey, { dryRun: true });

    expect(result).toMatchObject({
      dryRun: true,
      sourceDocCount: 1,
      migratedDocCount: 0,
      tablesProcessed: ['pages'],
      workspaceId: 'workspace-1',
      errors: [],
    });
    expect(syncPush.pushAllToCloud).not.toHaveBeenCalled();
    expect(firebase.batch.commit).not.toHaveBeenCalled();
  });

  it('pushes local rows only into the authenticated personal workspace', async () => {
    const result = await migrateLegacyUserToWorkspace('user-1', 'user@example.com', moduleKeys, masterKey);

    expect(syncPush.pushAllToCloud).toHaveBeenCalledWith(moduleKeys, undefined, 'workspace-1', 'user-1');
    expect(firebase.batch.commit).toHaveBeenCalledOnce();
    expect(result.migratedDocCount).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it('does not read or copy documents from legacy root collections', async () => {
    await migrateLegacyUserToWorkspace('user-1', 'user@example.com', moduleKeys, masterKey);

    expect(localTableReader).toHaveBeenCalledWith('pages');
    expect(syncPush.pushAllToCloud).toHaveBeenCalledWith(moduleKeys, undefined, 'workspace-1', 'user-1');
  });

  it('wraps a newly created workspace key with the real master key', async () => {
    vi.mocked(workspaceService.listUserWorkspaces).mockResolvedValue([]);
    vi.mocked(workspaceService.createWorkspace).mockResolvedValue({
      workspace: {
        id: 'workspace-created',
        name: 'Meu Espaço',
        icon: '🏠',
        type: 'personal',
        ownerId: 'user-1',
        isArchived: false,
        memberCount: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      workspaceKey: {} as CryptoKey,
    });

    const result = await migrateLegacyUserToWorkspace('user-1', 'user@example.com', moduleKeys, masterKey);

    expect(workspaceService.createWorkspace).toHaveBeenCalledWith(
      'user-1',
      'user@example.com',
      { name: 'Meu Espaço', icon: '🏠', type: 'personal' },
      masterKey
    );
    expect(syncPush.pushAllToCloud).toHaveBeenCalledWith(moduleKeys, undefined, 'workspace-created', 'user-1');
    expect(result.errors).toEqual([]);
  });

  it('rejects a migration targeted at a different signed-in account', async () => {
    const result = await migrateLegacyUserToWorkspace('another-user', 'user@example.com', moduleKeys, masterKey);

    expect(result.errors[0]).toContain('does not match');
    expect(syncPush.pushAllToCloud).not.toHaveBeenCalled();
  });

  it('rejects anonymous Firebase sessions', async () => {
    firebase.auth.currentUser = { uid: 'user-1', isAnonymous: true };
    const result = await migrateLegacyUserToWorkspace('user-1', 'user@example.com', moduleKeys, masterKey);

    expect(result.errors[0]).toContain('does not match');
    expect(syncPush.pushAllToCloud).not.toHaveBeenCalled();
  });

  it('does not mark completion when local table inspection or cloud sync fails', async () => {
    localTableReader.mockRejectedValueOnce(new Error('Local database unavailable'));
    const failedRead = await migrateLegacyUserToWorkspace('user-1', 'user@example.com', moduleKeys, masterKey);
    expect(failedRead.errors[0]).toContain('Could not inspect local table');
    expect(syncPush.pushAllToCloud).not.toHaveBeenCalled();

    localTableReader.mockImplementation((table: string) => Promise.resolve(table === 'pages' ? [{ id: 'page-1' }] : []));
    vi.mocked(syncPush.pushAllToCloud).mockRejectedValueOnce(new Error('Cloud write failed'));
    const failedPush = await migrateLegacyUserToWorkspace('user-1', 'user@example.com', moduleKeys, masterKey);
    expect(failedPush.errors[0]).toContain('Cloud write failed');
    expect(firebase.batch.commit).not.toHaveBeenCalled();
  });
});
