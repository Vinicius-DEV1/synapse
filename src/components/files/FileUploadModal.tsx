import React, { useState, useEffect } from 'react';
import { X, UploadCloud, File, AlertCircle, CloudOff, Cloud } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { FileItem } from '../../types';
import { getValidAccessToken, uploadToDrive } from '../../services/drive';
import { encryptFile } from '../../services/storage';
import { Portal } from '../ui/Portal';
import { triggerToast } from '../ui/ToastContext';

// The real `files.saveLocal` implementation (Tauri, src/api/tauri/files.ts) takes
// the filename plus the raw bytes; the declared ICadernoAPI signature only has one
// param. Type the runtime function reference to match its actual shape.
type SaveLocalFn = (filename: string, data: Uint8Array) => Promise<string>;

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
  const [driveStatus, setDriveStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    let mounted = true;
    getValidAccessToken()
      .then(token => {
        if (mounted) setDriveStatus(token ? 'connected' : 'disconnected');
      })
      .catch(() => {
        if (mounted) setDriveStatus('disconnected');
      });

    return () => {
      mounted = false;
    };
  }, []);

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
    
    if (!window.api.files) {
      const errMsg = 'Módulo de arquivos indisponível no sistema';
      setError(errMsg);
      triggerToast(errMsg, 'error');
      setIsUploading(false);
      return;
    }

    let lastCreated: any = null;
    let anyDriveFailed = false;
    let anyDriveSuccess = false;
    let wasDriveDisconnected = false;

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

        const saveLocal = window.api?.files?.saveLocal as SaveLocalFn | undefined;
        if (saveLocal) {
          localPath = await saveLocal(file.name, new Uint8Array(bytes));
        }
        
        setProgress(40);
        
        if (masterKey) {
          uploadBuffer = await encryptFile(arrayBuffer, masterKey);
          driveFileName = file.name + '.enc';
        } else {
          throw new Error("A chave mestra é necessária para criptografar os arquivos.");
        }

        // 2. Upload to Drive
        let driveId: string | undefined = undefined;
        try {
          const token = await getValidAccessToken();
          if (token) {
            driveId = await uploadToDrive(token, driveFileName, uploadBuffer, 'root', (p) => {
              setProgress(40 + (p * 0.5));
            });
            anyDriveSuccess = true;
          } else {
            wasDriveDisconnected = true;
          }
        } catch (driveErr) {
          console.warn("Drive upload failed, saving locally only:", driveErr);
          anyDriveFailed = true;
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

      if (anyDriveFailed) {
        triggerToast('Arquivo(s) salvo(s) localmente, mas falhou o envio para o Google Drive.', 'error', 5000);
      } else if (wasDriveDisconnected && !anyDriveSuccess) {
        triggerToast('Arquivo(s) salvo(s) apenas localmente (Google Drive desconectado).', 'info', 4000);
      } else if (anyDriveSuccess) {
        triggerToast('Arquivo(s) enviado(s) e sincronizado(s) com o Google Drive com sucesso!', 'success', 4000);
      }

      if (onUploadComplete) {
        onUploadComplete(lastCreated);
      } else if (onUploaded && lastCreated) {
        onUploaded(lastCreated.id, lastCreated.name, lastCreated.file_type, !!masterKey);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      const msg = err.message || 'Erro desconhecido ao enviar arquivo';
      setError(msg);
      triggerToast(msg, 'error', 5000);
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
