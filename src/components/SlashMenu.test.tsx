import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SlashMenu from './SlashMenu';

describe('SlashMenu component', () => {
  it('renders all default commands when query is empty', () => {
    render(
      <SlashMenu
        x={100}
        y={100}
        query=""
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Texto')).toBeInTheDocument();
    expect(screen.getByText('Título 1')).toBeInTheDocument();
    expect(screen.getByText('Lista de tarefas')).toBeInTheDocument();
    expect(screen.getByText('Tabela')).toBeInTheDocument();
  });

  it('filters commands by query and handles click selection', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <SlashMenu
        x={100}
        y={100}
        query="tabela"
        onSelect={handleSelect}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Tabela')).toBeInTheDocument();
    expect(screen.queryByText('Título 1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Tabela'));
    expect(handleSelect).toHaveBeenCalledWith('table');
  });

  it('calls onClose when Escape key is pressed on document', () => {
    const handleClose = vi.fn();

    render(
      <SlashMenu
        x={100}
        y={100}
        query=""
        onSelect={vi.fn()}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });
});
