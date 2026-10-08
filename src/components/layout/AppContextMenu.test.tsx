import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppContextMenu } from './AppContextMenu';
import type { Page } from '../../types';

describe('AppContextMenu Component', () => {
  const dummyPages: Page[] = [
    {
      id: 'page-1',
      title: 'Nota 1',
      content: '<p>Texto</p>',
      parentId: null,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      is_pinned: 1,
      pinned_order: 1,
    },
    {
      id: 'page-2',
      title: 'Nota 2',
      content: '<p>Texto 2</p>',
      parentId: null,
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
      is_pinned: 0,
      pinned_order: 0,
    },
  ];

  it('renders and calls onOpenInNewTab adding a new tab', () => {
    const dispatch = vi.fn();
    const handleCreatePage = vi.fn();
    const handleImportPage = vi.fn();
    const handleExportPage = vi.fn();
    const handleUpdatePage = vi.fn();
    const setRenamePageId = vi.fn();
    const setMovePageId = vi.fn();

    render(
      <AppContextMenu
        contextMenu={{ x: 100, y: 150, pageId: 'page-2', visible: true }}
        pages={dummyPages}
        dispatch={dispatch}
        handleCreatePage={handleCreatePage}
        handleImportPage={handleImportPage}
        handleExportPage={handleExportPage}
        handleUpdatePage={handleUpdatePage}
        setRenamePageId={setRenamePageId}
        setMovePageId={setMovePageId}
      />
    );

    const openInNewTabBtn = screen.getByText(/Abrir em uma nova guia/i);
    expect(openInNewTabBtn).toBeDefined();

    fireEvent.click(openInNewTabBtn);
    expect(dispatch).toHaveBeenCalledWith({ type: 'HIDE_CONTEXT_MENU' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_TAB',
        tab: expect.objectContaining({
          module: 'notes',
          pageId: 'page-2',
        }),
      })
    );
  });

  it('toggles pin order when clicking Fixar/Desafixar', () => {
    const dispatch = vi.fn();
    const handleCreatePage = vi.fn();
    const handleImportPage = vi.fn();
    const handleExportPage = vi.fn();
    const handleUpdatePage = vi.fn();
    const setRenamePageId = vi.fn();
    const setMovePageId = vi.fn();

    render(
      <AppContextMenu
        contextMenu={{ x: 100, y: 150, pageId: 'page-2', visible: true }}
        pages={dummyPages}
        dispatch={dispatch}
        handleCreatePage={handleCreatePage}
        handleImportPage={handleImportPage}
        handleExportPage={handleExportPage}
        handleUpdatePage={handleUpdatePage}
        setRenamePageId={setRenamePageId}
        setMovePageId={setMovePageId}
      />
    );

    const pinBtn = screen.getByText(/Fixar/i);
    fireEvent.click(pinBtn);

    expect(handleUpdatePage).toHaveBeenCalledWith('page-2', {
      is_pinned: 1,
      pinned_order: 2,
    });
  });
});
