import React, { useState } from 'react';
import { X, UploadCloud, File, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { FileItem } from '../../types';
import { getValidAccessToken, uploadToDrive } from '../../services/drive';
import { encryptFile } from '../../services/storage';
import { Portal } from '../ui/Portal';

interface FileUploadModalProps {
  onClose: () => void;
  onUploadComplete?: (file: FileItem) => void;
  onUploaded?: (fileId: string, fileName: string, fileType: string, isEncrypted?: boolean) => void;
  currentFolderId?: string | null;
  isOpen?: boolean;
  isLink?: boolean;
}

export default function FileUploadModal({ onClose, onUploadComplete, onUploaded, currentFolderId = null }: FileUploadModalProps) {
  const { state } = useStore();
  const masterKey = state.moduleKeys['files'];
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    setProgress(0);
    setError(null);
    
    let lastCreated: any = null;
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadStatusText(`Enviando (${i + 1}/${selectedFiles.length}): ${file.name}`);
        setProgress(0);
        
        // 1. Save locally via Tauri
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        setProgress(20);
        
        let localPath = "";
        let driveFileName = file.name;
        let uploadBuffer = arrayBuffer;

        if (window.api?.files?.saveLocal) {
          localPath = await window.api.files.saveLocal(file.name, new Uint8Array(bytes));
        }
        
        setProgress(40);
        
        if (masterKey) {
          uploadBuffer = await encryptFile(arrayBuffer, masterKey);
          driveFileName = file.name + '.enc';
        } else {
          throw new Error("Master key is required for uploading securely.");
        }

        // 2. Upload to Drive
        let driveId: string | undefined = undefined;
        try {
          const token = await getValidAccessToken();
          if (token) {
            driveId = await uploadToDrive(token, driveFileName, uploadBuffer, 'root', (p) => {
              setProgress(40 + (p * 0.5));
            });
          }
        } catch (driveErr) {
          console.warn("Drive upload failed, saving locally only:", driveErr);
        }
        
        setProgress(95);
        
        // 3. Create DB Record
        let fileType = 'other';
        const nameLower = file.name.toLowerCase();
        if (nameLower.endsWith('.pdf')) fileType = 'pdf';
        else if (nameLower.match(/\.(png|jpe?g|gif|webp)$/)) fileType = 'image';
        else if (nameLower.match(/\.(mp4|mkv|webm)$/)) fileType = 'video';
        else if (nameLower.endsWith('.epub')) fileType = 'epub';
        else if (nameLower.match(/\.(pptx?|key|odp)$/)) fileType = 'slide';
        else if (nameLower.match(/\.(txt|md|json|csv|xml|js|ts|jsx|tsx|css|html)$/)) fileType = 'text';
        
        const fileRecord = {
          id: crypto.randomUUID(),
          name: file.name,
          file_type: fileType,
          file_size: file.size,
          local_path: localPath,
          drive_file_id: driveId,
          folder_id: currentFolderId,
          mime_type: file.type,
        };
        
        lastCreated = await window.api.files.create(fileRecord);
        setProgress(100);
      }
      if (onUploadComplete) {
        onUploadComplete(lastCreated);
      } else if (onUploaded && lastCreated) {
        onUploaded(lastCreated.id, lastCreated.name, lastCreated.file_type, !!masterKey);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || 'Erro desconhecido ao enviar arquivo');
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Enviar Arquivo(s)</h2>
          <button onClick={onClose} disabled={isUploading} className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          {selectedFiles.length === 0 ? (
            <div className="relative border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors group">
              <input 
                type="file" 
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud size={48} className="text-brand-500 mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-white font-medium mb-1">Clique ou arraste arquivo(s)</p>
              <p className="text-dark-subtext text-sm">PDFs, Imagens, Slides, Vídeos e mais (vários simultâneos)</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
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
                      onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-dark-subtext hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
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
