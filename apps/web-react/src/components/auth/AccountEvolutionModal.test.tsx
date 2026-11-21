/**
 * @file AccountEvolutionModal.test.tsx
 * @description Unit tests for AccountEvolutionModal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { AccountEvolutionModal } from './AccountEvolutionModal';
import * as authService from '../../services/auth/firebase-auth';
import * as migrator from '../../services/migration/legacy-migrator';

const mockDispatch = vi.fn();
vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    dispatch: mockDispatch,
  }),
  useStoreDispatch: () => mockDispatch,
}));

vi.mock('../../services/auth/firebase-auth', () => ({
  registerWithFirebase: vi.fn(),
  signInWithFirebase: vi.fn(),
}));

vi.mock('../../services/migration/legacy-migrator', () => ({
  migrateLegacyUserToWorkspace: vi.fn(),
}));

describe('AccountEvolutionModal Component', () => {
  const mockMasterKey = {} as CryptoKey;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AccountEvolutionModal isOpen={false} onClose={vi.fn()} moduleKeys={{ notes: mockMasterKey }} masterKey={mockMasterKey} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with registration tab by default and switches to login', () => {
    const { getByText, getByPlaceholderText } = render(
      <AccountEvolutionModal isOpen={true} onClose={vi.fn()} moduleKeys={{ notes: mockMasterKey }} masterKey={mockMasterKey} />
    );

    expect(getByText(/Evoluir para Multiusuário/i)).toBeDefined();
    expect(getByText(/Migração segura e sem perda de dados/i)).toBeDefined();
    expect(getByPlaceholderText(/Seu nome/i)).toBeDefined();

    // Switch to login tab
    const loginTab = getByText('Entrar com Existente');
    fireEvent.click(loginTab);

    // Display name input should not be shown in login mode
    expect(() => getByPlaceholderText(/Seu nome/i)).toThrow();
  });

  it('submits registration, migrates legacy data, and updates active workspace', async () => {
    vi.mocked(authService.registerWithFirebase).mockResolvedValue({
      uid: 'user_new_1',
      email: 'newuser@example.com',
    } as any);

    vi.mocked(migrator.migrateLegacyUserToWorkspace).mockResolvedValue({
      dryRun: false,
      sourceDocCount: 15,
      migratedDocCount: 15,
      tablesProcessed: ['pages', 'transactions'],
      workspaceId: 'ws_personal_new',
      errors: [],
    });

    const onClose = vi.fn();
    const { getByPlaceholderText, getByRole } = render(
      <AccountEvolutionModal isOpen={true} onClose={onClose} moduleKeys={{ notes: mockMasterKey }} masterKey={mockMasterKey} />
    );

    fireEvent.change(getByPlaceholderText(/seu.email@exemplo.com/i), {
      target: { value: 'newuser@example.com' },
    });
    fireEvent.change(getByPlaceholderText(/Mínimo 6 caracteres/i), {
      target: { value: 'password123' },
    });

    const submitBtn = getByRole('button', { name: /Criar & Migrar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.registerWithFirebase).toHaveBeenCalledWith(
        'newuser@example.com',
        'password123',
        undefined
      );
      expect(migrator.migrateLegacyUserToWorkspace).toHaveBeenCalledWith(
        'user_new_1',
        'newuser@example.com',
        { notes: mockMasterKey },
        mockMasterKey
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_ACTIVE_WORKSPACE',
        workspaceId: 'ws_personal_new',
        role: 'owner',
      });
    });
  });

  it('displays error message if migration fails', async () => {
    vi.mocked(authService.registerWithFirebase).mockResolvedValue({
      uid: 'user_new_1',
      email: 'newuser@example.com',
    } as any);

    vi.mocked(migrator.migrateLegacyUserToWorkspace).mockResolvedValue({
      dryRun: false,
      sourceDocCount: 0,
      migratedDocCount: 0,
      tablesProcessed: [],
      workspaceId: '',
      errors: ['Permissão negada no Firestore'],
    });

    const { getByPlaceholderText, getByRole, findByText } = render(
      <AccountEvolutionModal isOpen={true} onClose={vi.fn()} moduleKeys={{ notes: mockMasterKey }} masterKey={mockMasterKey} />
    );

    fireEvent.change(getByPlaceholderText(/seu.email@exemplo.com/i), {
      target: { value: 'newuser@example.com' },
    });
    fireEvent.change(getByPlaceholderText(/Mínimo 6 caracteres/i), {
      target: { value: 'password123' },
    });

    const submitBtn = getByRole('button', { name: /Criar & Migrar/i });
    fireEvent.click(submitBtn);

    expect(await findByText('Permissão negada no Firestore')).toBeDefined();
  });

  it('does not report successful login when workspace synchronization fails', async () => {
    vi.mocked(authService.signInWithFirebase).mockResolvedValue({
      uid: 'user_existing_1',
      email: 'existing@example.com',
    } as any);
    vi.mocked(migrator.migrateLegacyUserToWorkspace).mockResolvedValue({
      dryRun: false,
      sourceDocCount: 4,
      migratedDocCount: 0,
      tablesProcessed: ['pages'],
      workspaceId: '',
      errors: ['Cloud push incomplete'],
    });

    const { getByText, getByPlaceholderText, findByText } = render(
      <AccountEvolutionModal isOpen onClose={vi.fn()} moduleKeys={{ notes: mockMasterKey }} masterKey={mockMasterKey} />
    );
    fireEvent.click(getByText('Entrar com Existente'));
    fireEvent.change(getByPlaceholderText(/seu.email@exemplo.com/i), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.change(getByPlaceholderText(/Mínimo 6 caracteres/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(getByText(/Entrar & Vincular/i));

    expect(await findByText('Cloud push incomplete')).toBeDefined();
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ACTIVE_WORKSPACE' }));
  });
});
