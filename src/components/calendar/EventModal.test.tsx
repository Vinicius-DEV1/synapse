import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import EventModal from './EventModal';

vi.mock('../ui/Portal', () => ({
  Portal: ({ children }: any) => <div data-testid="event-portal">{children}</div>,
}));

vi.mock('../../store/useStore', () => ({
  useStore: vi.fn(() => ({
    state: { pages: [] },
    dispatch: vi.fn(),
  })),
}));

vi.mock('./ui/EventFormDateTimes', () => ({
  EventFormDateTimes: () => <div data-testid="event-datetimes" />,
}));

vi.mock('./ui/EventFormReminders', () => ({
  EventFormReminders: () => <div data-testid="event-reminders" />,
}));

vi.mock('./ui/EventModalFooter', () => ({
  EventModalFooter: ({ onCancel }: any) => (
    <div data-testid="event-footer">
      <button onClick={onCancel}>Cancelar</button>
      <button type="submit">Salvar</button>
    </div>
  ),
}));

describe('EventModal Component', () => {
  it('renders modal header and allows entering event title', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    const { getByPlaceholderText, getByText, getByTestId } = render(
      <EventModal event={null} onSave={onSave} onClose={onClose} />
    );

    expect(getByText('Novo Agendamento')).toBeDefined();
    expect(getByTestId('event-datetimes')).toBeDefined();
    expect(getByTestId('event-reminders')).toBeDefined();
    expect(getByTestId('event-footer')).toBeDefined();

    const titleInput = getByPlaceholderText('Reunião de Alinhamento');
    fireEvent.change(titleInput, { target: { value: 'Workshop de Design System' } });
    expect((titleInput as HTMLInputElement).value).toBe('Workshop de Design System');
  });
});
