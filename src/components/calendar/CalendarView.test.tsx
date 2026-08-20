import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CalendarView from './CalendarView';
import { StoreProvider } from '../../store/useStore';

describe('CalendarView component', () => {
  beforeEach(() => {
    (window as any).api = {
      calendar: {
        getEvents: vi.fn().mockResolvedValue([
          {
            id: 'ev-1',
            title: 'Exame de Física',
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString(),
            is_all_day: false,
          },
        ]),
        createEvent: vi.fn(),
        updateEvent: vi.fn(),
        deleteEvent: vi.fn(),
      },
    };
  });

  it('renders calendar view with event creation button and month header', async () => {
    render(
      <StoreProvider>
        <CalendarView />
      </StoreProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Calendário' })).toBeInTheDocument();

    const createButton = screen.getByText('+ Novo');
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Novo Agendamento')).toBeInTheDocument();
    });
  });
});
