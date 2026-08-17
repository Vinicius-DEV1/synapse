import { ReactNodeViewRenderer } from '@tiptap/react';
import { Image as TiptapImage } from '@tiptap/extension-image';
import ImageFrame from './image/ImageFrame';
import { safePos } from './image/imageUtils';

const ResizableImageNodeView = (props: any) => {
  const { node, updateAttributes, selected, editor, getPos } = props;

  const openViewer = () => {
    window.dispatchEvent(
      new CustomEvent('open-image-viewer', {
        detail: { src: node.attrs.src, nodePos: safePos(getPos), nodeType: node.type.name },
      })
    );
  };

  const requestDelete = () => {
    window.dispatchEvent(
      new CustomEvent('request-image-delete', {
        detail: { pos: safePos(getPos), node },
      })
    );
  };

  return (
    <ImageFrame
      editor={editor}
      node={node}
      getPos={getPos}
      updateAttributes={updateAttributes}
      selected={selected}
      src={node.attrs.src}
      alt={node.attrs.alt}
      title={node.attrs.title}
      downloadName="imagem"
      onOpenViewer={openViewer}
      onRequestDelete={requestDelete}
    />
  );
};

export const ResizableImage = TiptapImage.extend({
  // Imagens são blocos: isso permite alinhamento, colunas e arrastar como bloco.
  inline: false,
  group: 'block',
  draggable: true,

  addOptions() {
    const parentOptions = this.parent?.();
    return {
      ...parentOptions,
      inline: parentOptions?.inline ?? false,
      allowBase64: true,
    } as any;
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('width');
          return value ? Number(value) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('height');
          return value ? Number(value) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption'),
        renderHTML: (attributes) => {
          if (!attributes.caption) return {};
          return { 'data-caption': attributes.caption };
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => {
          if (!attributes.align || attributes.align === 'center') return {};
          return { 'data-align': attributes.align };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});
