import { useEffect, useState } from 'react';
import { Download, File, Bookmark } from 'lucide-react';
import { Portal } from '../ui/Portal';
import type { FileItem } from '../../types';
import { useStore } from '../../store/useStore';
import { getDecryptedFileUrl } from '../../utils/file-fetcher';
import { useFileReadingProgress } from './hooks/useFileReadingProgress';
import { TextPreviewer } from './viewer/TextPreviewer';
import { FileViewerHeader } from './viewer/FileViewerHeader';
import { FileViewerResumeBanner } from './viewer/FileViewerResumeBanner';

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

  const isMd = item.name.toLowerCase().endsWith('.md') || item.name.toLowerCase().endsWith('.markdown');
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>(isMd ? 'rendered' : 'raw');

  const isImage = item.file_type === 'image';
  const isText = item.file_type === 'text';
  const isPdf = item.file_type === 'pdf' || item.name.toLowerCase().endsWith('.pdf');

  const {
    scrollContainerRef,
    progressBarRef,
    progressPercentRef,
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
    handleJumpToBookmark
  } = useFileReadingProgress(item.id, isText, textContent);

  useEffect(() => {
    let url: string | null = null;
    let isCancelled = false;
    setIsLoading(true);
    setLoadError(null);
    
    if (['image', 'pdf', 'text', 'other'].includes(item.file_type) || isPdf) {
      getDecryptedFileUrl(item, state.moduleKeys['files'])
        .then(async resolvedUrl => {
          if (isCancelled) return;
          if (resolvedUrl && typeof resolvedUrl === 'string') {
            url = resolvedUrl;
            setObjectUrl(resolvedUrl);
            if (item.file_type === 'text') {
              try {
                const res = await fetch(resolvedUrl);
                const txt = await res.text();
                if (!isCancelled) setTextContent(txt);
              } catch (e) {
                console.error("Failed to fetch text", e);
                if (!isCancelled) setTextContent("Erro ao carregar texto.");
              }
            }
          } else {
            console.warn("No local or Drive file available");
            if (!isCancelled) {
              setLoadError(
                item.drive_file_id
                  ? 'Arquivo não encontrado localmente e não autenticado no Google Drive para download.'
                  : 'Arquivo não encontrado no armazenamento local.'
              );
            }
          }
        })
        .catch(err => {
          console.error("Error resolving file URL:", err);
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
  }, [item, state.moduleKeys, isPdf]);

  // Smooth keyboard navigation (Arrow keys, PageUp/PageDown)
  useEffect(() => {
    if (!isText || !textContent) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const step = 60;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        container.scrollBy({ top: step, behavior: 'auto' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        container.scrollBy({ top: -step, behavior: 'auto' });
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        container.scrollBy({ top: container.clientHeight * 0.8, behavior: 'smooth' });
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        container.scrollBy({ top: -container.clientHeight * 0.8, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isText, textContent, scrollContainerRef]);

  const wordCount = textContent ? textContent.trim().split(/\s+/).filter(Boolean).length : 0;
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
      <FileViewerHeader
        item={item}
        isText={isText}
        isMd={isMd}
        wordCount={wordCount}
        estimatedMinutes={estimatedMinutes}
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
        onClose={onClose}
      />

      {/* Reading Progress Bar with Visual Markers */}
      {isText && (
        <div className="w-full bg-white/5 h-1.5 relative z-20">
          <div 
            ref={progressBarRef}
            className="bg-brand-500 h-full transition-all duration-150" 
            style={{ width: `${progressPercentRef.current}%` }}
          />

          {/* Bookmark Visual Pins */}
          {scrollContainerRef.current && (scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight) > 0 && (
            bookmarks.map(bm => {
              const maxScroll = scrollContainerRef.current!.scrollHeight - scrollContainerRef.current!.clientHeight;
              const bmPercent = Math.min(100, Math.max(0, (bm.scrollTop / maxScroll) * 100));
              return (
                <button
                  key={bm.id}
                  onClick={() => handleJumpToBookmark(bm.scrollTop, bm.label)}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-amber-400 hover:bg-amber-300 hover:scale-150 rounded-full border border-black shadow-md transition-all z-30 cursor-pointer"
                  style={{ left: `${bmPercent}%` }}
                  title={`📌 ${bm.label} (${Math.round(bmPercent)}%)`}
                />
              );
            })
          )}
        </div>
      )}
      
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
        {/* Toast Notificação de Marcador Ativo */}
        {activeBookmarkToast && (
          <div className="absolute top-4 right-6 z-50 bg-amber-500/90 text-black font-medium text-xs px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
            <Bookmark size={15} className="fill-black" />
            <span>Navegou para: <strong>{activeBookmarkToast}</strong></span>
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
          <div className="flex flex-col items-center justify-center gap-3 text-dark-subtext">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Carregando arquivo...</span>
          </div>
        ) : !objectUrl ? (
          <div className="flex flex-col items-center justify-center p-8 bg-dark-card border border-white/10 rounded-2xl max-w-md w-full shadow-2xl gap-4 text-center">
            <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl">
              <File size={40} />
            </div>
            <h3 className="text-lg font-semibold text-white">Não foi possível carregar o arquivo</h3>
            <p className="text-dark-subtext text-xs leading-relaxed">
              {loadError || 'O arquivo não foi encontrado localmente e não pôde ser baixado.'}
            </p>
            {item.drive_file_id && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('drive-auth-expired'));
                }}
                className="w-full px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Conectar ao Google Drive
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white rounded-xl text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : isImage ? (
          <img 
            src={objectUrl} 
            alt={item.name} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
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
            className="w-full h-full max-w-5xl rounded-xl border border-white/10 shadow-2xl bg-white"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-dark-card border border-white/10 rounded-2xl max-w-md w-full shadow-2xl gap-4">
            <div className="p-4 bg-brand-500/20 text-brand-400 rounded-2xl mb-2">
              <File size={48} />
            </div>
            <h3 className="text-xl font-semibold text-white text-center break-all">{item.name}</h3>
            <p className="text-dark-subtext text-center mb-4 text-sm">
              Visualização não suportada para este formato. <br/> 
              Tamanho: {(item.file_size / 1024 / 1024).toFixed(2)} MB
            </p>
            <a 
              href={objectUrl} 
              download={item.name}
              className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Baixar Arquivo
            </a>
          </div>
        )}
      </div>
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
