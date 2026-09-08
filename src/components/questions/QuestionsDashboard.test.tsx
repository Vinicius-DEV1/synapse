import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QuestionsDashboard } from './QuestionsDashboard';
import type { QuizStats } from '../../types/quiz';

const mockStats: QuizStats = {
  totalBatteries: 3,
  totalQuestions: 25,
  answeredQuestions: 20,
  correctAnswers: 16,
  incorrectAnswers: 4,
  accuracyRate: 80,
  tagStats: {
    react: { total: 15, correct: 13, answered: 14 },
    typescript: { total: 10, correct: 3, answered: 6 },
  },
};

describe('QuestionsDashboard Component', () => {
  it('renders overall metrics correctly', () => {
    const { getByText } = render(
      <QuestionsDashboard
        stats={mockStats}
        onLaunchErrorNotebook={vi.fn()}
        onLaunchQuickSimulation={vi.fn()}
        onCreateBattery={vi.fn()}
      />
    );

    expect(getByText('25')).toBeDefined();
    expect(getByText('em 3 baterias')).toBeDefined();
    expect(getByText('20')).toBeDefined();
    expect(getByText('80%')).toBeDefined();
    expect(getByText('4')).toBeDefined(); // Erros
  });

  it('renders tag performance bars', () => {
    const { getByText } = render(
      <QuestionsDashboard
        stats={mockStats}
        onLaunchErrorNotebook={vi.fn()}
        onLaunchQuickSimulation={vi.fn()}
        onCreateBattery={vi.fn()}
      />
    );

    expect(getByText('#react')).toBeDefined();
    expect(getByText('#typescript')).toBeDefined();
  });

  it('handles quick action buttons', () => {
    const onLaunchError = vi.fn();
    const onLaunchSim = vi.fn();

    const { getByText } = render(
      <QuestionsDashboard
        stats={mockStats}
        onLaunchErrorNotebook={onLaunchError}
        onLaunchQuickSimulation={onLaunchSim}
        onCreateBattery={vi.fn()}
      />
    );

    fireEvent.click(getByText(`Revisar Erros (${mockStats.incorrectAnswers})`));
    expect(onLaunchError).toHaveBeenCalledTimes(1);

    fireEvent.click(getByText('Simulado Rápido'));
    expect(onLaunchSim).toHaveBeenCalledTimes(1);
  });
});
