import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import {
  migrateLegacyUserToWorkspace,
  createLocalBackupSnapshot,
} from './legacy-migrator';
import * as workspaceService from '../workspace/workspace-service';

vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('../workspace/workspace-service', () => ({
  listUserWorkspaces: vi.fn(),
  createWorkspace: vi.fn(),
}));

vi.mock('firebase/firestore', () => {
  const batchMock = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  return {
    collection: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
    doc: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    writeBatch: vi.fn(() => batchMock),
  };
});

describe('legacy-migrator', () => {
  const mockMasterKey = {} as CryptoKey;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLocalBackupSnapshot', () => {
    it('aggregates local table records via window.api.sync.getTable', async () => {
      (window as any).api = {
        sync: {
          getTable: vi.fn().mockImplementation((table: string) => {
            if (table === 'pages') return Promise.resolve([{ id: 'p1', title: 'Note' }]);
            return Promise.resolve([]);
          }),
        },
      };

      const snapshot = await createLocalBackupSnapshot();
      expect(snapshot['pages']).toEqual([{ id: 'p1', title: 'Note' }]);
      expect(snapshot['transactions']).toEqual([]);
    });
  });

  describe('migrateLegacyUserToWorkspace in dry-run mode', () => {
    it('calculates counts without performing any writes', async () => {
      vi.mocked(workspaceService.listUserWorkspaces).mockResolvedValueOnce([
        { workspaceId: 'ws_personal_1', name: 'Meu Espaço', isDefault: true, role: 'owner', icon: '📁', joinedAt: '' },
      ]);

      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ encryptedData: 'val' }),
      } as any);

      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          { id: 'doc1', data: () => ({ encryptedData: 'data1' }) },
          { id: 'doc2', data: () => ({ encryptedData: 'data2' }) },
        ],
      } as any);

      const summary = await migrateLegacyUserToWorkspace('u1', 'test@example.com', mockMasterKey, {
        dryRun: true,
      });

      expect(summary.dryRun).toBe(true);
      expect(summary.sourceDocCount).toBeGreaterThan(0);
      expect(workspaceService.createWorkspace).not.toHaveBeenCalled();

      const batch = firestore.writeBatch({} as any);
      expect(batch.commit).not.toHaveBeenCalled();
    });
  });

  describe('migrateLegacyUserToWorkspace live mode', () => {
    it('creates default workspace if missing and batches copy to target workspace', async () => {
      vi.mocked(workspaceService.listUserWorkspaces).mockResolvedValueOnce([]);
      vi.mocked(workspaceService.createWorkspace).mockResolvedValueOnce({
        workspace: { id: 'ws_new_1', name: 'Meu Espaço', createdAt: '' } as any,
        workspaceKey: {} as any,
      });

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'p1', data: () => ({ encryptedData: 'enc' }) }],
      } as any);

      const summary = await migrateLegacyUserToWorkspace('u1', 'test@example.com', mockMasterKey, {
        dryRun: false,
      });

      expect(summary.dryRun).toBe(false);
      expect(workspaceService.createWorkspace).toHaveBeenCalledWith(
        'u1',
        'test@example.com',
        expect.objectContaining({ name: 'Meu Espaço', type: 'personal' }),
        mockMasterKey
      );

      const batch = firestore.writeBatch({} as any);
      expect(batch.commit).toHaveBeenCalled();
    });

    it('handles and collects errors gracefully in summary.errors without crashing', async () => {
      vi.mocked(workspaceService.listUserWorkspaces).mockRejectedValueOnce(
        new Error('Network failure during workspace check')
      );

      const summary = await migrateLegacyUserToWorkspace('u1', 'test@example.com', mockMasterKey);
      expect(summary.errors.length).toBeGreaterThan(0);
      expect(summary.errors[0]).toContain('Network failure');
      expect(summary.migratedDocCount).toBe(0);
    });
  });
});
