import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import LinkDuplicatesModal from './LinkDuplicatesModal';
import type { DuplicatePageInfo } from '../hooks/useLinkDuplicates';

describe('LinkDuplicatesModal', () => {
  const mockPages: DuplicatePageInfo[] = [
    {
      id: 'page-1',
      title: 'Anotações de React',
      icon: '⚛️',
      ancestors: [{ id: 'parent-1', title: 'Estudos' }],
    },
    {
      id: 'page-2',
      title: 'Frontend Roadmap',
      icon: '🗺️',
      ancestors: [],
    },
  ];

  it('does not render when isOpen is false', () => {
    render(
      <LinkDuplicatesModal
        isOpen={false}
        onClose={vi.fn()}
        url="https://vite.dev"
        duplicatePages={mockPages}
        onNavigateToPage={vi.fn()}
      />
    );

    expect(screen.queryByText('Link já utilizado no Caderno')).not.toBeInTheDocument();
  });

  it('renders modal details and duplicate pages when open', () => {
    render(
      <LinkDuplicatesModal
        isOpen={true}
        onClose={vi.fn()}
        url="https://vite.dev"
        title="Vite Build Tool"
        duplicatePages={mockPages}
        onNavigateToPage={vi.fn()}
      />
    );

    expect(screen.getByText('Link já utilizado no Caderno')).toBeInTheDocument();
    expect(screen.getByText('Vite Build Tool')).toBeInTheDocument();
    expect(screen.getByText('https://vite.dev')).toBeInTheDocument();
    expect(screen.getByText('Anotações de React')).toBeInTheDocument();
    expect(screen.getByText('Estudos')).toBeInTheDocument();
    expect(screen.getByText('Frontend Roadmap')).toBeInTheDocument();
  });

  it('triggers navigation and closes modal when clicking a page item', () => {
    const handleNavigate = vi.fn();
    const handleClose = vi.fn();

    render(
      <LinkDuplicatesModal
        isOpen={true}
        onClose={handleClose}
        url="https://vite.dev"
        duplicatePages={mockPages}
        onNavigateToPage={handleNavigate}
      />
    );

    fireEvent.click(screen.getByText('Anotações de React'));
    expect(handleNavigate).toHaveBeenCalledWith('page-1');
    expect(handleClose).toHaveBeenCalled();
  });

  it('closes modal when clicking the OK button', () => {
    const handleClose = vi.fn();

    render(
      <LinkDuplicatesModal
        isOpen={true}
        onClose={handleClose}
        url="https://vite.dev"
        duplicatePages={mockPages}
        onNavigateToPage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('OK, Entendido'));
    expect(handleClose).toHaveBeenCalled();
  });

  it('closes modal when pressing Escape', () => {
    const handleClose = vi.fn();

    render(
      <LinkDuplicatesModal
        isOpen={true}
        onClose={handleClose}
        url="https://vite.dev"
        duplicatePages={mockPages}
        onNavigateToPage={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });
});
