import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FocusWidgetNodeView from './FocusWidgetNodeView';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

vi.mock('../../store/FocusContext', () => ({
  useFocusContext: () => ({
    currentSession: null,
    timeLeft: 1500,
    isPaused: false,
    setIsPaused: vi.fn(),
    handleAddQuickTime: vi.fn(),
    handleTimerCancel: vi.fn(),
  }),
}));

describe('FocusWidgetNodeView Component', () => {
  it('renders duration and tag properly', () => {
    render(
      <FocusWidgetNodeView
        node={{
          attrs: {
            sessionId: 'f_1',
            duration: 25,
            tag: 'Estudos',
            status: 'completed',
          },
        }}
        updateAttributes={vi.fn()}
        editor={null}
        getPos={vi.fn()}
        selected={false}
      />
    );

    expect(screen.getByText('Foco: Estudos')).toBeInTheDocument();
    expect(screen.getByText('25m')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });
});
