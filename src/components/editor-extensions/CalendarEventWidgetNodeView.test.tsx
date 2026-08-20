import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CalendarEventWidgetNodeView from './CalendarEventWidgetNodeView';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    state: { activeTabId: 'tab_1' },
    dispatch: vi.fn(),
  }),
}));

describe('CalendarEventWidgetNodeView Component', () => {
  const mockEvent = {
    id: 'evt_1',
    title: 'Reunião de Alinhamento',
    start_date: '2026-08-20T10:00:00Z',
    end_date: '2026-08-20T11:00:00Z',
    status: 'pending',
  };

  beforeEach(() => {
    (window as any).api = {
      calendar: {
        getEvents: vi.fn().mockResolvedValue([mockEvent]),
        updateEvent: vi.fn().mockResolvedValue(true),
        deleteEvent: vi.fn().mockResolvedValue(true),
      },
    };
  });

  it('renders calendar event title and date', async () => {
    render(
      <CalendarEventWidgetNodeView
        node={{
          attrs: {
            eventId: 'evt_1',
            title: 'Reunião de Alinhamento',
            dateStr: '2026-08-20T10:00:00Z',
            status: 'pending',
          },
        }}
        updateAttributes={vi.fn()}
        deleteNode={vi.fn()}
      />
    );

    expect(screen.getByText('Reunião de Alinhamento')).toBeInTheDocument();
  });

  it('toggles completion status and updates database', async () => {
    const updateAttributes = vi.fn();

    render(
      <CalendarEventWidgetNodeView
        node={{
          attrs: {
            eventId: 'evt_1',
            title: 'Reunião de Alinhamento',
            dateStr: '2026-08-20T10:00:00Z',
            status: 'pending',
          },
        }}
        updateAttributes={updateAttributes}
        deleteNode={vi.fn()}
      />
    );

    // Botão de toggle checkbox
    const toggleBtn = screen.getByTitle('Marcar como concluído');
    fireEvent.click(toggleBtn);

    expect(updateAttributes).toHaveBeenCalledWith({ status: 'completed' });
    await waitFor(() => {
      expect((window as any).api.calendar.updateEvent).toHaveBeenCalledWith(
        'evt_1',
        expect.objectContaining({ status: 'completed' })
      );
    });
  });
});
