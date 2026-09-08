import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QuestionsExplorer } from './QuestionsExplorer';
import type { BatteryWithQuestions } from '../../types/quiz';

const mockBatteries: BatteryWithQuestions[] = [
  {
    id: 'bat-1',
    title: 'Bateria de Redes',
    description: 'Protocolos de internet',
    layout: 'sequential',
    tags: ['redes', 'tcp'],
    created_at: '2026-09-08T00:00:00.000Z',
    updated_at: '2026-09-08T00:00:00.000Z',
    questions: [
      {
        id: 'q1',
        battery_id: 'bat-1',
        type: 'multiple_choice',
        question: 'Qual a porta do DNS?',
        options: ['53', '80'],
        correct_index: 0,
        expected_answer: '',
        explanation: 'Porta 53',
        tags: ['redes'],
        sort_order: 1,
        created_at: '2026-09-08T00:00:00.000Z',
        updated_at: '2026-09-08T00:00:00.000Z',
      },
    ],
    latestAttempts: {
      q1: {
        id: 'att-1',
        question_id: 'q1',
        battery_id: 'bat-1',
        type: 'multiple_choice',
        selected_index: 0,
        is_correct: true,
        duration_ms: 300,
        created_at: '2026-09-08T00:00:00.000Z',
      },
    },
    linkedPages: [{ id: 'page-1', title: 'Página de Redes' }],
  },
  {
    id: 'bat-2',
    title: 'Bateria de Algoritmos',
    description: 'Grafos e Árvores',
    layout: 'sequential',
    tags: ['algoritmos'],
    created_at: '2026-09-08T00:00:00.000Z',
    updated_at: '2026-09-08T00:00:00.000Z',
    questions: [
      {
        id: 'q2',
        battery_id: 'bat-2',
        type: 'open',
        question: 'O que é busca em largura?',
        options: [],
        correct_index: null,
        expected_answer: 'Usa fila',
        explanation: 'BFS usa fila FIFO',
        tags: ['algoritmos'],
        sort_order: 1,
        created_at: '2026-09-08T00:00:00.000Z',
        updated_at: '2026-09-08T00:00:00.000Z',
      },
    ],
    latestAttempts: {},
    linkedPages: [],
  },
];

describe('QuestionsExplorer Component', () => {
  it('renders battery list with titles and page origins', () => {
    const { getByText } = render(
      <QuestionsExplorer
        batteries={mockBatteries}
        onPlayBattery={vi.fn()}
        onEditBattery={vi.fn()}
        onDeleteBattery={vi.fn()}
        onNavigateToPage={vi.fn()}
        allAvailableTags={['redes', 'tcp', 'algoritmos']}
      />
    );

    expect(getByText('Bateria de Redes')).toBeDefined();
    expect(getByText('Página de Redes')).toBeDefined();
    expect(getByText('Bateria de Algoritmos')).toBeDefined();
    expect(getByText('Bateria Avulsa')).toBeDefined();
  });

  it('filters batteries by search term', () => {
    const { getByText, queryByText, getByPlaceholderText } = render(
      <QuestionsExplorer
        batteries={mockBatteries}
        onPlayBattery={vi.fn()}
        onEditBattery={vi.fn()}
        onDeleteBattery={vi.fn()}
        onNavigateToPage={vi.fn()}
        allAvailableTags={['redes', 'tcp', 'algoritmos']}
      />
    );

    const searchInput = getByPlaceholderText('Buscar por título, enunciado, tag ou comentário...');
    fireEvent.change(searchInput, { target: { value: 'Algoritmos' } });

    expect(getByText('Bateria de Algoritmos')).toBeDefined();
    expect(queryByText('Bateria de Redes')).toBeNull();
  });

  it('triggers onPlayBattery when clicking Praticar', () => {
    const onPlay = vi.fn();

    const { getAllByText } = render(
      <QuestionsExplorer
        batteries={mockBatteries}
        onPlayBattery={onPlay}
        onEditBattery={vi.fn()}
        onDeleteBattery={vi.fn()}
        onNavigateToPage={vi.fn()}
        allAvailableTags={['redes', 'tcp', 'algoritmos']}
      />
    );

    const playButtons = getAllByText('Praticar');
    fireEvent.click(playButtons[0]);

    expect(onPlay).toHaveBeenCalledWith(mockBatteries[0]);
  });

  it('triggers onNavigateToPage when clicking page origin badge', () => {
    const onNavigate = vi.fn();

    const { getByText } = render(
      <QuestionsExplorer
        batteries={mockBatteries}
        onPlayBattery={vi.fn()}
        onEditBattery={vi.fn()}
        onDeleteBattery={vi.fn()}
        onNavigateToPage={onNavigate}
        allAvailableTags={['redes', 'tcp', 'algoritmos']}
      />
    );

    fireEvent.click(getByText('Página de Redes'));
    expect(onNavigate).toHaveBeenCalledWith('page-1');
  });

  it('expands battery questions when toggled', () => {
    const { getByText, queryByText, getAllByTitle } = render(
      <QuestionsExplorer
        batteries={mockBatteries}
        onPlayBattery={vi.fn()}
        onEditBattery={vi.fn()}
        onDeleteBattery={vi.fn()}
        onNavigateToPage={vi.fn()}
        allAvailableTags={['redes', 'tcp', 'algoritmos']}
      />
    );

    expect(queryByText('Qual a porta do DNS?')).toBeNull();

    // Click expand button
    const expandBtn = getAllByTitle('Expandir questões')[0];
    fireEvent.click(expandBtn);

    expect(getByText('Qual a porta do DNS?')).toBeDefined();
  });

  it('shows confirmation modal before deleting battery and cancels properly', () => {
    const onDelete = vi.fn();
    const { getAllByTitle, getByText, queryByText } = render(
      <QuestionsExplorer
        batteries={mockBatteries}
        onPlayBattery={vi.fn()}
        onEditBattery={vi.fn()}
        onDeleteBattery={onDelete}
        onNavigateToPage={vi.fn()}
        allAvailableTags={['redes', 'tcp', 'algoritmos']}
      />
    );

    const deleteBtn = getAllByTitle('Mover para lixeira')[0];
    fireEvent.click(deleteBtn);

    // Modal should be open
    expect(getByText(/Deseja realmente mover a bateria/i)).toBeDefined();
    expect(onDelete).not.toHaveBeenCalled();

    // Click cancel
    const cancelBtn = getByText('Cancelar');
    fireEvent.click(cancelBtn);

    expect(queryByText(/Deseja realmente mover a bateria/i)).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('confirms deletion in modal and calls onDeleteBattery', () => {
    const onDelete = vi.fn();
    const { getAllByTitle, getByRole } = render(
      <QuestionsExplorer
        batteries={mockBatteries}
        onPlayBattery={vi.fn()}
        onEditBattery={vi.fn()}
        onDeleteBattery={onDelete}
        onNavigateToPage={vi.fn()}
        allAvailableTags={['redes', 'tcp', 'algoritmos']}
      />
    );

    const deleteBtn = getAllByTitle('Mover para lixeira')[0];
    fireEvent.click(deleteBtn);

    // Confirm button inside modal
    const confirmDeleteBtn = getByRole('button', { name: 'Excluir Bateria' });
    fireEvent.click(confirmDeleteBtn);

    expect(onDelete).toHaveBeenCalledWith('bat-1');
  });
});

