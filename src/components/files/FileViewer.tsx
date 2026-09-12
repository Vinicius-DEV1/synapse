import { useEffect, useState, useRef, useCallback } from 'react';
import { Download, File, Bookmark, Loader2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import type { FileItem } from '../../types';
import { useStore } from '../../store/useStore';
import { getDecryptedFileUrl, fetchTextFromUrl } from '../../utils/file-fetcher';
import { useFileReadingProgress } from './hooks/useFileReadingProgress';
import { TextPreviewer } from './viewer/TextPreviewer';
import { FileViewerHeader } from './viewer/FileViewerHeader';
import { FileViewerResumeBanner } from './viewer/FileViewerResumeBanner';
import { DocumentEditorView } from './viewer/components/DocumentEditorView';
import { DocumentAiModal } from './viewer/modals/DocumentAiModal';
import { downloadDocumentFile } from './viewer/utils/documentDownloadUtils';
import { useDocumentSync } from './viewer/hooks/useDocumentSync';

interface FileViewerProps {
  item: FileItem;
  onClose: () => void;
}

function FileViewerContent({ item, onClose }: FileViewerProps) {
  const { state } = useStore();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const isMd = item.name.toLowerCase().endsWith('.md') || item.name.toLowerCase().endsWith('.markdown');
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>(isMd ? 'rendered' : 'raw');

  const isImage = item.file_type === 'image';
  const isText = item.file_type === 'text' || isMd || item.name.toLowerCase().endsWith('.txt');
  const isPdf = item.file_type === 'pdf' || item.name.toLowerCase().endsWith('.pdf');

  const filesMasterKey = state.moduleKeys['files'];
  const itemId = item.id;
  const itemLocalPath = item.local_path;
  const itemDriveId = item.drive_file_id;
  const itemFileType = item.file_type;
  const itemUpdatedAt = item.updated_at;

  const currentLoadedKeyRef = useRef<string | null>(null);
  const fileKey = `${itemId}_${itemUpdatedAt || ''}_${itemLocalPath || ''}_${itemDriveId || ''}`;

  const { saveDocument } = useDocumentSync({
    item,
    masterKey: filesMasterKey,
    onContentUpdated: (newText) => setTextContent(newText),
  });

  const {
    scrollContainerRef,
    showResumePrompt,
    setShowResumePrompt,
    savedProgressData,
    showBookmarksMenu,
    setShowBookmarksMenu,
    newBookmarkLabel,
    setNewBookmarkLabel,
    bookmarks,
    editingBmId,
    editingBmText,
    setEditingBmText,
    activeBookmarkToast,
    handleScroll,
    handleResumeReading,
    handleAddBookmark,
    handleStartRenameBookmark,
    handleSaveRenameBookmark,
    handleRemoveBookmark,
    handleJumpToBookmark,
  } = useFileReadingProgress(item.id, isText, textContent);

  const handleDownload = useCallback(async () => {
    if (!objectUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadDocumentFile(objectUrl, item.name);
    } finally {
      setIsDownloading(false);
    }
  }, [objectUrl, item.name, isDownloading]);

  useEffect(() => {
    if (currentLoadedKeyRef.current === fileKey && objectUrl) {
      return;
    }

    let url: string | null = null;
    let isCancelled = false;
    setIsLoading(true);
    setLoadError(null);

    if (['image', 'pdf', 'text', 'other'].includes(itemFileType) || isPdf || isText) {
      getDecryptedFileUrl(item, filesMasterKey)
        .then(async (resolvedUrl) => {
          if (isCancelled) return;
          if (resolvedUrl && typeof resolvedUrl === 'string') {
            url = resolvedUrl;
            setObjectUrl(resolvedUrl);
            currentLoadedKeyRef.current = fileKey;
            if (isText) {
              try {
                const txt = await fetchTextFromUrl(resolvedUrl);
                if (!isCancelled) setTextContent(txt);
              } catch (e) {
                console.error('[FileViewer] Failed to fetch text', e);
                if (!isCancelled) setTextContent('Erro ao carregar texto.');
              }
            }
          } else {
            console.warn('[FileViewer] No local or Drive file available');
            if (!isCancelled) {
              setLoadError(
                itemDriveId
                  ? 'Arquivo não encontrado localmente e não autenticado no Google Drive para download.'
                  : 'Arquivo não encontrado no armazenamento local.'
              );
            }
          }
        })
        .catch((err) => {
          console.error('[FileViewer] Error resolving file URL:', err);
          if (!isCancelled) {
            setLoadError(err?.message || 'Falha ao carregar o arquivo.');
          }
        })
        .finally(() => {
          if (!isCancelled) setIsLoading(false);
        });
    } else {
      setIsLoading(false);
      setLoadError('Tipo de arquivo não suportado para visualização.');
    }

    return () => {
      isCancelled = true;
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [fileKey, filesMasterKey, isPdf, isText, item, itemDriveId, itemFileType, objectUrl]);

  return (
    <div className="fixed inset-0 z-[200] bg-[#0f0f11] flex flex-col animate-fade-in select-text">
      {/* Header */}
      <FileViewerHeader
        item={item}
        isText={isText}
        isMd={isMd}
        wordCount={textContent.trim() ? textContent.trim().split(/\s+/).length : 0}
        estimatedMinutes={Math.ceil((textContent.trim() ? textContent.trim().split(/\s+/).length : 0) / 200)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        viewMode={viewMode}
        setViewMode={setViewMode}
        objectUrl={objectUrl}
        bookmarks={bookmarks}
        showBookmarksMenu={showBookmarksMenu}
        setShowBookmarksMenu={setShowBookmarksMenu}
        newBookmarkLabel={newBookmarkLabel}
        setNewBookmarkLabel={setNewBookmarkLabel}
        editingBmId={editingBmId}
        editingBmText={editingBmText}
        setEditingBmText={setEditingBmText}
        onAddBookmark={handleAddBookmark}
        onStartRenameBookmark={handleStartRenameBookmark}
        onSaveRenameBookmark={handleSaveRenameBookmark}
        onRemoveBookmark={handleRemoveBookmark}
        onJumpToBookmark={handleJumpToBookmark}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onOpenAi={() => setShowAiModal(true)}
        onDownload={handleDownload}
        isDownloading={isDownloading}
        onClose={onClose}
      />


      {/* Main Content View */}
      <div className="flex-1 overflow-hidden flex flex-col relative w-full h-full">
        {/* Toast Notificação de Marcador Ativo */}
        {activeBookmarkToast && (
          <div className="absolute top-4 right-6 z-50 bg-amber-500/90 text-black font-medium text-xs px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
            <Bookmark size={15} className="fill-black" />
            <span>
              Navegou para: <strong>{activeBookmarkToast}</strong>
            </span>
          </div>
        )}

        {/* Reading Resume Confirmation Banner */}
        <FileViewerResumeBanner
          show={showResumePrompt}
          savedProgressData={savedProgressData}
          onDismiss={() => setShowResumePrompt(false)}
          onResume={handleResumeReading}
        />

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Carregando arquivo...</span>
          </div>
        ) : !objectUrl ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="flex flex-col items-center justify-center p-8 bg-white/[0.03] border border-white/5 rounded-2xl max-w-md w-full shadow-2xl gap-4 text-center">
              <div className="p-3.5 bg-red-500/10 text-red-400 rounded-xl">
                <File size={36} />
              </div>
              <h3 className="text-base font-semibold text-white">Não foi possível carregar o arquivo</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                {loadError || 'O arquivo não foi encontrado localmente e não pôde ser baixado.'}
              </p>
              {item.drive_file_id && (
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('drive-auth-expired'));
                  }}
                  className="w-full px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-medium transition-colors shadow-lg shadow-brand-500/20"
                >
                  Conectar ao Google Drive
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl text-xs transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : isEditing ? (
          <DocumentEditorView
            initialContent={textContent}
            fileName={item.name}
            onSave={async (newTxt) => {
              const ok = await saveDocument(newTxt);
              if (ok) setIsEditing(false);
              return ok;
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : isImage ? (
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-black/95">
            <img
              src={objectUrl}
              alt={item.name}
              decoding="async"
              className="max-w-full max-h-full object-contain shadow-2xl"
            />
          </div>
        ) : isText ? (
          <TextPreviewer
            textContent={textContent}
            isMd={isMd}
            viewMode={viewMode}
            darkMode={darkMode}
            scrollContainerRef={scrollContainerRef}
            onScroll={handleScroll}
          />
        ) : isPdf ? (
          <iframe
            src={objectUrl}
            title={item.name}
            className="w-full h-full border-none bg-white"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="flex flex-col items-center justify-center p-8 bg-white/[0.03] border border-white/5 rounded-2xl max-w-md w-full shadow-2xl gap-4">
              <div className="p-3.5 bg-white/5 text-zinc-400 rounded-xl mb-1">
                <File size={40} />
              </div>
              <h3 className="text-lg font-semibold text-white text-center break-all">{item.name}</h3>
              <p className="text-zinc-400 text-center text-xs leading-relaxed">
                Visualização não suportada para este formato. <br />
                Tamanho: {(item.file_size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span>Baixar Arquivo</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contextual AI Assistant Modal */}
      {showAiModal && (
        <DocumentAiModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          documentTitle={item.name}
          documentText={textContent}
          onApplyChanges={async (updatedContent) => {
            return await saveDocument(updatedContent);
          }}
        />
      )}
    </div>
  );
}

export default function FileViewer(props: FileViewerProps) {
  return (
    <Portal>
      <FileViewerContent {...props} />
    </Portal>
  );
}
