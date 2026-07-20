import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { useState, useRef } from 'react';

const ResizableImageNodeView = (props: any) => {
  const { node, updateAttributes, selected, editor, getPos, deleteNode } = props;
  const [isResizing, setIsResizing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const clone = imgRef.current.cloneNode(true) as HTMLImageElement;
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.classList.remove('ring-2', 'ring-brand-500');
      
      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, x, y);

      setTimeout(() => {
        if (document.body.contains(clone)) {
          document.body.removeChild(clone);
        }
      }, 0);
    }
  };

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
        onDragStart={handleDragStart}
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

      {/* Toolbar Flutuante */}
      {selected && !isResizing && (
        <div className="absolute top-2 right-2 flex gap-1 bg-dark-bg/90 backdrop-blur-xl border border-white/10 rounded-lg p-1 shadow-2xl z-20" contentEditable={false}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetch(node.attrs.src).then(res => res.blob()).then(blob => {
                navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
              }).catch(err => console.error(err));
            }}
            className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-colors"
            title="Copiar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
          <a
            href={node.attrs.src}
            download={`image-${Date.now()}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-colors flex items-center justify-center"
            title="Baixar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof deleteNode === 'function') deleteNode();
            }}
            className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-red-400 transition-colors"
            title="Deletar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
          </button>
        </div>
      )}

      {/* Legenda (Caption) */}
      {(selected || node.attrs.caption) && (
        <div className="mt-2 w-full flex justify-center" contentEditable={false}>
          <input
            type="text"
            value={node.attrs.caption || ''}
            onChange={(e) => updateAttributes({ caption: e.target.value })}
            placeholder="Escreva uma legenda..."
            className="w-full max-w-sm text-center bg-transparent text-sm text-dark-subtext focus:text-white border-none focus:outline-none focus:ring-1 focus:ring-brand-500/50 rounded px-2 py-1 placeholder-white/20"
          />
        </div>
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
      },
      caption: {
        default: '',
        parseHTML: element => element.getAttribute('data-caption'),
        renderHTML: attributes => {
          if (!attributes.caption) return {};
          return { 'data-caption': attributes.caption };
        }
      }
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  }
});
