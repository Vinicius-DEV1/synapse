import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import EncryptedImage from './EncryptedImage';
import * as imageDrive from '../../services/image-drive';

vi.mock('../../store/useStore', () => ({
  getNotesKey: vi.fn(),
}));

vi.mock('../../services/image-drive', () => ({
  getDecryptedImageUrl: vi.fn().mockResolvedValue('blob:http://localhost/decrypted-image-123'),
  uploadEncryptedImage: vi.fn().mockResolvedValue('uploaded-drive-id'),
  getCachedImage: vi.fn().mockResolvedValue(null),
  deleteEncryptedImage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => (
    <div data-testid="encrypted-image-wrapper" className={className}>
      {children}
    </div>
  ),
  ReactNodeViewRenderer: (component: any) => component,
}));

vi.mock('./image/ImageFrame', () => ({
  default: ({ src }: any) => <div data-testid="image-frame">ImageFrame: {src}</div>,
}));

describe('EncryptedImage Extension & NodeView', () => {
  let mockProps: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProps = {
      node: {
        attrs: {
          driveFileId: 'drive_file_abc_123',
          width: 400,
          height: 300,
          caption: 'Foto confidencial',
          alt: 'Foto criptografada',
        },
      },
      editor: {
        isEditable: true,
        view: { state: { selection: { from: 0 } } },
      },
      updateAttributes: vi.fn(),
      getPos: () => 10,
    };
  });

  it('renders locked message when note master key is missing', () => {
    const Component = (EncryptedImage.config.addNodeView as any)();
    const { getByText } = render(<Component {...mockProps} />);

    expect(
      getByText(/Cofre de notas bloqueado — desbloqueie para ver a imagem/i)
    ).toBeDefined();
  });
});
