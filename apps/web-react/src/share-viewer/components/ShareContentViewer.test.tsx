import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShareContentViewer } from './ShareContentViewer';
import type { SharedPageConfig, VisitorPersona } from '../../types/sharing';

vi.mock('../../services/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
}));

vi.mock('../../services/sharing/share-collab', () => ({
  broadcastPresence: vi.fn(),
  listenToPresence: vi.fn(() => () => {}),
  removePresence: vi.fn(),
  broadcastCollabUpdate: vi.fn().mockResolvedValue(undefined),
  listenToCollabUpdates: vi.fn(() => () => {}),
}));

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn((options) => ({
    commands: {
      setContent: vi.fn(),
    },
    isEmpty: false,
    isDestroyed: false,
    getHTML: () => options?.content || '',
  })),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="mock-editor-content">
      {editor ? 'Editor Rendered' : 'No Editor'}
    </div>
  ),
}));

describe('ShareContentViewer Component', () => {
  const mockConfig: SharedPageConfig = {
    id: 'share-123',
    pageId: 'page-abc',
    ownerId: 'owner-xyz',
    permission: 'readonly',
    isPasswordProtected: false,
    requireOwnerApproval: false,
    isActive: true,
    wrappedShareKey: 'mock-key',
    title: 'PROGRAMACAO',
    icon: '💻',
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
  };

  const mockPersona: VisitorPersona = {
    name: 'ByteBadger',
    animal: 'Badger',
    color: '#3b82f6',
    tagline: 'Digging through code',
  };

  const mockShareKey = {} as CryptoKey;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header with title, icon, and visitor persona', () => {
    render(
      <ShareContentViewer
        config={mockConfig}
        initialContent="<p>Test content</p>"
        shareKey={mockShareKey}
        myDeviceId="device-1"
        myPersona={mockPersona}
      />
    );

    // Title appears in both header and main article
    const titles = screen.getAllByText('PROGRAMACAO');
    expect(titles.length).toBeGreaterThanOrEqual(1);

    // Persona moniker is displayed
    expect(screen.getByText('ByteBadger')).toBeDefined();

    // Editor content is rendered
    expect(screen.getByTestId('mock-editor-content')).toBeDefined();
  });

  it('renders E2EE encryption badge and Caderno branding', () => {
    render(
      <ShareContentViewer
        config={mockConfig}
        initialContent="<p>Test content</p>"
        shareKey={mockShareKey}
        myDeviceId="device-1"
        myPersona={mockPersona}
      />
    );

    expect(screen.getByText('E2EE')).toBeDefined();
    expect(
      screen.getByText(/Criptografia de Ponta a Ponta com Isolamento Criptográfico/i)
    ).toBeDefined();
  });
});
