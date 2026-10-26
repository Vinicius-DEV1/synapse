/**
 * @file CreateWorkspaceModal.test.tsx
 * @description Unit tests for CreateWorkspaceModal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import * as authService from '../../services/auth/firebase-auth';
import * as workspaceService from '../../services/workspace/workspace-service';

vi.mock('../../services/auth/firebase-auth', () => ({
  getCurrentAuthUser: vi.fn(),
}));

vi.mock('../../services/workspace/workspace-service', () => ({
  createWorkspace: vi.fn(),
}));

describe('CreateWorkspaceModal Component', () => {
  const mockMasterKey = {} as CryptoKey;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CreateWorkspaceModal
        isOpen={false}
        onClose={vi.fn()}
        masterKey={mockMasterKey}
        onWorkspaceCreated={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('validates empty name and triggers error on submit', async () => {
    vi.mocked(authService.getCurrentAuthUser).mockReturnValue({
      uid: 'user_1',
      email: 'test@example.com',
    } as any);

    const { container, findByText } = render(
      <CreateWorkspaceModal
        isOpen={true}
        onClose={vi.fn()}
        masterKey={mockMasterKey}
        onWorkspaceCreated={vi.fn()}
      />
    );

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    expect(await findByText('O nome do workspace é obrigatório.')).toBeDefined();
  });

  it('submits valid form and invokes createWorkspace and onWorkspaceCreated', async () => {
    vi.mocked(authService.getCurrentAuthUser).mockReturnValue({
      uid: 'user_1',
      email: 'test@example.com',
    } as any);

    vi.mocked(workspaceService.createWorkspace).mockResolvedValue({
      workspace: { id: 'ws_new_123', name: 'Time de Produto' } as any,
      workspaceKey: {} as any,
    });

    const onCreated = vi.fn();
    const onClose = vi.fn();

    const { getByPlaceholderText, getByRole } = render(
      <CreateWorkspaceModal
        isOpen={true}
        onClose={onClose}
        masterKey={mockMasterKey}
        onWorkspaceCreated={onCreated}
      />
    );

    const input = getByPlaceholderText(/Ex: Engenharia de Software/i);
    fireEvent.change(input, { target: { value: 'Time de Produto' } });

    const submitBtn = getByRole('button', { name: /Criar Workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(workspaceService.createWorkspace).toHaveBeenCalledWith(
        'user_1',
        'test@example.com',
        expect.objectContaining({ name: 'Time de Produto' }),
        mockMasterKey
      );
      expect(onCreated).toHaveBeenCalledWith('ws_new_123');
    });
  });
});
