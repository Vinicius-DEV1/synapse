import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BlockHandle from './BlockHandle';

describe('BlockHandle component', () => {
  it('renders with GPU accelerated transform positioning', () => {
    const { container } = render(
      <BlockHandle
        x={120}
        y={240}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
      />
    );

    const handle = container.firstChild as HTMLElement;
    expect(handle).toHaveStyle({
      transform: 'translate3d(120px, 240px, 0)',
      top: '0px',
      left: '0px',
    });
  });

  it('opens menu on click and triggers delete callback', () => {
    const onDelete = vi.fn();
    render(
      <BlockHandle
        x={50}
        y={100}
        onDelete={onDelete}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
      />
    );

    // Click handle to open menu
    const gripBtn = screen.getByTitle(/Opções do bloco/i);
    fireEvent.click(gripBtn);

    // Excluir bloco should be visible
    const deleteBtn = screen.getByText('Excluir bloco');
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
