import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ShareManagementPanel } from './ShareManagementPanel';
import * as shareManager from '../../services/sharing/share-manager';
import type { SharedPageConfig } from '../../types/sharing';

vi.mock('../../services/sharing/share-manager', () => ({
  listShares: vi.fn(),
  revokeShare: vi.fn(),
  deleteShare: vi.fn(),
  updateShareConfig: vi.fn(),
  buildShareUrl: vi.fn((id: string) => `https://test.web.app/s/${id}`),
}));

describe('ShareManagementPanel', () => {
  const mockShare: SharedPageConfig = {
    id: 'share_xyz123',
    pageId: 'page_456',
    ownerId: 'owner_fp',
    scope: 'single',
    includeMedia: true,
    isPasswordProtected: true,
    passwordHash: 'hash',
    passwordSalt: 'salt',
    requireOwnerApproval: true,
    permission: 'editable',
    encryptionKeyHash: 'keyhash',
    wrappedShareKey: 'wrapped',
    isActive: true,
    expiresAt: null,
    maxViews: null,
    viewCount: 12,
    title: 'Projeto Top Secret',
    icon: '🚀',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when there are no shares', async () => {
    vi.mocked(shareManager.listShares).mockResolvedValue([]);

    render(<ShareManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum compartilhamento ativo')).toBeDefined();
    });
  });

  it('renders list of shares with badges and titles', async () => {
    vi.mocked(shareManager.listShares).mockResolvedValue([mockShare]);

    render(<ShareManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Projeto Top Secret')).toBeDefined();
      expect(screen.getByText('Ativo')).toBeDefined();
      expect(screen.getByText('Edição')).toBeDefined();
      expect(screen.getByText('Senha')).toBeDefined();
      expect(screen.getByText('Guardião')).toBeDefined();
    });
  });
});
