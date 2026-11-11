import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViewFactory } from './ViewFactory';
import type { Tab, Page } from '../types';

vi.mock('./home/HomeView', () => ({
  default: ({ tabId }: any) => <div data-testid="home-view">Home View {tabId}</div>,
}));

vi.mock('./library/LibraryView', () => ({
  default: ({ tabId }: any) => <div data-testid="library-view">Library View {tabId}</div>,
}));

vi.mock('./page-view/PageView', () => ({
  default: ({ page }: any) => <div data-testid="page-view">Page View {page?.title}</div>,
}));

describe('ViewFactory Component', () => {
  const dummyProps = {
    onUpdateContent: vi.fn(),
    onCreatePage: vi.fn(),
    onCreateLinkedPage: vi.fn(),
    onUpdatePage: vi.fn(),
  };

  it('renders HomeView when module is home', async () => {
    const tab: Tab = {
      id: 'tab-1',
      title: 'Início',
      module: 'home',
      activePageId: null,
      history: [],
      historyIndex: -1,
    };

    render(<ViewFactory tab={tab} page={null} {...dummyProps} />);

    expect(await screen.findByTestId('home-view')).toBeDefined();
    expect(screen.getByText('Home View tab-1')).toBeDefined();
  });

  it('renders PageView when module is notes', async () => {
    const tab: Tab = {
      id: 'tab-2',
      title: 'Notas',
      module: 'notes',
      activePageId: 'page-123',
      history: [],
      historyIndex: -1,
    };
    const page: Page = {
      id: 'page-123',
      title: 'Minha Página de Anotações',
      content: '<p>Olá mundo</p>',
      parentId: null,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      isPinned: false,
    };

    render(<ViewFactory tab={tab} page={page} {...dummyProps} />);

    expect(await screen.findByTestId('page-view')).toBeDefined();
    expect(screen.getByText('Page View Minha Página de Anotações')).toBeDefined();
  });
});
