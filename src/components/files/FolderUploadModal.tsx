import React, { useState, useRef } from 'react';
import { X, UploadCloud, File, AlertCircle, Folder, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { FileItem, FileFolder } from '../../types';
import { getValidAccessToken, uploadToDrive } from '../../services/drive';
import { encryptFile } from '../../services/storage';
import { Portal } from '../ui/Portal';

interface FolderUploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
  currentFolderId: string | null;
}

interface UploadTask {
  id: string;
  file: File;
  relativePath: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  errorMsg?: string;
  targetFolderId: string | null;
}

export default function FolderUploadModal({ onClose, onUploadComplete, currentFolderId }: FolderUploadModalProps) {
  const { state } = useStore();
  const masterKey = state.moduleKeys['files'];
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsProcessing(true);
    const filesList = Array.from(e.target.files);
    
    // Build folder structure
    const folderCache = new Map<string, string>(); // path -> folderId
    
    // helper to get or create folder
    const getOrCreateFolder = async (pathStr: string): Promise<string | null> => {
      if (!pathStr || pathStr === '') return currentFolderId;
      if (folderCache.has(pathStr)) return folderCache.get(pathStr)!;
      
      const parts = pathStr.split('/');
      let currentParent = currentFolderId;
      let currentPath = '';
      
      for (const part of parts) {
        if (!part) continue;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!folderCache.has(currentPath)) {
          const newFolderId = crypto.randomUUID();
          await window.api.files.folders.create({
            id: newFolderId,
            name: part,
            parent_id: currentParent,
            color: '#6366f1'
          });
          folderCache.set(currentPath, newFolderId);
        }
        currentParent = folderCache.get(currentPath)!;
      }
      return currentParent;
    };

    const newTasks: UploadTask[] = [];
    
    // Sort files so folders are created logically
    filesList.sort((a, b) => (a.webkitRelativePath || '').localeCompare(b.webkitRelativePath || ''));
    
    for (const file of filesList) {
      const fullPath = file.webkitRelativePath || file.name;
      const parts = fullPath.split('/');
      // The last part is the file name, the rest is the path
      parts.pop(); 
      const folderPath = parts.join('/');
      
      const targetFolderId = await getOrCreateFolder(folderPath);
      
      newTasks.push({
        id: crypto.randomUUID(),
        file,
        relativePath: fullPath,
        status: 'pending',
        progress: 0,
        targetFolderId
      });
    }
    
    setTasks(newTasks);
    setIsProcessing(false);
  };

  const updateTask = (taskId: string, updates: Partial<UploadTask>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  const uploadSingleFile = async (task: UploadTask) => {
    updateTask(task.id, { status: 'uploading', progress: 0, errorMsg: undefined });
    
    try {
      const arrayBuffer = await task.file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      updateTask(task.id, { progress: 20 });
      
      let localPath = "";
      let driveFileName = task.file.name;
      let uploadBuffer = arrayBuffer;

      if (window.api?.files?.saveLocal) {
        localPath = await window.api.files.saveLocal(task.file.name, Array.from(bytes));
      }
      
      updateTask(task.id, { progress: 40 });
      
      if (masterKey) {
        uploadBuffer = await encryptFile(arrayBuffer, masterKey);
        driveFileName = task.file.name + '.enc';
      } else {
        throw new Error("Chave mestra ausente");
      }

      let driveId: string | undefined = undefined;
      try {
        const token = await getValidAccessToken();
        if (token) {
          driveId = await uploadToDrive(token, driveFileName, uploadBuffer, 'root', (p) => {
            updateTask(task.id, { progress: 40 + (p * 0.5) });
          });
        }
      } catch (driveErr) {
        console.warn("Drive upload falhou:", driveErr);
      }
      
      updateTask(task.id, { progress: 95 });
      
      let fileType = 'other';
      const nameLower = task.file.name.toLowerCase();
      if (nameLower.endsWith('.pdf')) fileType = 'pdf';
      else if (nameLower.match(/\.(png|jpe?g|gif|webp)$/)) fileType = 'image';
      else if (nameLower.match(/\.(mp4|mkv|webm)$/)) fileType = 'video';
      else if (nameLower.endsWith('.epub')) fileType = 'epub';
      else if (nameLower.match(/\.(pptx?|key|odp)$/)) fileType = 'slide';
      else if (nameLower.match(/\.(txt|md|json|csv|xml|js|ts|jsx|css|html)$/)) fileType = 'text';
      
      const fileRecord = {
        id: crypto.randomUUID(),
        name: task.file.name,
        file_type: fileType,
        file_size: task.file.size,
        local_path: localPath,
        drive_file_id: driveId,
        folder_id: task.targetFolderId,
        mime_type: task.file.type,
      };
      
      await window.api.files.create(fileRecord);
      updateTask(task.id, { status: 'completed', progress: 100 });
      return true;
    } catch (err: any) {
      console.error("Erro upload:", err);
      updateTask(task.id, { status: 'error', errorMsg: err.message || 'Erro desconhecido' });
      return false;
    }
  };

  const startUploadProcess = async (startIdx: number = 0) => {
    setIsUploading(true);
    let allGood = true;
    for (let i = startIdx; i < tasks.length; i++) {
      if (tasks[i].status === 'completed') continue;
      
      setCurrentTaskIndex(i);
      const success = await uploadSingleFile(tasks[i]);
      if (!success) {
        allGood = false;
        // Optionally break or continue. Let's continue so one fail doesn't stop everything.
      }
    }
    
    setIsUploading(false);
    setCurrentTaskIndex(-1);
    
    if (allGood) {
      onUploadComplete();
    }
  };

  const handleRetry = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      uploadSingleFile(task);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const errorCount = tasks.filter(t => t.status === 'error').length;
  const totalProgress = tasks.length > 0 ? (tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length) : 0;

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
            <div className="flex flex-col h-full gap-4">
              {/* Progress Summary */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 shrink-0">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-white/90">Progresso Geral</h3>
                    <p className="text-xs text-white/50">{completedCount} de {tasks.length} arquivos concluídos</p>
                  </div>
                  <span className="text-brand-400 font-bold">{Math.round(totalProgress)}%</span>
                </div>
                <div className="h-2.5 bg-dark-bg rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-500 transition-all duration-300 relative"
                    style={{ width: `${totalProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
                {errorCount > 0 && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle size={12} /> {errorCount} arquivo(s) falharam
                  </p>
                )}
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
                {tasks.map((task, idx) => (
                  <div key={task.id} className="p-3 rounded-xl border border-white/5 bg-dark-bg/50 flex items-center gap-3">
                    <File size={16} className="text-white/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 truncate" title={task.relativePath}>{task.relativePath}</p>
                      {task.status === 'uploading' && (
                        <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-brand-400 transition-all duration-200" style={{ width: `${task.progress}%` }} />
                        </div>
                      )}
                      {task.status === 'error' && (
                        <p className="text-xs text-red-400 mt-1 truncate">{task.errorMsg}</p>
                      )}
                    </div>
                    
                    <div className="shrink-0 flex items-center">
                      {task.status === 'completed' && <CheckCircle2 size={18} className="text-green-400" />}
                      {task.status === 'uploading' && <Loader2 size={18} className="text-brand-400 animate-spin" />}
                      {task.status === 'pending' && <span className="text-xs text-white/30">Pendente</span>}
                      {task.status === 'error' && (
                        <button 
                          onClick={() => handleRetry(task.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-colors"
                          title="Tentar Novamente"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
