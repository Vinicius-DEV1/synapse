import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CategorySelect } from './CategorySelect';
import { I18nProvider } from '../../../i18n';

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLanguage="pt-BR">{ui}</I18nProvider>);

describe('CategorySelect Component', () => {
  it('renders category options and handles selection', () => {
    const onChange = vi.fn();
    const { getByRole } = renderWithI18n(
      <CategorySelect value="Geral" onChange={onChange} />
    );

    const select = getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('Geral');

    fireEvent.change(select, { target: { value: 'Alimentação' } });
    expect(onChange).toHaveBeenCalledWith('Alimentação');
  });

  it('allows creating a new custom category via add button', () => {
    const onChange = vi.fn();
    const { getByTitle, getByPlaceholderText } = renderWithI18n(
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
