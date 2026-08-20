import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FileWidgetNodeView from './FileWidgetNodeView';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    state: { activeTabId: 'tab_1' },
    dispatch: vi.fn(),
  }),
}));

describe('FileWidgetNodeView Component', () => {
  it('renders file name and appropriate styling', () => {
    render(
      <FileWidgetNodeView
        node={{
          attrs: {
            fileId: 'file_1',
            name: 'Relatorio_Final.pdf',
            fileType: 'pdf',
            isLink: false,
          },
        }}
        deleteNode={vi.fn()}
      />
    );

    expect(screen.getByText('Relatorio_Final.pdf')).toBeInTheDocument();
  });
});
