import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeView from './HomeView';
import { StoreProvider } from '../../store/useStore';

describe('HomeView component', () => {
  beforeEach(() => {
    (window as any).api = {
      calendar: {
        getEvents: vi.fn().mockResolvedValue([]),
      },
      createPage: vi.fn().mockResolvedValue({ id: 'p-1', title: 'Nova Página' }),
    };
  });

  it('renders dashboard greeting and header with current date', () => {
    render(
      <StoreProvider>
        <HomeView tabId="tab-home" />
      </StoreProvider>
    );

    // Expect greeting to match Bom dia / Boa tarde / Boa noite
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Hoje é/i)).toBeInTheDocument();
  });
});
