/**
 * @file WorkspaceSwitcher.test.tsx
 * @description Unit tests for Notion-style WorkspaceSwitcher dropdown component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import * as authService from '../../services/auth/firebase-auth';
import * as workspaceService from '../../services/workspace/workspace-service';

vi.mock('../../services/auth/firebase-auth', () => ({
  getCurrentAuthUser: vi.fn(),
}));

vi.mock('../../services/workspace/workspace-service', () => ({
  listUserWorkspaces: vi.fn(),
}));

describe('WorkspaceSwitcher Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders local single-user mode fallback when user is not logged in to Firebase', () => {
    vi.mocked(authService.getCurrentAuthUser).mockReturnValue(null);

    const onSelect = vi.fn();
    const onOpenCreate = vi.fn();
    const onOpenMembers = vi.fn();

    const { getByText } = render(
      <WorkspaceSwitcher
        onSelectWorkspace={onSelect}
        onOpenCreateModal={onOpenCreate}
        onOpenMembersModal={onOpenMembers}
      />
    );

    expect(getByText('Espaço Pessoal (Local)')).toBeDefined();
    expect(getByText(/Dono/i)).toBeDefined();
  });

  it('renders active workspace name and loads user workspaces when authenticated', async () => {
    vi.mocked(authService.getCurrentAuthUser).mockReturnValue({
      uid: 'user-1',
      email: 'user@example.com',
    } as any);

    vi.mocked(workspaceService.listUserWorkspaces).mockResolvedValue([
      { workspaceId: 'ws-1', name: 'Engenharia', role: 'owner', icon: '🚀', joinedAt: '' },
      { workspaceId: 'ws-2', name: 'Design', role: 'editor', icon: '🎨', joinedAt: '' },
    ]);

    const onSelect = vi.fn();
    const { getByText, findByText } = render(
      <WorkspaceSwitcher
        currentWorkspaceId="ws-1"
        onSelectWorkspace={onSelect}
        onOpenCreateModal={vi.fn()}
        onOpenMembersModal={vi.fn()}
      />
    );

    expect(await findByText('Engenharia')).toBeDefined();

    // Click to open dropdown
    const toggleBtn = getByText('Engenharia').closest('button')!;
    fireEvent.click(toggleBtn);

    // Should list Design workspace in dropdown
    const designOption = await findByText('Design');
    expect(designOption).toBeDefined();

    // Select Design
    fireEvent.click(designOption.closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('ws-2');
  });

  it('triggers onOpenCreateModal and onOpenMembersModal when clicking dropdown actions', async () => {
    vi.mocked(authService.getCurrentAuthUser).mockReturnValue({ uid: 'user-1' } as any);
    vi.mocked(workspaceService.listUserWorkspaces).mockResolvedValue([]);

    const onOpenCreate = vi.fn();
    const onOpenMembers = vi.fn();

    const { getByTitle, getByText } = render(
      <WorkspaceSwitcher
        onSelectWorkspace={vi.fn()}
        onOpenCreateModal={onOpenCreate}
        onOpenMembersModal={onOpenMembers}
      />
    );

    const toggleBtn = getByTitle('Alternar Workspace');
    fireEvent.click(toggleBtn);

    const createBtn = getByText('Criar Workspace').closest('button')!;
    fireEvent.click(createBtn);
    expect(onOpenCreate).toHaveBeenCalled();

    // Reopen and click members
    fireEvent.click(toggleBtn);
    const membersBtn = getByText('Membros & Permissões').closest('button')!;
    fireEvent.click(membersBtn);
    expect(onOpenMembers).toHaveBeenCalled();
  });
});
