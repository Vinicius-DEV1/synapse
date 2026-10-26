/**
 * @file WorkspaceMembersModal.test.tsx
 * @description Unit tests for WorkspaceMembersModal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { WorkspaceMembersModal } from './WorkspaceMembersModal';
import * as authService from '../../services/auth/firebase-auth';
import * as workspaceService from '../../services/workspace/workspace-service';

vi.mock('../../services/auth/firebase-auth', () => ({
  getCurrentAuthUser: vi.fn(),
}));

vi.mock('../../services/workspace/workspace-service', () => ({
  listWorkspaceMembers: vi.fn(),
  listWorkspaceInvitations: vi.fn(),
  getWorkspace: vi.fn(),
  inviteMember: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  deleteWorkspace: vi.fn(),
}));

describe('WorkspaceMembersModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <WorkspaceMembersModal isOpen={false} onClose={vi.fn()} workspaceId="ws_1" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('loads and displays members and pending invitations', async () => {
    vi.mocked(authService.getCurrentAuthUser).mockReturnValue({
      uid: 'user_owner',
      email: 'owner@example.com',
    } as any);

    vi.mocked(workspaceService.getWorkspace).mockResolvedValue({
      id: 'ws_1',
      name: 'Time de Core',
      ownerId: 'user_owner',
      createdAt: '',
      updatedAt: '',
    });

    vi.mocked(workspaceService.listWorkspaceMembers).mockResolvedValue([
      { userId: 'user_owner', email: 'owner@example.com', role: 'owner', joinedAt: '' },
      { userId: 'user_collab', email: 'collab@example.com', role: 'editor', joinedAt: '' },
    ]);

    vi.mocked(workspaceService.listWorkspaceInvitations).mockResolvedValue([
      {
        id: 'inv_1',
        workspaceId: 'ws_1',
        workspaceName: 'Time de Core',
        invitedEmail: 'pending@example.com',
        role: 'viewer',
        status: 'pending',
        invitedByUserId: 'user_owner',
        invitedByEmail: 'owner@example.com',
        createdAt: '',
        expiresAt: '',
      },
    ]);

    const { findByText, findAllByText } = render(
      <WorkspaceMembersModal isOpen={true} onClose={vi.fn()} workspaceId="ws_1" />
    );

    expect(await findByText('Time de Core')).toBeDefined();
    expect((await findAllByText(/owner@example.com/i)).length).toBeGreaterThan(0);
    expect((await findAllByText(/collab@example.com/i)).length).toBeGreaterThan(0);
    expect(await findByText(/pending@example.com/i)).toBeDefined();
  });

  it('submits invitation for new member', async () => {
    vi.mocked(authService.getCurrentAuthUser).mockReturnValue({
      uid: 'user_owner',
      email: 'owner@example.com',
    } as any);

    vi.mocked(workspaceService.getWorkspace).mockResolvedValue({
      id: 'ws_1',
      name: 'Time de Core',
      ownerId: 'user_owner',
      createdAt: '',
      updatedAt: '',
    });

    vi.mocked(workspaceService.listWorkspaceMembers).mockResolvedValue([
      { userId: 'user_owner', email: 'owner@example.com', role: 'owner', joinedAt: '' },
    ]);
    vi.mocked(workspaceService.listWorkspaceInvitations).mockResolvedValue([]);
    vi.mocked(workspaceService.inviteMember).mockResolvedValue({
      id: 'inv_new',
      workspaceId: 'ws_1',
      workspaceName: 'Time de Core',
      invitedEmail: 'newbie@example.com',
      role: 'editor',
      status: 'pending',
      invitedByUserId: 'user_owner',
      invitedByEmail: 'owner@example.com',
      createdAt: '',
      expiresAt: '',
    });

    const { findByPlaceholderText, getByRole } = render(
      <WorkspaceMembersModal isOpen={true} onClose={vi.fn()} workspaceId="ws_1" />
    );

    const emailInput = await findByPlaceholderText(/convidado@exemplo.com/i);
    fireEvent.change(emailInput, { target: { value: 'newbie@example.com' } });

    const inviteBtn = getByRole('button', { name: /Convidar/i });
    fireEvent.click(inviteBtn);

    await waitFor(() => {
      expect(workspaceService.inviteMember).toHaveBeenCalledWith(
        'ws_1',
        'Time de Core',
        'newbie@example.com',
        'editor',
        'user_owner',
        'owner@example.com'
      );
    });
  });
});
