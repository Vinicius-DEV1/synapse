import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import FileActionModal from './FileActionModal';

const mockDispatch = vi.fn();
vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    state: { activeTabId: 'tab_current' },
    dispatch: mockDispatch,
  }),
}));

describe('FileActionModal', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('calls onClose and dispatches ADD_TAB when opening in new tab', () => {
    const onClose = vi.fn();
    const onOpenViewer = vi.fn();

    const { getByText } = render(
      <FileActionModal
        isOpen={true}
        fileId="file_123"
        title="Livros-grátis.pdf"
        onClose={onClose}
        onOpenViewer={onOpenViewer}
      />
    );

    const newTabBtn = getByText('Leitor Completo (Nova Guia)');
    fireEvent.click(newTabBtn);

    expect(onClose).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_TAB',
        tab: expect.objectContaining({
          module: 'library',
          bookId: 'file_123',
        }),
      })
    );
  });

  it('calls onClose and dispatches UPDATE_TAB_MODULE when opening in same tab', () => {
    const onClose = vi.fn();
    const onOpenViewer = vi.fn();

    const { getByText } = render(
      <FileActionModal
        isOpen={true}
        fileId="file_123"
        title="Livros-grátis.pdf"
        onClose={onClose}
        onOpenViewer={onOpenViewer}
      />
    );

    const sameTabBtn = getByText('Leitor Completo (Nesta Guia)');
    fireEvent.click(sameTabBtn);

    expect(onClose).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_TAB_MODULE',
      tabId: 'tab_current',
      module: 'library',
      bookId: 'file_123',
      moduleState: { bookId: 'file_123' },
    });
  });

  it('calls onClose and onOpenViewer when selecting quick viewer', () => {
    const onClose = vi.fn();
    const onOpenViewer = vi.fn();

    const { getByText } = render(
      <FileActionModal
        isOpen={true}
        fileId="file_123"
        title="Livros-grátis.pdf"
        onClose={onClose}
        onOpenViewer={onOpenViewer}
      />
    );

    const quickViewerBtn = getByText('Visualizador Rápido');
    fireEvent.click(quickViewerBtn);

    expect(onClose).toHaveBeenCalled();
    expect(onOpenViewer).toHaveBeenCalled();
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();
    const onOpenViewer = vi.fn();

    const { container } = render(
      <FileActionModal
        isOpen={true}
        fileId="file_123"
        title="Livros-grátis.pdf"
        onClose={onClose}
        onOpenViewer={onOpenViewer}
      />
    );

    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    const onOpenViewer = vi.fn();

    render(
      <FileActionModal
        isOpen={true}
        fileId="file_123"
        title="Livros-grátis.pdf"
        onClose={onClose}
        onOpenViewer={onOpenViewer}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
