import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import VaultView from './VaultView';

describe('VaultView component', () => {
  beforeEach(() => {
    (window as any).api = {
      vault: {
        getGroups: vi.fn().mockResolvedValue([
          { id: 'group-1', name: 'Trabalho', icon: 'Folder', color: '#3b82f6', position: 0 },
        ]),
        getItems: vi.fn().mockResolvedValue([
          {
            id: 'item-1',
            group_id: 'group-1',
            label: 'GitHub Dev Account',
            title: 'GitHub Dev Account',
            username: 'octocat',
            password: 'encrypted:pass',
            notes: 'Personal access token enabled',
            updated_at: new Date().toISOString(),
          },
        ]),
        createGroup: vi.fn(),
        createItem: vi.fn(),
        updateItem: vi.fn(),
        deleteItem: vi.fn(),
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
});
