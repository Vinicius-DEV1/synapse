import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import VaultView from './VaultView';
import { VaultItemDetails } from './VaultItemDetails';
import type { VaultGroup, VaultItem } from '../../types/vault';

describe('VaultView component', () => {
  const mockGroup: VaultGroup = {
    id: 'group-1',
    name: 'Trabalho',
    icon: 'Folder',
    color: '#3b82f6',
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const mockItem: VaultItem = {
    id: 'item-1',
    group_id: 'group-1',
    label: 'GitHub Dev Account',
    username: 'octocat',
    email: 'octo@github.com',
    password: 'superSecretPassword!',
    url: 'https://github.com',
    notes: 'Personal access token enabled',
    custom_fields: null,
    is_favorite: 1,
    password_changed_at: null,
    password_strength: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  beforeEach(() => {
    (window as any).api = {
      vault: {
        getGroups: vi.fn().mockResolvedValue([mockGroup]),
        getItems: vi.fn().mockResolvedValue([mockItem]),
        getItem: vi.fn().mockResolvedValue(mockItem),
        upsertGroup: vi.fn().mockResolvedValue(undefined),
        deleteGroup: vi.fn().mockResolvedValue(undefined),
        reorderGroups: vi.fn().mockResolvedValue(undefined),
        upsertItem: vi.fn().mockResolvedValue(undefined),
        deleteItem: vi.fn().mockResolvedValue(undefined),
        searchItems: vi.fn().mockResolvedValue([mockItem]),
        getPasswordHistory: vi.fn().mockResolvedValue([]),
        generatePassword: vi.fn().mockResolvedValue('generatedPassword123!'),
        checkBreach: vi.fn().mockResolvedValue({ breached: false, count: 0 }),
        checkStrength: vi.fn().mockResolvedValue(4),
      },
    };
  });

  it('renders vault groups sidebar and items list', async () => {
    render(<VaultView />);

    await waitFor(() => {
      expect(screen.getByText('Trabalho')).toBeInTheDocument();
      expect(screen.getByText('GitHub Dev Account')).toBeInTheDocument();
    });
  });

  it('displays empty selection state initially', async () => {
    render(<VaultView />);

    await waitFor(() => {
      expect(screen.getByText('Cofre de Senhas')).toBeInTheDocument();
      expect(screen.getByText('Selecione um item ou crie um novo')).toBeInTheDocument();
    });
  });

  it('shows item details when an item is selected from the list', async () => {
    render(<VaultView />);

    const itemCard = await screen.findByTestId('vault-item-item-1');
    expect(itemCard).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(itemCard);
    });

    await waitFor(() => {
      expect(screen.getByText('Credenciais')).toBeInTheDocument();
      expect(screen.getAllByText('octocat').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('octo@github.com')).toBeInTheDocument();
    });
  });

  it('switches to security dashboard view mode when clicking on Painel de Segurança', async () => {
    render(<VaultView />);

    await waitFor(() => {
      expect(screen.getByText('Painel de Segurança')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Painel de Segurança'));

    await waitFor(() => {
      expect(screen.getByText('Analise a integridade de todas as suas senhas do cofre.')).toBeInTheDocument();
      expect(screen.getByText('Iniciar Análise')).toBeInTheDocument();
    });
  });

  it('renders VaultItemDetails directly', () => {
    render(
      <VaultItemDetails
        item={mockItem}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Credenciais')).toBeInTheDocument();
    expect(screen.getByText('octocat')).toBeInTheDocument();
  });
});
