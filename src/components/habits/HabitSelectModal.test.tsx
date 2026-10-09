import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HabitSelectModal from './HabitSelectModal';

describe('HabitSelectModal', () => {
  const mockHabits = [
    {
      id: 'h1',
      title: 'Ler inglês',
      color: 'emerald',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      deleted_at: null,
    },
    {
      id: 'h2',
      title: 'Academia',
      color: 'sky',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      deleted_at: null,
    },
  ];

  const mockHabitsApi = {
    getHabits: vi.fn().mockResolvedValue(mockHabits),
    createHabit: vi.fn().mockImplementation((data: { title: string; color?: string }) =>
      Promise.resolve({
        id: 'h3',
        title: data.title,
        color: 'emerald',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        deleted_at: null,
      })
    ),
  };

  beforeEach(() => {
    (window as unknown as { api: { habits: typeof mockHabitsApi } }).api = {
      habits: mockHabitsApi,
    };
  });

  it('renders habits list when opened', async () => {
    render(
      <HabitSelectModal
        isOpen={true}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Ler inglês')).toBeInTheDocument();
      expect(screen.getByText('Academia')).toBeInTheDocument();
    });
  });

  it('filters habits by search query and selects an existing habit', async () => {
    const onSelect = vi.fn();
    render(
      <HabitSelectModal
        isOpen={true}
        initialQuery="Acad"
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Academia')).toBeInTheDocument();
      expect(screen.queryByText('Ler inglês')).not.toBeInTheDocument();
    });

    const item = screen.getByText('Academia');
    fireEvent.click(item);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'h2', title: 'Academia' })
    );
  });

  it('allows creating a new habit when typing an unmatched query', async () => {
    const onSelect = vi.fn();
    render(
      <HabitSelectModal
        isOpen={true}
        initialQuery="Meditar 20 min"
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Criar novo hábito: "Meditar 20 min"')
      ).toBeInTheDocument();
    });

    const createBtn = screen.getByText('Criar novo hábito: "Meditar 20 min"');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(mockHabitsApi.createHabit).toHaveBeenCalledWith({
        title: 'Meditar 20 min',
        color: 'emerald',
      });
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'h3', title: 'Meditar 20 min' })
      );
    });
  });
});
