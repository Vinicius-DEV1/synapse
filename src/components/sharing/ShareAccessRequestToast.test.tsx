import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareAccessRequestToast } from './ShareAccessRequestToast';
import type { ShareAccessRequest } from '../../types/sharing';

describe('ShareAccessRequestToast', () => {
  const mockRequest: ShareAccessRequest = {
    id: 'req_123',
    shareId: 'share_abc',
    deviceFingerprint: {
      fingerprintHash: 'hash1234567890abcdef',
      persistentToken: 'token_123',
      displayLabel: 'Chrome 126 · Linux · 8 cores',
      signals: {
        canvasHash: 'canvashash',
        webglRenderer: 'WebGL Mesa',
        webglVendor: 'Intel',
        platform: 'Linux x86_64',
        hardwareConcurrency: 8,
        deviceMemory: 16,
        screenResolution: '1920x1080@1',
        colorDepth: 24,
        timezone: 'UTC',
        language: 'en',
        touchSupport: false,
        cookieEnabled: true,
        doNotTrack: null,
      },
    },
    ipHash: '1234567890abcdef',
    status: 'pending',
    requestedAt: new Date().toISOString(),
    resolvedAt: null,
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    passwordVerified: true,
    encryptedShareKey: null,
    visitorPublicKey: '{}',
    ownerPublicKey: null,
  };

  it('renders null when there are no requests', () => {
    const { container } = render(
      <ShareAccessRequestToast
        requests={[]}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
        onInspect={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders visitor device label and handles approve, deny, inspect actions', () => {
    const handleApprove = vi.fn().mockResolvedValue(true);
    const handleDeny = vi.fn().mockResolvedValue(true);
    const handleInspect = vi.fn();

    render(
      <ShareAccessRequestToast
        requests={[mockRequest]}
        onApprove={handleApprove}
        onDeny={handleDeny}
        onInspect={handleInspect}
      />
    );

    expect(screen.getByText('Chrome 126 · Linux · 8 cores')).toBeDefined();
    expect(screen.getByText('✓ Senha correta')).toBeDefined();

    // Click Detalhes
    fireEvent.click(screen.getByText('Detalhes'));
    expect(handleInspect).toHaveBeenCalledWith(mockRequest);

    // Click Negar
    fireEvent.click(screen.getByText('Negar'));
    expect(handleDeny).toHaveBeenCalledWith('req_123');

    // Click Liberar
    fireEvent.click(screen.getByText('Liberar'));
    expect(handleApprove).toHaveBeenCalledWith(mockRequest);
  });
});
