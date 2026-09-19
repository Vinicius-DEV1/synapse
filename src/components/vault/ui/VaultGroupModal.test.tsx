import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VaultGroupModal } from './VaultGroupModal';
import type { VaultGroup } from '../../../types';

describe('VaultGroupModal', () => {
  const mockGroup: VaultGroup = {
    id: 'g-1',
    name: 'Finanças',
    icon: 'Folder',
    color: '#10b981',
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  it('renders correctly for creating a new group', () => {
    render(
      <VaultGroupModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('Novo Grupo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: Trabalho/i)).toHaveValue('');
    expect(screen.getByText('Criar Grupo')).toBeInTheDocument();
  });

  it('renders correctly for editing an existing group', () => {
    render(
      <VaultGroupModal
        isOpen={true}
        group={mockGroup}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('Editar Grupo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Finanças')).toBeInTheDocument();
    expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();
  });

  it('allows choosing a color from the palette and submitting', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <VaultGroupModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    const input = screen.getByPlaceholderText(/Ex: Trabalho/i);
    fireEvent.change(input, { target: { value: 'Pessoal' } });

    // Click on Esmeralda color button
    const esmeraldaBtn = screen.getByTitle('Esmeralda');
    fireEvent.click(esmeraldaBtn);

    // Submit form
    const submitBtn = screen.getByText('Criar Grupo');
    fireEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledWith('Pessoal', '#10b981');
  });
});
