import { X, UploadCloud, File, AlertCircle, CloudOff, Cloud } from 'lucide-react';
import type { FileItem } from '../../types';
import { Portal } from '../ui/Portal';
import { useFileUploadLogic } from './hooks/useFileUploadLogic';

interface FileUploadModalProps {
  onClose: () => void;
  onUploadComplete?: (files: FileItem[], groupAsBundle?: boolean) => void;
  onUploaded?: (fileId: string, fileName: string, fileType: string, isEncrypted?: boolean) => void;
  currentFolderId?: string | null;
  isOpen?: boolean;
  isLink?: boolean;
  initialFiles?: File[];
}

export default function FileUploadModal({
  onClose,
  onUploadComplete,
  onUploaded,
  currentFolderId = null,
  initialFiles = [],
}: FileUploadModalProps) {
  const {
    isDraggingOver,
    selectedFiles,
    groupAsBundle,
    setGroupAsBundle,
    isUploading,
    progress,
    uploadStatusText,
    error,
    driveStatus,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removeFile,
    handleUpload,
  } = useFileUploadLogic({
    currentFolderId,
    initialFiles,
    onUploadComplete,
    onUploaded,
  });

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Enviar Arquivo(s)</h2>
              {driveStatus === 'connected' ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Cloud size={12} />
                  Drive
                </span>
              ) : driveStatus === 'disconnected' ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <CloudOff size={12} />
                  Offline
                </span>
              ) : null}
            </div>
            <button onClick={onClose} disabled={isUploading} className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 flex flex-col gap-4">
            {driveStatus === 'disconnected' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CloudOff size={18} className="text-amber-400 shrink-0" />
                  <p className="text-amber-200/90 text-xs leading-relaxed">
                    <strong>Google Drive desconectado:</strong> os arquivos serão salvos apenas localmente neste dispositivo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('drive-auth-expired'));
                  }}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium rounded-lg shrink-0 transition-colors"
                >
                  Conectar
                </button>
              </div>
            )}

            {selectedFiles.length === 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all group ${
                  isDraggingOver
                    ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/20'
                    : 'border-white/20 hover:bg-white/5'
                }`}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud
                  size={48}
                  className={`mb-4 transition-transform ${
                    isDraggingOver ? 'text-brand-400 scale-110' : 'text-brand-500 group-hover:scale-110'
                  }`}
                />
                <p className="text-white font-medium mb-1">
                  {isDraggingOver ? 'Solte os arquivos aqui' : 'Clique ou arraste arquivo(s)'}
                </p>
                <p className="text-dark-subtext text-sm">PDFs, Imagens, Slides, Vídeos e mais (vários simultâneos)</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex flex-col gap-2 max-h-48 overflow-y-auto p-1 rounded-xl transition-all ${
                    isDraggingOver ? 'border-2 border-dashed border-brand-500 bg-brand-500/10' : ''
                  }`}
                >
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center p-3 bg-white/5 border border-white/10 rounded-xl gap-3">
                      <div className="p-2 bg-brand-500/20 text-brand-400 rounded-lg">
                        <File size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{file.name}</p>
                        <p className="text-dark-subtext text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      {!isUploading && (
                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1.5 text-dark-subtext hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!isUploading && (
                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border border-dashed rounded-xl py-2 px-3 flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer ${
                      isDraggingOver
                        ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                        : 'border-white/20 text-dark-subtext hover:text-white hover:border-white/40 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud size={14} />
                    <span>+ Adicionar mais arquivos (ou arraste aqui)</span>
                  </div>
                )}

                {selectedFiles.length > 1 && !isUploading && (
                  <div className="pt-2 flex items-center justify-between border-t border-white/5 mt-2">
                    <label className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={groupAsBundle}
                        onChange={(e) => setGroupAsBundle(e.target.checked)}
                        className="rounded bg-black/40 border-white/20 text-brand-500 focus:ring-brand-400 focus:ring-offset-0 cursor-pointer"
                      />
                      <span>Agrupar arquivos em um único widget</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {isUploading && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm text-dark-subtext">
                  <span>{uploadStatusText || 'Enviando...'}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/10 bg-dark-bg/50 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedFiles.length === 0 || isUploading
                  ? 'bg-brand-500/50 text-white/50 cursor-not-allowed'
                  : 'bg-brand-500 text-white hover:bg-brand-600'
              }`}
            >
              {isUploading ? 'Enviando...' : `Fazer Upload (${selectedFiles.length})`}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
