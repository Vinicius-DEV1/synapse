import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { getDecryptedImageUrl, uploadEncryptedImage, getCachedImage } from '../../services/image-drive';

// ─── Componente de NodeView para imagens encriptadas ───────────────────────────

type LoadingState = 'loading' | 'loaded' | 'error';

const EncryptedImageNodeView = (props: any) => {
  const { node, updateAttributes, selected, editor, getPos, deleteNode } = props;
  const { driveFileId, width, height, caption, alt } = node.attrs;

  const [state, setState] = useState<LoadingState>('loading');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const handleDragStart = (e: React.DragEvent) => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      e.dataTransfer.setDragImage(imgRef.current, x, y);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (editor && typeof getPos === 'function') {
      editor.commands.setNodeSelection(getPos());
    }
  };

  // Obtém a chave mestra do módulo de notas
  const { state: storeState } = useStore();
  const masterKey = storeState.moduleKeys['notes'];

  // Carrega e descriptografa a imagem do Google Drive, ou faz o upload se for um paste novo
  const loadImage = useCallback(async () => {
    if (!driveFileId || !masterKey) {
      setState('error');
      return;
    }

    setState('loading');

    // Revoga URL anterior se existir
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    try {
      // Se for um upload recém-colado
      if (driveFileId.startsWith('uploading_')) {
        let file = window.__pendingImageUploads?.get(driveFileId);
        
        // Se a página foi recarregada e perdemos o file da memória,
        // tentamos recuperar do cache local!
        if (!file) {
          const cached = await getCachedImage(driveFileId);
          if (cached) {
            file = new File([cached.data], 'image-recovered', { type: cached.mimeType });
          }
        }

        if (!file) {
          throw new Error('File lost from memory and cache.');
        }

        if (file) {
          const realDriveId = await uploadEncryptedImage(file, masterKey);
          if (window.__pendingImageUploads) {
            window.__pendingImageUploads.delete(driveFileId);
          }
          // O updateAttributes fará com que o TipTap/React renderize novamente com o novo ID
          updateAttributes({ driveFileId: realDriveId });
          return; // A próxima renderização fará o download da URL limpa ou usará cache
        } else {
          throw new Error("Upload interrompido ou imagem perdida (fechou o app antes de concluir).");
        }
      }

      const url = await getDecryptedImageUrl(driveFileId, masterKey);
      blobUrlRef.current = url;
      setBlobUrl(url);
      setState('loaded');
    } catch (err) {
      console.error('[EncryptedImage] Erro ao carregar/upload da imagem:', err);
      setState('error');
    }
  }, [driveFileId, masterKey, updateAttributes]);

  useEffect(() => {
    loadImage();

    // Limpa blob URL ao desmontar o componente
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [loadImage]);

  // ─── Lógica de redimensionamento (idêntica ao ResizableImage) ──────────────

  const handleMouseDown = (e: React.MouseEvent, handle: 'bottom-right' | 'right' | 'left' | 'bottom' | 'top') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

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
        newHeight = null;
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
      detail: { src: blobUrl, nodePos: typeof getPos === 'function' ? getPos() : null } 
    });
    window.dispatchEvent(event);
  };

  // ─── Estilos compartilhados ────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    width: width ? `${width}px` : '100%',
    maxWidth: '100%',
    height: height ? `${height}px` : 'auto',
  };

  // ─── Estado de carregamento — skeleton animado ─────────────────────────────

  if (state === 'loading') {
    return (
      <NodeViewWrapper className="inline-block relative max-w-full m-1 align-bottom">
        <div
          className="rounded overflow-hidden"
          style={{ ...containerStyle, minHeight: '160px' }}
        >
          <div
            className="relative w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-3 rounded"
            style={{
              background: 'linear-gradient(110deg, #1e1e2e 8%, #2a2a3e 18%, #1e1e2e 33%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s linear infinite',
            }}
          >
            {/* Ícone de spinner */}
            <svg
              className="animate-spin h-6 w-6 text-brand-400 opacity-70"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-xs text-zinc-400 select-none">
              Carregando imagem...
            </span>
          </div>
        </div>

        {/* Animação de shimmer via style tag inline */}
        <style>{`
          @keyframes shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </NodeViewWrapper>
    );
  }

  // ─── Estado de erro ────────────────────────────────────────────────────────

  if (state === 'error') {
    return (
      <NodeViewWrapper className="inline-block relative max-w-full m-1 align-bottom">
        <div
          className="rounded overflow-hidden border border-red-800/40"
          style={{ ...containerStyle, minHeight: '120px' }}
        >
          <div
            className="w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-3 rounded"
            style={{
              background: 'linear-gradient(135deg, #1c1017 0%, #2a1520 50%, #1c1017 100%)',
            }}
          >
            {/* Ícone de erro */}
            <svg
              className="h-7 w-7 text-red-400/80"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>

            <span className="text-xs text-red-300/80 select-none">
              Erro ao carregar imagem
            </span>

            <button
              onClick={loadImage}
              className="px-3 py-1 text-xs rounded-md bg-red-900/40 text-red-200 hover:bg-red-800/50 transition-colors cursor-pointer border border-red-700/30"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // ─── Imagem carregada com sucesso ──────────────────────────────────────────

  return (
    <NodeViewWrapper className={`inline-block relative max-w-full m-1 align-bottom ${isResizing ? 'select-none' : ''}`}>
      <img
        ref={imgRef}
        src={blobUrl!}
        alt={alt || ''}
        width={width}
        height={height}
        style={{ width: width ? `${width}px` : 'auto', height: height ? `${height}px` : 'auto', maxWidth: '100%' }}
        className={`rounded-md border border-white/10 cursor-pointer transition-shadow ${selected ? 'ring-2 ring-brand-500' : 'hover:ring-2 hover:ring-brand-500/50'}`}
        draggable="true"
        data-drag-handle
        onDragStart={handleDragStart}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
      />

      {/* Alças de redimensionamento */}
      {(selected || isResizing) && (
        <>
          <div className="absolute right-0 bottom-0 w-3 h-3 bg-brand-500 rounded-full border border-white cursor-nwse-resize z-10 translate-x-1/2 translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'bottom-right')} />
          <div className="absolute right-0 top-1/2 w-1.5 h-4 bg-brand-500 rounded-sm border border-white cursor-ew-resize z-10 translate-x-1/2 -translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'right')} />
          <div className="absolute left-0 top-1/2 w-1.5 h-4 bg-brand-500 rounded-sm border border-white cursor-ew-resize z-10 -translate-x-1/2 -translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'left')} />
          <div className="absolute bottom-0 left-1/2 w-4 h-1.5 bg-brand-500 rounded-sm border border-white cursor-ns-resize z-10 -translate-x-1/2 translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'bottom')} />
          <div className="absolute top-0 left-1/2 w-4 h-1.5 bg-brand-500 rounded-sm border border-white cursor-ns-resize z-10 -translate-x-1/2 -translate-y-1/2 shadow-sm" onMouseDown={(e) => handleMouseDown(e, 'top')} />
        </>
      )}

      {/* Toolbar Flutuante */}
      {selected && !isResizing && (
        <div className="absolute top-2 right-2 flex gap-1 bg-dark-bg/90 backdrop-blur-xl border border-white/10 rounded-lg p-1 shadow-2xl z-20" contentEditable={false}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!blobUrl) return;
              fetch(blobUrl).then(res => res.blob()).then(blob => {
                navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
              }).catch(err => console.error(err));
            }}
            className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-colors"
            title="Copiar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
          <a
            href={blobUrl!}
            download={`imagem_secreta-${Date.now()}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-colors flex items-center justify-center"
            title="Baixar Original"
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
      {(selected || caption) && (
        <div className="mt-2 w-full flex justify-center" contentEditable={false}>
          <input
            type="text"
            value={caption || ''}
            onChange={(e) => updateAttributes({ caption: e.target.value })}
            placeholder="Escreva uma legenda..."
            className="w-full max-w-sm text-center bg-transparent text-sm text-dark-subtext focus:text-white border-none focus:outline-none focus:ring-1 focus:ring-brand-500/50 rounded px-2 py-1 placeholder-white/20"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};

// ─── Definição do Node TipTap ────────────────────────────────────────────────

export const EncryptedImage = Node.create({
  name: 'encryptedImage',

  inline: true,
  group: 'inline',

  atom: true,
  draggable: true,

  addAttributes() {
    return {
      driveFileId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-drive-file-id'),
        renderHTML: (attributes) => {
          if (!attributes.driveFileId) return {};
          return { 'data-drive-file-id': attributes.driveFileId };
        },
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-width');
          return val ? Number(val) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { 'data-width': attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-height');
          return val ? Number(val) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { 'data-height': attributes.height };
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
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-alt'),
        renderHTML: (attributes) => {
          if (!attributes.alt) return {};
          return { 'data-alt': attributes.alt };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'encrypted-image' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['encrypted-image', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EncryptedImageNodeView);
  },
});
