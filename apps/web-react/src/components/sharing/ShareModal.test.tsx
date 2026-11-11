import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareModal } from './ShareModal';
import type { Page } from '../../types/notes';

vi.mock('./hooks/useShareModalActions', () => ({
  useShareModalActions: vi.fn(() => ({
    existingShare: null,
    loading: false,
    isSubmitting: false,
    copied: false,
    shareUrl: 'https://test.web.app/s/123',
    scope: 'single',
    setScope: vi.fn(),
    includeMedia: true,
    setIncludeMedia: vi.fn(),
    isPasswordProtected: false,
    setIsPasswordProtected: vi.fn(),
    password: '',
    setPassword: vi.fn(),
    requireOwnerApproval: false,
    setRequireOwnerApproval: vi.fn(),
    permission: 'read-only',
    setPermission: vi.fn(),
    handleCopyLink: vi.fn(),
    handleOpenInBrowser: vi.fn(),
    handleCreateShare: vi.fn(),
    handleSyncContent: vi.fn(),
    handleRevoke: vi.fn(),
    handleToggleActive: vi.fn(),
  })),
}));

describe('ShareModal Component', () => {
  const mockPage: Page = {
    id: 'page_123',
    title: 'Minha Nota de Pesquisa',
    icon: '🔬',
    parent_id: null,
    created_at: 1000,
    updated_at: 2000,
  };

  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ShareModal page={mockPage} isOpen={false} onClose={onCloseMock} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal header and page details when isOpen is true', () => {
    render(<ShareModal page={mockPage} isOpen={true} onClose={onCloseMock} />);
    expect(screen.getByText('Compartilhar Página')).toBeDefined();
    expect(screen.getByText(/Minha Nota de Pesquisa/)).toBeDefined();
    expect(screen.getByText('E2EE')).toBeDefined();
  });

  it('closes on Escape key press', () => {
    render(<ShareModal page={mockPage} isOpen={true} onClose={onCloseMock} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('closes on caderno-back-press custom event', () => {
    render(<ShareModal page={mockPage} isOpen={true} onClose={onCloseMock} />);
    const event = new Event('caderno-back-press', { cancelable: true });
    window.dispatchEvent(event);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
