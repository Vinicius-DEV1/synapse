import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import type { FileItem } from '../../../types';
import { getValidAccessToken, uploadToDrive } from '../../../services/drive';
import { encryptFile } from '../../../services/storage';
import { detectFileType } from '../../../utils/file-type-detector';
import { triggerToast } from '../../ui/ToastContext';

interface UseFileUploadLogicParams {
  currentFolderId?: string | null;
  initialFiles?: File[];
  onUploadComplete?: (files: FileItem[], groupAsBundle?: boolean) => void;
  onUploaded?: (fileId: string, fileName: string, fileType: string, isEncrypted?: boolean) => void;
}

export function useFileUploadLogic({
  currentFolderId = null,
  initialFiles = [],
  onUploadComplete,
  onUploaded,
}: UseFileUploadLogicParams) {
  const { state } = useStore();
  const masterKey = state.moduleKeys['files'];
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>(initialFiles);
  const [groupAsBundle, setGroupAsBundle] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    let mounted = true;
    getValidAccessToken()
      .then((token) => {
        if (mounted) setDriveStatus(token ? 'connected' : 'disconnected');
      })
      .catch(() => {
        if (mounted) setDriveStatus('disconnected');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      setError(null);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
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

    const createdFiles: FileItem[] = [];
    let anyDriveFailed = false;
    let anyDriveSuccess = false;
    let wasDriveDisconnected = false;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadStatusText(`Enviando (${i + 1}/${selectedFiles.length}): ${file.name}`);
        setProgress(0);

        // 1. Save locally via platform API
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        setProgress(20);

        let localPath = '';
        let driveFileName = file.name;
        let uploadBuffer = arrayBuffer;

        if (window.api.files.saveLocal) {
          localPath = await window.api.files.saveLocal(file.name, bytes);
        }

        setProgress(40);

        if (masterKey) {
          uploadBuffer = await encryptFile(arrayBuffer, masterKey);
          driveFileName = file.name + '.enc';
        } else {
          throw new Error('A chave mestra é necessária para criptografar os arquivos.');
        }

        // 2. Upload to Drive
        let driveId: string | undefined = undefined;
        try {
          const token = await getValidAccessToken();
          if (token) {
            driveId = await uploadToDrive(token, driveFileName, uploadBuffer, 'root', (p) => {
              setProgress(40 + p * 0.5);
            });
            anyDriveSuccess = true;
          } else {
            wasDriveDisconnected = true;
          }
        } catch (driveErr) {
          console.warn('Drive upload failed, saving locally only:', driveErr);
          anyDriveFailed = true;
        }

        setProgress(95);

        // 3. Create DB Record using centralized detector
        const fileType = detectFileType(file.name);

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

        const created = await window.api.files.create(fileRecord);
        if (created) {
          createdFiles.push(created);
        }
        setProgress(100);
      }

      if (anyDriveFailed) {
        triggerToast('Arquivo(s) salvo(s) localmente, mas falhou o envio para o Google Drive.', 'error', 5000);
      } else if (wasDriveDisconnected && !anyDriveSuccess) {
        triggerToast('Arquivo(s) salvo(s) apenas localmente (Google Drive desconectado).', 'info', 4000);
      } else if (anyDriveSuccess) {
        triggerToast('Arquivo(s) enviado(s) e sincronizado(s) com o Google Drive com sucesso!', 'success', 4000);
      }

      if (onUploadComplete && createdFiles.length > 0) {
        onUploadComplete(createdFiles, groupAsBundle);
      } else if (onUploaded && createdFiles.length > 0) {
        const lastCreated = createdFiles[createdFiles.length - 1];
        onUploaded(lastCreated.id, lastCreated.name, lastCreated.file_type, !!masterKey);
      }
    } catch (err: unknown) {
      console.error('Upload error:', err);
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao enviar arquivo';
      setError(msg);
      triggerToast(msg, 'error', 5000);
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
    }
  };

  return {
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
  };
}
