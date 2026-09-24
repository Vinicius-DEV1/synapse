import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HabitHeatmapModal from './HabitHeatmapModal';

describe('HabitHeatmapModal', () => {
  const mockHabit = {
    id: 'habit-1',
    title: 'Ler inglês',
    color: 'emerald',
    icon: 'Flame',
    target_days_per_week: 7,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
  };

  const mockLogs = [
    {
      id: 'habit-1_2026-09-24',
      habit_id: 'habit-1',
      date: '2026-09-24',
      completed_at: '2026-09-24T10:00:00.000Z',
    },
    {
      id: 'habit-1_2026-09-25',
      habit_id: 'habit-1',
      date: '2026-09-25',
      completed_at: '2026-09-25T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    (window as any).api = {
      habits: {
        getHabit: vi.fn().mockResolvedValue(mockHabit),
        getLogs: vi.fn().mockResolvedValue(mockLogs),
        toggleDayLog: vi.fn().mockResolvedValue({ completed: true }),
        updateHabit: vi.fn().mockResolvedValue({ success: true }),
        deleteHabit: vi.fn().mockResolvedValue(true),
      },
    };
  });

  it('renders habit title and statistics scorecards', async () => {
    render(
      <HabitHeatmapModal
        habitId="habit-1"
        initialDate="2026-09-25"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Ler inglês')).toBeInTheDocument();
    });

    expect(screen.getByText('Sequência Atual')).toBeInTheDocument();
    expect(screen.getByText('Melhor Sequência')).toBeInTheDocument();
    expect(screen.getByText('Total Realizado')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <HabitHeatmapModal
        habitId="habit-1"
        initialDate="2026-09-25"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Ler inglês')).toBeInTheDocument();
    });

    const closeBtn = screen.getByTitle('Fechar (Esc)');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('toggles day log when a heatmap cell is clicked', async () => {
    render(
      <HabitHeatmapModal
        habitId="habit-1"
        initialDate="2026-09-25"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Ler inglês')).toBeInTheDocument();
    });

    const cell = screen.getByTitle(/2026-09-25/);
    fireEvent.click(cell);

    await waitFor(() => {
      expect((window as any).api.habits.toggleDayLog).toHaveBeenCalledWith(
        'habit-1',
        '2026-09-25'
      );
    });
  });
});
