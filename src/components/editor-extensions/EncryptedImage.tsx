import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { getDecryptedImageUrl, uploadEncryptedImage, getCachedImage } from '../../services/image-drive';

// ─── Componente de NodeView para imagens encriptadas ───────────────────────────

type LoadingState = 'loading' | 'loaded' | 'error';

const EncryptedImageNodeView = (props: any) => {
  const { node, updateAttributes, selected } = props;
  const { driveFileId, width, alt } = node.attrs;

  const [state, setState] = useState<LoadingState>('loading');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Obtém a chave mestra do módulo de notas
  const { state: storeState } = useStore();
  const masterKey = storeState.moduleKeys['notes'];

  // Carrega e descriptografa a imagem do Google Drive, ou faz o upload se for um paste novo
  const loadImage = useCallback(async () => {
    if (!driveFileId || !masterKey) return;

    setState('loading');

    // Revoga URL anterior se existir
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    try {
      // Se for um upload recém-colado
      if (driveFileId.startsWith('uploading_')) {
        let file = (window as any).__pendingImageUploads?.get(driveFileId);
        
        // Se a página foi recarregada e perdemos o file da memória,
        // tentamos recuperar do cache local!
        if (!file) {
          const cached = await getCachedImage(driveFileId);
          if (cached) {
            file = new File([cached.data], 'image-recovered', { type: cached.mimeType });
          }
        }

        if (file) {
          const realDriveId = await uploadEncryptedImage(file, masterKey);
          if ((window as any).__pendingImageUploads) {
            (window as any).__pendingImageUploads.delete(driveFileId);
          }
          // O updateAttributes fará com que o TipTap/React renderize novamente com o novo ID
          updateAttributes({ driveFileId: realDriveId });
          return; // A próxima renderização fará o download da URL limpa ou usará cache
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = imgRef.current?.offsetWidth || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const diff = currentX - startX;
      const newWidth = Math.max(50, startWidth + diff);
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

  // ─── Estilos compartilhados ────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    width: width ? `${width}px` : '100%',
    maxWidth: '100%',
    height: 'auto',
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
        style={{ width: width ? `${width}px` : 'auto', height: 'auto', maxWidth: '100%' }}
        className={`rounded cursor-pointer transition-shadow ${selected ? 'ring-2 ring-brand-500' : 'hover:ring-2 hover:ring-brand-500/50'}`}
        draggable="true"
        data-drag-handle
      />

      {/* Alça de redimensionamento */}
      {(selected || isResizing) && (
        <div
          className="absolute right-0 bottom-0 w-4 h-4 bg-brand-500 rounded-full border-2 border-white cursor-nwse-resize z-10 translate-x-1/2 translate-y-1/2 shadow-sm"
          onMouseDown={handleMouseDown}
        />
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
