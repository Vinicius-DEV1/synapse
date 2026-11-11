import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ContextMenu from './ContextMenu';

describe('ContextMenu Component', () => {
  it('triggers action callbacks and closes menu on click', () => {
    const onOpenInNewTab = vi.fn();
    const onCreateSubPage = vi.fn();
    const onRename = vi.fn();
    const onDelete = vi.fn();
    const onMovePage = vi.fn();
    const onTogglePin = vi.fn();
    const onClose = vi.fn();

    const { getByText } = render(
      <ContextMenu
        x={100}
        y={150}
        pageId="page-test-1"
        isPinned={false}
        onOpenInNewTab={onOpenInNewTab}
        onCreateSubPage={onCreateSubPage}
        onRename={onRename}
        onDelete={onDelete}
        onMovePage={onMovePage}
        onTogglePin={onTogglePin}
        onClose={onClose}
      />
    );

    expect(getByText(/Abrir em uma nova guia/i)).toBeDefined();
    expect(getByText(/Nova sub-página/i)).toBeDefined();
    expect(getByText(/Fixar/i)).toBeDefined();

    // Click open in new tab
    const openInNewTabBtn = getByText(/Abrir em uma nova guia/i);
    fireEvent.click(openInNewTabBtn);
    expect(onOpenInNewTab).toHaveBeenCalledWith('page-test-1');
    expect(onClose).toHaveBeenCalled();

    // Click rename
    const renameBtn = getByText(/Renomear/i);
    fireEvent.click(renameBtn);

    expect(onRename).toHaveBeenCalledWith('page-test-1');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
