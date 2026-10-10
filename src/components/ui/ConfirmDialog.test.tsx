import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog UI Component', () => {
  it('renders title, message, and buttons when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Excluir Item?"
        message="Esta ação é irreversível."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Excluir Item?')).toBeInTheDocument();
    expect(screen.getByText('Esta ação é irreversível.')).toBeInTheDocument();
    expect(screen.getByText('Sim, Excluir')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Excluir Item?"
        message="Esta ação é irreversível."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(container.innerHTML).toBe('');
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirmar"
        message="Deseja continuar?"
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Sim, Excluir'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel or close button is clicked', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirmar"
        message="Deseja continuar?"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancelar'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Escape keydown', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirmar"
        message="Deseja continuar?"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
