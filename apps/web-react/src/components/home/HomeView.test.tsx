import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HomeView from './HomeView';
import { StoreProvider } from '../../store/useStore';
import { I18nProvider } from '../../i18n';

describe('HomeView component', () => {
  beforeEach(() => {
    window.api = {
      ...(window.api || {}),
      calendar: {
        getEvents: vi.fn().mockResolvedValue([]),
        createEvent: vi.fn().mockResolvedValue({ id: 'ev-1' }),
        updateEvent: vi.fn().mockResolvedValue({ id: 'ev-1' }),
        deleteEvent: vi.fn().mockResolvedValue(true),
        getEventsByDateRange: vi.fn().mockResolvedValue([]),
        getEventsByPageId: vi.fn().mockResolvedValue([]),
      },
      createPage: vi.fn().mockResolvedValue({ id: 'p-1', title: 'New Page' }),
    } as unknown as typeof window.api;
  });

  it('renders dashboard greeting and header with current date in default English', async () => {
    render(
      <I18nProvider initialLanguage="en">
        <StoreProvider>
          <HomeView tabId="tab-home" />
        </StoreProvider>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByText(/Today is/i)).toBeInTheDocument();
    });
  });

  it('renders dashboard greeting and header with current date in Portuguese', async () => {
    render(
      <I18nProvider initialLanguage="pt-BR">
        <StoreProvider>
          <HomeView tabId="tab-home" />
        </StoreProvider>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByText(/Hoje é/i)).toBeInTheDocument();
    });
  });
});
