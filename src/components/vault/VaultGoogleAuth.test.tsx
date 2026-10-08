import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VaultItemList } from './VaultItemList';
import { VaultItemDetails } from './VaultItemDetails';
import { VaultItemForm } from './VaultItemForm';
import type { VaultItem, VaultGroup } from '../../types/vault';

describe('Vault Google Auth Feature', () => {
  const googleItem: VaultItem = {
    id: 'google-item-1',
    group_id: null,
    label: 'Spotify Google Account',
    username: 'spotuser',
    email: 'user@gmail.com',
    password: null,
    url: 'https://spotify.com',
    notes: 'Premium Family subscription via Google',
    custom_fields: null,
    is_favorite: 1,
    password_changed_at: null,
    password_strength: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    login_type: 'google',
  };

  const passwordItem: VaultItem = {
    id: 'pass-item-2',
    group_id: null,
    label: 'Local Bank Account',
    username: 'bankuser',
    email: 'bank@example.com',
    password: 'superSecretPassword!',
    url: 'https://bank.example.com',
    notes: null,
    custom_fields: null,
    is_favorite: 0,
    password_changed_at: null,
    password_strength: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    login_type: 'password',
  };

  it('renders Google avatar for Google-linked accounts in VaultItemList', () => {
    const handleSelect = vi.fn();
    const handleNew = vi.fn();

    render(
      <VaultItemList
        searchQuery=""
        setSearchQuery={vi.fn()}
        filteredItems={[googleItem, passwordItem]}
        selectedItem={null}
        isLoading={false}
        handleSelectItem={handleSelect}
        onNewItem={handleNew}
      />
    );

    // Spotify Google Account has Google SSO avatar with title
    const googleAvatar = screen.getByTitle('Conta vinculada ao Google (SSO)');
    expect(googleAvatar).toBeDefined();

    expect(screen.getByText('Spotify Google Account')).toBeDefined();
    expect(screen.getByText('Local Bank Account')).toBeDefined();
  });

  it('renders Google SSO badge and hides password field in VaultItemDetails', () => {
    render(
      <VaultItemDetails
        item={googleItem}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Spotify Google Account')).toBeDefined();
    expect(screen.getByText('Google SSO')).toBeDefined();
    expect(screen.getByText('Conta vinculada ao Google')).toBeDefined();
    expect(screen.getByText('E-mail da Conta Google')).toBeDefined();
    expect(screen.getByText('user@gmail.com')).toBeDefined();
    expect(screen.getByText('Abrir serviço para Entrar com Google')).toBeDefined();

    // Password field should NOT be rendered since password is null
    expect(screen.queryByText('••••••••••••')).toBeNull();
  });

  it('allows toggling between Password and Google in VaultItemForm', () => {
    const mockGroups: VaultGroup[] = [];
    const handleSave = vi.fn();
    const handleCancel = vi.fn();

    render(
      <VaultItemForm
        item={null}
        groups={mockGroups}
        groupId={null}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );

    // Initially password field is visible
    expect(screen.getByPlaceholderText('Digite ou gere uma senha')).toBeDefined();

    // Find the toggle button
    const toggleButton = screen.getByRole('switch');
    expect(toggleButton.getAttribute('aria-checked')).toBe('false');

    // Click toggle to switch to Google SSO
    fireEvent.click(toggleButton);

    expect(toggleButton.getAttribute('aria-checked')).toBe('true');
    // Password input should now be hidden
    expect(screen.queryByPlaceholderText('Digite ou gere uma senha')).toBeNull();
    // Email label should now specify Google account
    expect(screen.getByText('E-mail da Conta Google')).toBeDefined();
  });
});
