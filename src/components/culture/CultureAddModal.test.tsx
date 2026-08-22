import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import CultureAddModal from './CultureAddModal';
import { CultureService } from '../../services/culture';

vi.mock('../ui/Portal', () => ({
  Portal: ({ children }: any) => <div data-testid="culture-portal">{children}</div>,
}));

vi.mock('../../services/culture', () => ({
  CultureService: {
    createItem: vi.fn().mockResolvedValue({ id: 'new_cult_1' }),
    updateItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('./hooks/useCultureMediaSearch', () => ({
  useCultureMediaSearch: vi.fn(() => ({
    searchQuery: '',
    setSearchQuery: vi.fn(),
    searchResults: [],
    isSearching: false,
    handleSearch: vi.fn(),
    clearResults: vi.fn(),
  })),
}));

describe('CultureAddModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits new media item and calls onSuccess and onClose', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    const { getByPlaceholderText, getByRole } = render(
      <CultureAddModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />
    );

    const titleInput = getByPlaceholderText('Nome da mídia');
    fireEvent.change(titleInput, { target: { value: 'Interestelar' } });

    const saveBtn = getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(CultureService.createItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Interestelar',
          type: 'filme',
        })
      );
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
