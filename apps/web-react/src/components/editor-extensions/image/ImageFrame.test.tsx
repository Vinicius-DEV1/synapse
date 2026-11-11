import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ImageFrame from './ImageFrame';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => (
    <div data-testid="image-node-view-wrapper" className={className}>
      {children}
    </div>
  ),
}));

describe('ImageFrame Component', () => {
  let mockEditor: any;
  let mockNode: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEditor = {
      isEditable: true,
      view: {
        state: { schema: { nodes: { paragraph: { create: vi.fn() } } } },
      },
    };

    mockNode = {
      attrs: {
        align: 'center',
        width: 300,
        height: 200,
        caption: 'Legenda da foto',
      },
    };
  });

  it('renders image element and handles double-click to open full viewer', () => {
    const onOpenViewer = vi.fn();
    const onRequestDelete = vi.fn();
    const updateAttributes = vi.fn();

    const { getByRole } = render(
      <ImageFrame
        editor={mockEditor}
        node={mockNode}
        getPos={() => 10}
        updateAttributes={updateAttributes}
        selected={false}
        src="https://example.com/photo.jpg"
        alt="Foto de teste"
        title="Título da imagem"
        downloadName="foto_teste"
        onOpenViewer={onOpenViewer}
        onRequestDelete={onRequestDelete}
      />
    );

    const img = getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/photo.jpg');

    fireEvent.doubleClick(img);
    expect(onOpenViewer).toHaveBeenCalled();
  });
});
