import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FileViewer from './FileViewer';
import type { FileItem } from '../../types';

vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    state: {
      moduleKeys: {},
    },
  }),
}));

vi.mock('../../utils/file-fetcher', () => ({
  getDecryptedFileUrl: vi.fn().mockResolvedValue('blob:http://localhost/test-blob'),
}));

describe('FileViewer Component', () => {
  const mockFileItem: FileItem = {
    id: 'f1',
    name: 'document.txt',
    file_type: 'text',
    file_size: 1024,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('renders file name and controls', async () => {
    render(<FileViewer item={mockFileItem} onClose={() => {}} />);
    expect(screen.getByText('document.txt')).toBeInTheDocument();
  });
});
