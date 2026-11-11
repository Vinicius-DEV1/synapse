import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SessionSummary } from './SessionSummary';
import { I18nProvider } from '../../../i18n';

describe('SessionSummary Component', () => {
  it('renders completed session stats and calculates accuracy', () => {
    const onClose = vi.fn();
    const sessionStartTime = Date.now() - 95000; // 1m 35s ago

    const { getByText } = render(
      <I18nProvider initialLanguage="pt-BR">
        <SessionSummary
          sessionStats={{ reviewed: 10, correct: 8 }}
          sessionStartTime={sessionStartTime}
          onClose={onClose}
        />
      </I18nProvider>
    );

    expect(getByText(/Parabéns! 🎉/i)).toBeDefined();
    expect(getByText('10')).toBeDefined(); // reviewed cards
    expect(getByText('80%')).toBeDefined(); // 8/10 = 80% accuracy

    const closeBtn = getByText(/Voltar para o Baralho/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
