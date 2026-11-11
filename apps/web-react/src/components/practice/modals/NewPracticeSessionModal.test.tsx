import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NewPracticeSessionModal } from './NewPracticeSessionModal';
import React from 'react';

describe('NewPracticeSessionModal', () => {
  it('renders both session mode options when open', () => {
    render(
      <NewPracticeSessionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectFreeMode={vi.fn()}
        onSelectInterviewMode={vi.fn()}
      />
    );

    expect(screen.getByText('Conversa Livre & Idiomas')).toBeInTheDocument();
    expect(screen.getByText('Simulador de Entrevista de Emprego')).toBeInTheDocument();
  });

  it('triggers onSelectFreeMode when clicking free conversation option', () => {
    const handleFree = vi.fn();
    const handleInterview = vi.fn();

    render(
      <NewPracticeSessionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectFreeMode={handleFree}
        onSelectInterviewMode={handleInterview}
      />
    );

    fireEvent.click(screen.getByText('Conversa Livre & Idiomas'));
    expect(handleFree).toHaveBeenCalledTimes(1);
    expect(handleInterview).not.toHaveBeenCalled();
  });

  it('triggers onSelectInterviewMode when clicking interview simulator option', () => {
    const handleFree = vi.fn();
    const handleInterview = vi.fn();

    render(
      <NewPracticeSessionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectFreeMode={handleFree}
        onSelectInterviewMode={handleInterview}
      />
    );

    fireEvent.click(screen.getByText('Simulador de Entrevista de Emprego'));
    expect(handleInterview).toHaveBeenCalledTimes(1);
    expect(handleFree).not.toHaveBeenCalled();
  });
});
