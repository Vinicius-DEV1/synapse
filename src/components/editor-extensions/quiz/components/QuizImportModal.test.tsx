import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import QuizImportModal from './QuizImportModal';

describe('QuizImportModal Component', () => {
  it('parses valid JSON array and previews imported questions', () => {
    const onClose = vi.fn();
    const onImport = vi.fn();

    const { getByPlaceholderText, getByText } = render(
      <QuizImportModal isOpen={true} onClose={onClose} onImport={onImport} />
    );

    const validJson = JSON.stringify([
      {
        question: 'Qual o principal gás do efeito estufa?',
        options: ['Oxigênio', 'Dióxido de Carbono', 'Hélio', 'Nitrogênio'],
        correct_option: 1,
        explanation: 'CO2 é o gás primário emitido por atividades humanas.',
      },
    ]);

    const textarea = getByPlaceholderText(/Cole aqui o JSON das questões/i);
    fireEvent.change(textarea, { target: { value: validJson } });

    const processBtn = getByText(/Interpretar JSON e Ver Preview/i);
    fireEvent.click(processBtn);

    expect(getByText(/Qual o principal gás do efeito estufa\?/i)).toBeDefined();

    const confirmImportBtn = getByText(/Confirmar Importação/i);
    fireEvent.click(confirmImportBtn);

    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          question: 'Qual o principal gás do efeito estufa?',
          correctIndex: 1,
        }),
      ]),
      'append'
    );
  });
});
