import React, { useRef } from 'react';
import { X, UploadCloud, Folder, Loader2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { useFolderUpload } from './hooks/useFolderUpload';
import { FolderUploadTaskList } from './ui/FolderUploadTaskList';

interface FolderUploadModalProps {
  onClose: () => void;
  onUploadComplete?: () => void;
  currentFolderId?: string | null;
}

export default function FolderUploadModal({ onClose, onUploadComplete, currentFolderId = null }: FolderUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    tasks,
    isProcessing,
    isUploading,
    completedCount,
    errorCount,
    totalProgress,
    handleFolderSelect,
    startUploadProcess,
    handleRetry,
  } = useFolderUpload({ currentFolderId, onUploadComplete });

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col h-[70vh]">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                <Folder size={20} className="text-brand-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">Upload de Pasta</h2>
                <p className="text-sm text-dark-subtext">Importe diretórios inteiros mantendo a estrutura original</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              disabled={isUploading}
              className="p-2 hover:bg-white/10 rounded-lg text-dark-subtext hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4 flex-1 overflow-hidden flex flex-col">
            {tasks.length === 0 ? (
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-8 bg-dark-bg/30">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFolderSelect}
                  className="hidden" 
                  // @ts-ignore - webkitdirectory is standard but not in types
                  webkitdirectory="true" 
                  directory="true"
                  multiple 
                />
                <Folder size={48} className="text-brand-500/50 mb-4" />
                <p className="text-white font-medium mb-2">Selecione uma pasta para enviar</p>
                <p className="text-dark-subtext text-sm text-center max-w-md mb-6">
                  Todos os arquivos e subpastas serão importados e criptografados localmente e na nuvem de forma sequencial.
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                  Selecionar Pasta
                </button>
              </div>
            ) : (
              <FolderUploadTaskList
                tasks={tasks}
                completedCount={completedCount}
                errorCount={errorCount}
                totalProgress={totalProgress}
                onRetry={handleRetry}
              />
            )}
          </div>
          
          {tasks.length > 0 && (
            <div className="p-4 border-t border-white/10 bg-dark-bg/50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={onClose}
                disabled={isUploading && completedCount < tasks.length}
                className="px-4 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors text-sm"
              >
                {completedCount === tasks.length ? 'Fechar' : 'Cancelar'}
              </button>
              {completedCount < tasks.length && (
                <button 
                  onClick={() => startUploadProcess()}
                  disabled={isUploading}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors text-sm ${
                    isUploading
                      ? 'bg-brand-500/50 text-white/50 cursor-not-allowed'
                      : 'bg-brand-500 text-white hover:bg-brand-600'
                  }`}
                >
                  {isUploading ? 'Enviando...' : (errorCount > 0 ? 'Tentar Falhas' : 'Iniciar Upload')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
