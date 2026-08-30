import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CategorySelect } from './CategorySelect';

describe('CategorySelect Component', () => {
  it('renders category options and handles selection', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <CategorySelect value="Geral" onChange={onChange} />
    );

    const select = getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('Geral');

    fireEvent.change(select, { target: { value: 'Alimentação' } });
    expect(onChange).toHaveBeenCalledWith('Alimentação');
  });

  it('allows creating a new custom category via add button', () => {
    const onChange = vi.fn();
    const { getByTitle, getByPlaceholderText } = render(
      <CategorySelect value="Geral" onChange={onChange} />
    );

    const addBtn = getByTitle('Adicionar nova categoria');
    fireEvent.click(addBtn);

    const input = getByPlaceholderText('Nova categoria...');
    fireEvent.change(input, { target: { value: 'Pets & Animais' } });

    const saveBtn = getByTitle('Salvar Categoria');
    fireEvent.click(saveBtn);

    expect(onChange).toHaveBeenCalledWith('Pets & Animais');
  });
});
