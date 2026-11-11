import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryDrawer } from './MemoryDrawer';
import type { TutorMemory } from '../../../types';

describe('MemoryDrawer Component', () => {
  const mockMemories: TutorMemory[] = [
    {
      id: 'mem_1',
      fact: 'O usuário trabalha como Engenheiro de Software.',
      category: 'Profissão',
      created_at: 1000,
      updated_at: 1000,
    },
  ];

  it('renders memories list and triggers delete memory callback', () => {
    const onClose = vi.fn();
    const onDeleteMemory = vi.fn();

    const { getByText, getByTitle } = render(
      <MemoryDrawer
        isOpen={true}
        onClose={onClose}
        memories={mockMemories}
        onDeleteMemory={onDeleteMemory}
      />
    );

    expect(getByText('Memória da IA')).toBeDefined();
    expect(getByText('Profissão')).toBeDefined();
    expect(getByText('O usuário trabalha como Engenheiro de Software.')).toBeDefined();

    const deleteBtn = getByTitle('Apagar memória');
    fireEvent.click(deleteBtn);
    expect(onDeleteMemory).toHaveBeenCalledWith('mem_1');
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <MemoryDrawer
        isOpen={false}
        onClose={vi.fn()}
        memories={mockMemories}
        onDeleteMemory={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
