import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVault } from './useVault';
import type { VaultGroup, VaultItem } from '../../../types/vault';

describe('useVault hook', () => {
  const mockGroups: VaultGroup[] = [
    {
      id: 'g-1',
      name: 'Personal',
      icon: 'Folder',
      color: '#3b82f6',
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  const mockItems: VaultItem[] = [
    {
      id: 'item-1',
      group_id: 'g-1',
      label: 'Google Account',
      username: 'user@gmail.com',
      email: 'user@gmail.com',
      password: 'password123',
      url: 'https://google.com',
      notes: null,
      custom_fields: null,
      is_favorite: 1,
      password_changed_at: null,
      password_strength: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
    {
      id: 'item-2',
      group_id: 'g-1',
      label: 'GitHub',
      username: 'dev',
      email: null,
      password: 'githubpass!',
      url: 'https://github.com',
      notes: null,
      custom_fields: null,
      is_favorite: 0,
      password_changed_at: null,
      password_strength: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  beforeEach(() => {
    (window as any).api = {
      vault: {
        getGroups: vi.fn().mockResolvedValue(mockGroups),
        getItems: vi.fn().mockResolvedValue(mockItems),
        getItem: vi.fn().mockImplementation(async (id: string) => mockItems.find((i) => i.id === id) || null),
        upsertGroup: vi.fn().mockResolvedValue(undefined),
        deleteGroup: vi.fn().mockResolvedValue(undefined),
        deleteItem: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('loads groups and items on initial mount', async () => {
    const { result } = renderHook(() => useVault());

    await act(async () => {
      await result.current.loadData();
    });

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].name).toBe('Personal');
    expect(result.current.items).toHaveLength(2);
  });

  it('filters items correctly according to searchQuery', async () => {
    const { result } = renderHook(() => useVault());

    await act(async () => {
      await result.current.loadData();
    });

    expect(result.current.filteredItems).toHaveLength(2);

    act(() => {
      result.current.setSearchQuery('git');
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].label).toBe('GitHub');
  });

  it('refreshes selected item via refreshSelectedItem', async () => {
    const { result } = renderHook(() => useVault());

    await act(async () => {
      const refreshed = await result.current.refreshSelectedItem('item-1');
      expect(refreshed?.label).toBe('Google Account');
    });

    expect(result.current.selectedItem?.id).toBe('item-1');
  });
});
