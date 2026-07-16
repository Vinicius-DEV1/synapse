import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { useState, useRef } from 'react';

const ResizableImageNodeView = (props: any) => {
  const { node, updateAttributes, selected } = props;
  const [isResizing, setIsResizing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = imgRef.current?.offsetWidth || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const diff = currentX - startX;
      // Se for a alça da direita, arrastar para a direita aumenta (diff positivo)
      // Se for a alça da esquerda, arrastar para a esquerda aumenta (diff negativo)
      const newWidth = Math.max(50, startWidth + (direction === 'right' ? diff : -diff)); 
      updateAttributes({ width: newWidth });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <NodeViewWrapper className={`inline-block relative max-w-full m-1 align-bottom ${isResizing ? 'select-none' : ''}`}>
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt}
        title={node.attrs.title}
        width={node.attrs.width}
        style={{ width: node.attrs.width ? `${node.attrs.width}px` : 'auto', height: 'auto', maxWidth: '100%' }}
        className={`rounded-md border border-white/10 cursor-pointer transition-shadow ${selected ? 'ring-2 ring-brand-500' : 'hover:ring-2 hover:ring-brand-500/50'}`}
        draggable="true"
        data-drag-handle
      />

      {(selected || isResizing) && (
        <>
          {/* Top-Left */}
          <div className="absolute left-0 top-0 w-3 h-3 bg-brand-500 rounded-full border border-white cursor-nwse-resize z-10 -translate-x-1/2 -translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'left')} />
          {/* Top-Right */}
          <div className="absolute right-0 top-0 w-3 h-3 bg-brand-500 rounded-full border border-white cursor-nesw-resize z-10 translate-x-1/2 -translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'right')} />
          {/* Bottom-Left */}
          <div className="absolute left-0 bottom-0 w-3 h-3 bg-brand-500 rounded-full border border-white cursor-nesw-resize z-10 -translate-x-1/2 translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'left')} />
          {/* Bottom-Right */}
          <div className="absolute right-0 bottom-0 w-3 h-3 bg-brand-500 rounded-full border border-white cursor-nwse-resize z-10 translate-x-1/2 translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'right')} />
        </>
      )}
    </NodeViewWrapper>
  );
};

export const ResizableImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px`
          };
        }
      }
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  }
});
