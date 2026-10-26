import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import {
  createWorkspace,
  listUserWorkspaces,
  getWorkspace,
  listWorkspaceMembers,
  updateMemberRole,
  removeMember,
  deleteWorkspace,
  transferWorkspaceOwnership,
} from './workspace-service';
import * as wsCrypto from './workspace-crypto';

vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('./workspace-crypto', () => ({
  generateWorkspaceKey: vi.fn().mockResolvedValue({ type: 'secret' } as unknown as CryptoKey),
  wrapWorkspaceKeyWithMaster: vi.fn().mockResolvedValue('enc_ws_key_mock'),
  unwrapWorkspaceKeyWithMaster: vi.fn().mockResolvedValue({ type: 'secret' } as unknown as CryptoKey),
}));

vi.mock('firebase/firestore', () => {
  const batchMock = {
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  return {
    collection: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
    doc: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    writeBatch: vi.fn(() => batchMock),
    query: vi.fn(),
    where: vi.fn(),
    runTransaction: vi.fn(),
  };
});

describe('workspace-service', () => {
  const mockMasterKey = {} as CryptoKey;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('generates an E2EE key, wraps it, and writes workspace, member, and user pointer in batch', async () => {
      const res = await createWorkspace(
        'user-1',
        'test@example.com',
        { name: 'Engenharia', icon: '🚀' },
        mockMasterKey
      );

      expect(res.workspace.name).toBe('Engenharia');
      expect(res.workspace.icon).toBe('🚀');
      expect(res.workspace.ownerId).toBe('user-1');
      expect(wsCrypto.generateWorkspaceKey).toHaveBeenCalled();
      expect(wsCrypto.wrapWorkspaceKeyWithMaster).toHaveBeenCalledWith(
        res.workspaceKey,
        mockMasterKey
      );

      const batch = firestore.writeBatch({} as any);
      expect(batch.set).toHaveBeenCalledTimes(3);
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe('listUserWorkspaces', () => {
    it('reads denormalized memberships collection', async () => {
      const mockPointers = [
        { workspaceId: 'ws_1', name: 'Pessoal', role: 'owner', isDefault: true },
        { workspaceId: 'ws_2', name: 'Trabalho', role: 'editor', isDefault: false },
      ];

      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        docs: mockPointers.map((p) => ({ data: () => p })),
      } as any);

      const list = await listUserWorkspaces('user-1');
      expect(list.length).toBe(2);
      expect(list[0].name).toBe('Pessoal');
      expect(list[1].role).toBe('editor');
    });
  });

  describe('updateMemberRole', () => {
    it('updates member document and user pointer in batch', async () => {
      await updateMemberRole('ws_1', 'user-2', 'admin');
      const batch = firestore.writeBatch({} as any);
      expect(batch.update).toHaveBeenCalledTimes(2);
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeMember', () => {
    it('deletes member document and user pointer in batch', async () => {
      await removeMember('ws_1', 'user-2');
      const batch = firestore.writeBatch({} as any);
      expect(batch.delete).toHaveBeenCalledTimes(2);
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteWorkspace', () => {
    it('rejects deletion if caller is not the owner', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ownerId: 'other-user' }),
      } as any);

      await expect(deleteWorkspace('ws_1', 'user-1')).rejects.toThrow(
        'Apenas o dono pode excluir o workspace.'
      );
    });
  });

  describe('transferWorkspaceOwnership', () => {
    it('transfers ownership and demotes current owner to admin in transaction', async () => {
      const mockTx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ ownerId: 'current-owner' }),
        }),
        update: vi.fn(),
      };
      vi.mocked(firestore.runTransaction).mockImplementationOnce(async (_db, fn) => {
        return fn(mockTx as any);
      });

      await transferWorkspaceOwnership('ws_1', 'current-owner', 'new-owner');
      expect(mockTx.update).toHaveBeenCalledTimes(5);
    });
  });

  describe('acceptInvitation', () => {
    it('validates invitation and commits acceptance batch', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'pending',
          invitedEmail: 'collab@example.com',
          role: 'editor',
          workspaceName: 'Synapse Team',
        }),
      } as any);

      const { acceptInvitation } = await import('./workspace-service');
      await acceptInvitation('ws_1', 'inv_1', 'user-collab', 'collab@example.com', 'Collab');

      const batch = firestore.writeBatch({} as any);
      expect(batch.update).toHaveBeenCalledTimes(1);
      expect(batch.set).toHaveBeenCalledTimes(2);
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });

    it('rejects acceptance if invitation email does not match user email', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'pending',
          invitedEmail: 'someoneelse@example.com',
          role: 'editor',
          workspaceName: 'Synapse Team',
        }),
      } as any);

      const { acceptInvitation } = await import('./workspace-service');
      await expect(
        acceptInvitation('ws_1', 'inv_1', 'user-collab', 'collab@example.com')
      ).rejects.toThrow('Este convite não pertence a este e-mail.');
    });
  });

  describe('declineInvitation', () => {
    it('updates invitation status to declined', async () => {
      const { declineInvitation } = await import('./workspace-service');
      await declineInvitation('ws_1', 'inv_1');
      expect(firestore.updateDoc).toHaveBeenCalled();
    });
  });
});
