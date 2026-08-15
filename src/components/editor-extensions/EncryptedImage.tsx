import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { getDecryptedImageUrl, uploadEncryptedImage, getCachedImage } from '../../services/image-drive';
import ImageFrame from './image/ImageFrame';
import { alignToClass, normalizeAlign, safePos } from './image/imageUtils';

// ─── Componente de NodeView para imagens encriptadas ───────────────────────────

type LoadingState = 'loading' | 'loaded' | 'error';

/** Largura usada pelos placeholders quando a imagem ainda não tem tamanho definido. */
const PLACEHOLDER_WIDTH = 320;

const EncryptedImageNodeView = (props: any) => {
  const { node, updateAttributes, selected, editor, getPos } = props;
  const { driveFileId, width, height, caption, alt } = node.attrs;
  const align = normalizeAlign(node.attrs.align);

  const [state, setState] = useState<LoadingState>('loading');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const blobUrlRef = useRef<string | null>(null);
  // Evita que o mesmo tempId seja enviado duas vezes se o efeito reexecutar.
  const uploadingRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Obtém a chave mestra do módulo de notas
  const { state: storeState } = useStore();
  const masterKey = storeState.moduleKeys['notes'];

  // Carrega e descriptografa a imagem do Google Drive, ou faz o upload se for um paste novo
  const loadImage = useCallback(async () => {
    if (!driveFileId || !masterKey) {
      setErrorMessage(
        !driveFileId ? 'Imagem sem identificador.' : 'Cofre de notas bloqueado — desbloqueie para ver a imagem.'
      );
      setState('error');
      return;
    }

    setState('loading');
    setErrorMessage(null);

    // Revoga URL anterior se existir
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    try {
      // Se for um upload recém-colado
      if (driveFileId.startsWith('uploading_')) {
        if (uploadingRef.current === driveFileId) return;
        uploadingRef.current = driveFileId;

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
          throw new Error('Upload interrompido: a imagem foi perdida antes de ser enviada.');
        }

        const realDriveId = await uploadEncryptedImage(file, masterKey);
        window.__pendingImageUploads?.delete(driveFileId);
        uploadingRef.current = null;

        if (!mountedRef.current) return;
        // O updateAttributes fará com que o TipTap/React renderize novamente com o novo ID
        updateAttributes({ driveFileId: realDriveId });
        return; // A próxima renderização fará o download da URL limpa ou usará cache
      }

      const url = await getDecryptedImageUrl(driveFileId, masterKey);

      // O node view pode ter sido destruído durante o download.
      if (!mountedRef.current) {
        URL.revokeObjectURL(url);
        return;
      }

      blobUrlRef.current = url;
      setBlobUrl(url);
      setState('loaded');
    } catch (err) {
      console.error('[EncryptedImage] Erro ao carregar/upload da imagem:', err);
      uploadingRef.current = null;
      if (!mountedRef.current) return;
      setErrorMessage(err instanceof Error ? err.message : 'Erro desconhecido.');
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

  const openViewer = () => {
    window.dispatchEvent(
      new CustomEvent('open-image-viewer', {
        detail: { src: blobUrl, nodePos: safePos(getPos), nodeType: node.type.name },
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

  // ─── Estilos compartilhados dos placeholders ───────────────────────────────
  // Importante: usar largura fixa. `width: 100%` dentro de um wrapper `w-fit`
  // colapsa para zero e o skeleton some.
  const placeholderStyle: React.CSSProperties = {
    width: width ? `${width}px` : `${PLACEHOLDER_WIDTH}px`,
    maxWidth: '100%',
    height: height ? `${height}px` : undefined,
  };

  const placeholderWrapperClass = `image-node block relative w-fit max-w-full my-3 ${alignToClass(align)}`;

  // ─── Estado de carregamento — skeleton animado ─────────────────────────────

  if (state === 'loading') {
    return (
      <NodeViewWrapper as="div" data-align={align} className={placeholderWrapperClass}>
        <div className="rounded-md overflow-hidden border border-white/5" style={{ ...placeholderStyle, minHeight: '160px' }}>
          <div
            className="relative w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(110deg, #1e1e2e 8%, #2a2a3e 18%, #1e1e2e 33%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s linear infinite',
            }}
          >
            <svg className="animate-spin h-6 w-6 text-brand-400 opacity-70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-zinc-400 select-none">
              {driveFileId?.startsWith('uploading_') ? 'Enviando imagem...' : 'Carregando imagem...'}
            </span>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // ─── Estado de erro ────────────────────────────────────────────────────────

  if (state === 'error' || !blobUrl) {
    return (
      <NodeViewWrapper as="div" data-align={align} className={placeholderWrapperClass}>
        <div className="rounded-md overflow-hidden border border-red-800/40" style={{ ...placeholderStyle, minHeight: '120px' }}>
          <div
            className="w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-3 px-4 text-center"
            style={{ background: 'linear-gradient(135deg, #1c1017 0%, #2a1520 50%, #1c1017 100%)' }}
          >
            <svg className="h-7 w-7 text-red-400/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>

            <span className="text-xs text-red-300/80 select-none">{errorMessage || 'Erro ao carregar imagem'}</span>

            <div className="flex items-center gap-2">
              <button
                onClick={loadImage}
                className="px-3 py-1 text-xs rounded-md bg-red-900/40 text-red-200 hover:bg-red-800/50 transition-colors cursor-pointer border border-red-700/30"
              >
                Tentar novamente
              </button>
              {editor?.isEditable && (
                <button
                  onClick={requestDelete}
                  className="px-3 py-1 text-xs rounded-md bg-white/5 text-dark-subtext hover:bg-white/10 hover:text-white transition-colors cursor-pointer border border-white/10"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // ─── Imagem carregada com sucesso ──────────────────────────────────────────

  return (
    <ImageFrame
      editor={editor}
      node={node}
      getPos={getPos}
      updateAttributes={updateAttributes}
      selected={selected}
      src={blobUrl}
      alt={alt}
      downloadName={caption ? `imagem_${caption}` : 'imagem_secreta'}
      onOpenViewer={openViewer}
      onRequestDelete={requestDelete}
    />
  );
};

// ─── Definição do Node TipTap ────────────────────────────────────────────────

export const EncryptedImage = Node.create({
  name: 'encryptedImage',

  inline: false,
  group: 'block',

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
