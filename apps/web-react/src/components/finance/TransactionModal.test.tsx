import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import TransactionModal from './TransactionModal';
import { I18nProvider } from '../../i18n';

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLanguage="pt-BR">{ui}</I18nProvider>);

vi.mock('../ui/Portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => <div data-testid="tx-portal">{children}</div>,
}));

describe('TransactionModal Component', () => {
  it('submits new transaction form and calls onSave', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { getByPlaceholderText, getAllByRole, getByRole } = renderWithI18n(
      <TransactionModal onClose={onClose} onSave={onSave} />
    );

    const descInput = getByPlaceholderText(/Supermercado/i);
    const comboboxes = getAllByRole('combobox');
    const categorySelect = comboboxes[comboboxes.length - 1]; // Category is the last select
    const amountInput = getByPlaceholderText('0.00');

    fireEvent.change(descInput, { target: { value: 'Gasolina' } });
    fireEvent.change(categorySelect, { target: { value: 'Transporte' } });
    fireEvent.change(amountInput, { target: { value: '250.00' } });

    const submitBtn = getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Gasolina',
          amount: 250,
          type: 'expense',
          category: 'Transporte',
          is_paid: 1,
          status: 'completed',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('submits pending future transaction with is_paid: 0 and status: pending', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { getByPlaceholderText, getByRole, getByLabelText } = renderWithI18n(
      <TransactionModal onClose={onClose} onSave={onSave} />
    );

    const descInput = getByPlaceholderText(/Supermercado/i);
    const amountInput = getByPlaceholderText('0.00');
    const pendingCheckbox = getByRole('checkbox');

    fireEvent.change(descInput, { target: { value: 'Exame de Sangue' } });
    fireEvent.change(amountInput, { target: { value: '180.00' } });
    fireEvent.click(pendingCheckbox);

    const submitBtn = getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Exame de Sangue',
          amount: 180,
          type: 'expense',
          is_paid: 0,
          status: 'pending',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('allows submitting transaction and loan with amount 0 (zero)', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { getByPlaceholderText, getByRole } = renderWithI18n(
      <TransactionModal onClose={onClose} onSave={onSave} defaultType="loan_made" />
    );

    const descInput = getByPlaceholderText(/Ajuda com conserto/i);
    const amountInput = getByPlaceholderText('0.00');

    fireEvent.change(descInput, { target: { value: 'Empréstimo sem valor inicial' } });
    fireEvent.change(amountInput, { target: { value: '0' } });

    const submitBtn = getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Empréstimo sem valor inicial',
          amount: 0,
          type: 'loan_made',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('captures person/contact field for loans and submits correctly', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { getByPlaceholderText, getByRole } = renderWithI18n(
      <TransactionModal onClose={onClose} onSave={onSave} defaultType="loan_made" />
    );

    const personInput = getByPlaceholderText(/João Silva/i);
    const descInput = getByPlaceholderText(/Ajuda com conserto/i);
    const amountInput = getByPlaceholderText('0.00');

    fireEvent.change(personInput, { target: { value: 'João Silva' } });
    fireEvent.change(descInput, { target: { value: 'Conserto do Carro' } });
    fireEvent.change(amountInput, { target: { value: '500.00' } });

    const submitBtn = getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          person: 'João Silva',
          description: 'Conserto do Carro',
          amount: 500,
          type: 'loan_made',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('displays contact suggestions and fills input upon clicking suggestion pill', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { getByText, getByPlaceholderText } = renderWithI18n(
      <TransactionModal
        onClose={onClose}
        onSave={onSave}
        defaultType="loan_made"
        existingPersons={['João Silva', 'Maria Clara']}
      />
    );

    // Suggestion chip should be rendered
    const joaoChip = getByText('João Silva');
    expect(joaoChip).toBeInTheDocument();

    // Clicking chip fills person input
    fireEvent.click(joaoChip);
    const personInput = getByPlaceholderText(/João Silva/i) as HTMLInputElement;
    expect(personInput.value).toBe('João Silva');
  });

  it('normalizes person input casing to match existing contact on submit', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { getByPlaceholderText, getByRole } = renderWithI18n(
      <TransactionModal
        onClose={onClose}
        onSave={onSave}
        defaultType="loan_made"
        existingPersons={['João Silva']}
      />
    );

    const personInput = getByPlaceholderText(/João Silva/i);
    const amountInput = getByPlaceholderText('0.00');

    // Type in lowercase without proper accents/casing
    fireEvent.change(personInput, { target: { value: 'joao silva' } });
    fireEvent.change(amountInput, { target: { value: '150.00' } });

    const submitBtn = getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          person: 'João Silva', // Normalized to existing registered contact
          description: 'João Silva',
          amount: 150,
          type: 'loan_made',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
