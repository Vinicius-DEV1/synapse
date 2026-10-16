import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabContextMenu from './TabContextMenu';
import type { Tab } from '../../types';
import { I18nProvider } from '../../i18n';

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

  const renderWithI18n = (ui: React.ReactElement, lang: 'en' | 'pt-BR' = 'en') =>
    render(<I18nProvider initialLanguage={lang}>{ui}</I18nProvider>);

  it('renders correctly and shows "Pin tab" when tab is not pinned in English default', () => {
    renderWithI18n(<TabContextMenu {...defaultProps} />, 'en');

    expect(screen.getByText('Pin tab')).toBeDefined();
    expect(screen.getByText('New Tab')).toBeDefined();
    expect(screen.getByText('Duplicate tab')).toBeDefined();
    expect(screen.getByText('Close tab')).toBeDefined();
    expect(screen.getByText('Close other tabs')).toBeDefined();
    expect(screen.getByText('Close tabs to the right')).toBeDefined();
  });

  it('shows "Unpin tab" when tab is already pinned', () => {
    const pinnedTab: Tab = { ...mockTab, isPinned: true };
    renderWithI18n(<TabContextMenu {...defaultProps} tab={pinnedTab} />, 'en');

    expect(screen.getByText('Unpin tab')).toBeDefined();
    expect(screen.queryByText('Pin tab')).toBeNull();
  });

  it('calls onTogglePin and onClose when clicking pin action', () => {
    const onTogglePin = vi.fn();
    const onClose = vi.fn();
    renderWithI18n(<TabContextMenu {...defaultProps} onTogglePin={onTogglePin} onClose={onClose} />, 'en');

    fireEvent.click(screen.getByText('Pin tab'));
    expect(onTogglePin).toHaveBeenCalledWith('tab-test');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onDuplicateTab and onClose when clicking duplicate action', () => {
    const onDuplicateTab = vi.fn();
    const onClose = vi.fn();
    renderWithI18n(<TabContextMenu {...defaultProps} onDuplicateTab={onDuplicateTab} onClose={onClose} />, 'en');

    fireEvent.click(screen.getByText('Duplicate tab'));
    expect(onDuplicateTab).toHaveBeenCalledWith('tab-test');
    expect(onClose).toHaveBeenCalled();
  });

  it('supports Portuguese localization seamlessly', () => {
    renderWithI18n(<TabContextMenu {...defaultProps} />, 'pt-BR');

    expect(screen.getByText('Fixar guia')).toBeDefined();
    expect(screen.getByText('Nova Guia')).toBeDefined();
    expect(screen.getByText('Duplicar guia')).toBeDefined();
    expect(screen.getByText('Fechar guia')).toBeDefined();
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    renderWithI18n(<TabContextMenu {...defaultProps} onClose={onClose} />, 'en');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
