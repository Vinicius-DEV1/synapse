import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabContextMenu from './TabContextMenu';
import type { Tab } from '../../types';

describe('TabContextMenu component', () => {
  const mockTab: Tab = {
    id: 'tab-test',
    module: 'notes',
    pageId: 'p1',
    unsavedContent: null,
    scrollY: 0,
    isPinned: false,
  };

  const defaultProps = {
    x: 100,
    y: 100,
    tab: mockTab,
    tabCount: 3,
    hasTabsToRight: true,
    onTogglePin: vi.fn(),
    onCloseTab: vi.fn(),
    onCloseOtherTabs: vi.fn(),
    onCloseTabsToRight: vi.fn(),
    onDuplicateTab: vi.fn(),
    onNewTab: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders correctly and shows "Fixar aba" when tab is not pinned', () => {
    render(<TabContextMenu {...defaultProps} />);

    expect(screen.getByText('Fixar aba')).toBeDefined();
    expect(screen.getByText('Nova aba')).toBeDefined();
    expect(screen.getByText('Duplicar aba')).toBeDefined();
    expect(screen.getByText('Fechar aba')).toBeDefined();
    expect(screen.getByText('Fechar outras abas')).toBeDefined();
    expect(screen.getByText('Fechar abas à direita')).toBeDefined();
  });

  it('shows "Desfixar aba" when tab is already pinned', () => {
    const pinnedTab: Tab = { ...mockTab, isPinned: true };
    render(<TabContextMenu {...defaultProps} tab={pinnedTab} />);

    expect(screen.getByText('Desfixar aba')).toBeDefined();
    expect(screen.queryByText('Fixar aba')).toBeNull();
  });

  it('calls onTogglePin and onClose when clicking pin action', () => {
    const onTogglePin = vi.fn();
    const onClose = vi.fn();
    render(<TabContextMenu {...defaultProps} onTogglePin={onTogglePin} onClose={onClose} />);

    fireEvent.click(screen.getByText('Fixar aba'));
    expect(onTogglePin).toHaveBeenCalledWith('tab-test');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onDuplicateTab and onClose when clicking duplicate action', () => {
    const onDuplicateTab = vi.fn();
    const onClose = vi.fn();
    render(<TabContextMenu {...defaultProps} onDuplicateTab={onDuplicateTab} onClose={onClose} />);

    fireEvent.click(screen.getByText('Duplicar aba'));
    expect(onDuplicateTab).toHaveBeenCalledWith('tab-test');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    render(<TabContextMenu {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
