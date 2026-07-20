import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { useState, useRef } from 'react';

const ResizableImageNodeView = (props: any) => {
  const { node, updateAttributes, selected, editor, getPos } = props;
  const [isResizing, setIsResizing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent, handle: 'bottom-right' | 'right' | 'left' | 'bottom' | 'top') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    // Isolar a seleção na imagem atual
    if (editor && typeof getPos === 'function') {
      editor.commands.setNodeSelection(getPos());
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = imgRef.current?.offsetWidth || 0;
    const startHeight = imgRef.current?.offsetHeight || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diffX = moveEvent.clientX - startX;
      const diffY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight: number | null = startHeight;

      if (handle === 'bottom-right') {
        newWidth = Math.max(50, startWidth + diffX);
        newHeight = null; // Proporcional
      } else if (handle === 'right') {
        newWidth = Math.max(50, startWidth + diffX);
      } else if (handle === 'left') {
        newWidth = Math.max(50, startWidth - diffX);
      } else if (handle === 'bottom') {
        newHeight = Math.max(50, startHeight + diffY);
      } else if (handle === 'top') {
        newHeight = Math.max(50, startHeight - diffY);
      }

      if (handle === 'right' || handle === 'left') {
        newHeight = startHeight;
      }
      if (handle === 'bottom' || handle === 'top') {
        newWidth = startWidth;
      }

      updateAttributes({ 
        width: newWidth,
        height: newHeight
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const event = new CustomEvent('open-image-viewer', { 
      detail: { src: node.attrs.src, nodePos: typeof getPos === 'function' ? getPos() : null } 
    });
    window.dispatchEvent(event);
  };

  return (
    <NodeViewWrapper className={`inline-block relative max-w-full m-1 align-bottom ${isResizing ? 'select-none' : ''}`}>
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt}
        title={node.attrs.title}
        width={node.attrs.width}
        height={node.attrs.height}
        style={{ width: node.attrs.width ? `${node.attrs.width}px` : 'auto', height: node.attrs.height ? `${node.attrs.height}px` : 'auto', maxWidth: '100%' }}
        className={`rounded-md border border-white/10 cursor-pointer transition-shadow ${selected ? 'ring-2 ring-brand-500' : 'hover:ring-2 hover:ring-brand-500/50'}`}
        draggable="true"
        data-drag-handle
        onDoubleClick={handleDoubleClick}
      />

      {(selected || isResizing) && (
        <>
          {/* Canto Inferior Direito (Proporcional) */}
          <div className="absolute right-0 bottom-0 w-3 h-3 bg-brand-500 rounded-full border border-white cursor-nwse-resize z-10 translate-x-1/2 translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'bottom-right')} />
          
          {/* Lateral Direita (Largura) */}
          <div className="absolute right-0 top-1/2 w-1.5 h-4 bg-brand-500 rounded-sm border border-white cursor-ew-resize z-10 translate-x-1/2 -translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'right')} />
          
          {/* Lateral Esquerda (Largura) */}
          <div className="absolute left-0 top-1/2 w-1.5 h-4 bg-brand-500 rounded-sm border border-white cursor-ew-resize z-10 -translate-x-1/2 -translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'left')} />
          
          {/* Base (Altura) */}
          <div className="absolute bottom-0 left-1/2 w-4 h-1.5 bg-brand-500 rounded-sm border border-white cursor-ns-resize z-10 -translate-x-1/2 translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'bottom')} />
          
          {/* Topo (Altura) */}
          <div className="absolute top-0 left-1/2 w-4 h-1.5 bg-brand-500 rounded-sm border border-white cursor-ns-resize z-10 -translate-x-1/2 -translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'top')} />
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
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return {
            height: attributes.height,
            style: `height: ${attributes.height}px`
          };
        }
      }
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  }
});
