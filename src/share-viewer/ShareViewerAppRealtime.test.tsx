import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { ShareViewerApp } from './ShareViewerApp';
import type { SharedPageConfig } from '../types/sharing';

// Track snapshot callback to simulate real-time updates
let snapshotCallback: ((snap: unknown) => void) | null = null;
const mockUnsubscribe = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, collection, id) => ({ path: `${collection}/${id}`, id })),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ encryptedContent: 'mock-encrypted-content' }),
  }),
  onSnapshot: vi.fn((_docRef, cb) => {
    snapshotCallback = cb;
    return mockUnsubscribe;
  }),
}));

vi.mock('../services/firebase', () => ({
  db: {},
}));

vi.mock('../services/sharing/device-fingerprint', () => ({
  generateDeviceFingerprint: vi.fn().mockResolvedValue({
    fingerprintHash: 'hash-abc1234567890123',
    persistentToken: 'token-abc',
    components: {},
    generatedAt: 123456,
  }),
}));

vi.mock('../services/sharing/share-persona', () => ({
  getOrGeneratePersona: vi.fn().mockReturnValue({
    name: 'SyntaxLynx',
    animal: 'Lynx',
    color: '#10b981',
    tagline: 'Linting reality',
  }),
}));

vi.mock('../services/sharing/share-access-gate', () => ({
  checkDeviceTrust: vi.fn().mockResolvedValue({ isTrusted: false }),
  generateECDHKeyPair: vi.fn(),
  exportKeyToJWK: vi.fn(),
  importPublicKeyFromJWK: vi.fn(),
  deriveSharedSecretKey: vi.fn(),
  unwrapShareKeyWithSecret: vi.fn(),
  submitAccessRequest: vi.fn(),
  listenToAccessRequest: vi.fn(() => vi.fn()),
}));

vi.mock('../services/sharing/share-crypto', () => ({
  importShareKeyFromBase64: vi.fn().mockResolvedValue({} as CryptoKey),
  decryptFromShare: vi.fn().mockResolvedValue('<h1>Decrypted Content</h1>'),
  verifyPasswordHash: vi.fn(),
}));

vi.mock('../services/sharing/share-manager', () => ({
  logShareAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./components/ShareContentViewer', () => ({
  ShareContentViewer: ({ config }: { config: SharedPageConfig }) => (
    <div data-testid="share-content-viewer">
      <h1>{config.title}</h1>
      <p>Content Loaded</p>
    </div>
  ),
}));

describe('ShareViewerApp Real-Time Revocation & State Machine', () => {
  const baseActiveConfig: SharedPageConfig = {
    id: 'test-share-id',
    pageId: 'page-123',
    ownerId: 'owner-456',
    permission: 'readonly',
    isPasswordProtected: false,
    requireOwnerApproval: false,
    isActive: true,
    wrappedShareKey: 'bW9jay1rZXk=',
    title: 'PROGRAMACAO',
    icon: '💻',
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    snapshotCallback = null;

    // Simulate URL /s/test-share-id
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/s/test-share-id',
        search: '',
      },
      writable: true,
    });
  });

  it('renders content when shared page is active and unprotected', async () => {
    render(<ShareViewerApp />);

    // Wait for snapshot listener to register
    await waitFor(() => expect(snapshotCallback).not.toBeNull());

    // Emit active page snapshot
    await act(async () => {
      snapshotCallback!({
        exists: () => true,
        data: () => ({ ...baseActiveConfig }),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('share-content-viewer')).toBeDefined();
      expect(screen.getByText('PROGRAMACAO')).toBeDefined();
    });
  });

  it('immediately switches from loaded content to revoked screen when owner revokes access', async () => {
    render(<ShareViewerApp />);

    await waitFor(() => expect(snapshotCallback).not.toBeNull());

    // First snapshot: active
    await act(async () => {
      snapshotCallback!({
        exists: () => true,
        data: () => ({ ...baseActiveConfig }),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('share-content-viewer')).toBeDefined();
    });

    // Owner revokes: second snapshot with isActive = false
    await act(async () => {
      snapshotCallback!({
        exists: () => true,
        data: () => ({ ...baseActiveConfig, isActive: false }),
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('share-content-viewer')).toBeNull();
      expect(screen.getByText('Compartilhamento Revogado')).toBeDefined();
      expect(
        screen.getByText(/Este link de compartilhamento foi desativado pelo proprietário da página/i)
      ).toBeDefined();
    });
  });

  it('shows not-found screen immediately when shared page is deleted', async () => {
    render(<ShareViewerApp />);

    await waitFor(() => expect(snapshotCallback).not.toBeNull());

    // Snapshot with document deleted
    await act(async () => {
      snapshotCallback!({
        exists: () => false,
        data: () => null,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Página Não Encontrada')).toBeDefined();
    });
  });

  it('shows expired screen when expiresAt is in the past', async () => {
    render(<ShareViewerApp />);

    await waitFor(() => expect(snapshotCallback).not.toBeNull());

    // Snapshot with past expiresAt
    await act(async () => {
      snapshotCallback!({
        exists: () => true,
        data: () => ({
          ...baseActiveConfig,
          expiresAt: '2020-01-01T00:00:00Z',
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Link Expirado')).toBeDefined();
    });
  });
});
