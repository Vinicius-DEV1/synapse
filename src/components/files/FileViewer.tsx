import { useEffect, useState } from 'react';
import { X, Download, FileText, File, Moon, Sun, Eye, Code, Bookmark, RotateCcw, BookmarkCheck } from 'lucide-react';
import { Portal } from '../ui/Portal';
import type { FileItem } from '../../types';
import { useStore } from '../../store/useStore';
import { getDecryptedFileUrl } from '../../utils/file-fetcher';
import { useFileReadingProgress } from './hooks/useFileReadingProgress';
import { BookmarksDrawer } from './viewer/BookmarksDrawer';
import { TextPreviewer } from './viewer/TextPreviewer';

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
    
    if (['image', 'pdf', 'text', 'other'].includes(item.file_type)) {
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
            console.warn("Nenhum arquivo local ou no Drive disponível");
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
          console.error("Erro ao resolver URL do arquivo:", err);
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
      if (url) URL.revokeObjectURL(url);
    };
  }, [item, state.moduleKeys]);

  // Navegação suave por teclado (Setas cima/baixo, PageUp/PageDown)
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
      {/* Header */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-dark-card/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-brand-500/20 text-brand-400 rounded-lg shrink-0">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-medium text-sm truncate">{item.name}</h3>
            <p className="text-xs text-dark-subtext flex items-center gap-2">
              <span>{(item.file_size / 1024 / 1024).toFixed(2)} MB</span>
              {isText && wordCount > 0 && (
                <>
                  <span>•</span>
                  <span>{wordCount} palavras</span>
                  <span>•</span>
                  <span>~{estimatedMinutes} min de leitura</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isText && (
            <>
              {/* Modo Escuro Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={darkMode ? 'Modo Normal' : 'Modo Alto Contraste / Noturno'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Drawer de Marcadores */}
              <BookmarksDrawer
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
              />

              {/* View Mode Switcher */}
              {isMd && (
                <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1 gap-1">
                  <button
                    onClick={() => setViewMode('rendered')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                      viewMode === 'rendered' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white'
                    }`}
                    title="Visualizar Formatado"
                  >
                    <Eye size={14} />
                    <span>Formatado</span>
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                      viewMode === 'raw' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white'
                    }`}
                    title="Visualizar Código Fonte"
                  >
                    <Code size={14} />
                    <span>Texto</span>
                  </button>
                </div>
              )}
            </>
          )}

          {objectUrl && (
            <a 
              href={objectUrl} 
              download={item.name}
              className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
              title="Download"
            >
              <Download size={20} />
            </a>
          )}
          <button onClick={onClose} className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Fechar">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Barra de Progresso de Leitura com Marcadores Visuais */}
      {isText && (
        <div className="w-full bg-white/5 h-1.5 relative z-20">
          <div 
            ref={progressBarRef}
            className="bg-brand-500 h-full transition-all duration-150" 
            style={{ width: `${progressPercentRef.current}%` }}
          />

          {/* Pins Visuais dos Marcadores */}
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

        {/* Banner/Modal de Confirmação de Retorno de Leitura */}
        {showResumePrompt && savedProgressData && (
          <div className="absolute bottom-6 right-6 z-50 bg-dark-card/95 backdrop-blur-md border border-brand-500/40 rounded-xl shadow-2xl p-4 max-w-sm flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-brand-400">
                <RotateCcw size={18} />
                <h4 className="text-sm font-semibold text-white">Continuar Leitura?</h4>
              </div>
              <button 
                onClick={() => setShowResumePrompt(false)} 
                className="text-dark-subtext hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-300">
              Você parou em <strong className="text-brand-300 font-bold">{savedProgressData.percentage}%</strong> deste documento. Deseja retornar de onde parou?
            </p>
            <div className="flex items-center gap-2 justify-end mt-1">
              <button
                onClick={() => setShowResumePrompt(false)}
                className="px-3 py-1.5 text-xs text-dark-subtext hover:bg-white/10 rounded-lg transition-colors"
              >
                Começar do Início
              </button>
              <button
                onClick={handleResumeReading}
                className="px-3 py-1.5 text-xs bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg shadow transition-colors flex items-center gap-1.5"
              >
                <BookmarkCheck size={14} />
                Continuar Leitura
              </button>
            </div>
          </div>
        )}

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
