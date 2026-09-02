import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { getValidAccessToken, uploadToDrive } from '../../../services/drive';
import { encryptFile } from '../../../services/storage';
import { detectFileType } from '../../../utils/file-type-detector';
import { triggerToast } from '../../ui/ToastContext';

export interface UploadTask {
  id: string;
  file: File;
  relativePath: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  errorMsg?: string;
  targetFolderId: string | null;
  driveSynced?: boolean;
}

interface UseFolderUploadProps {
  currentFolderId: string | null;
  onUploadComplete?: () => void;
}

export function useFolderUpload({ currentFolderId, onUploadComplete }: UseFolderUploadProps) {
  const { state } = useStore();
  const masterKey = state.moduleKeys['files'];
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1);
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

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const filesApi = window.api.files;
    if (!filesApi) {
      triggerToast('Módulo de arquivos indisponível', 'error');
      return;
    }

    setIsProcessing(true);
    const filesList = Array.from(e.target.files);

    const folderCache = new Map<string, string>();

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
          await filesApi.folders.create({
            id: newFolderId,
            name: part,
            parent_id: currentParent,
            color: '#6366f1',
          });
          folderCache.set(currentPath, newFolderId);
        }
        currentParent = folderCache.get(currentPath)!;
      }
      return currentParent;
    };

    const newTasks: UploadTask[] = [];

    filesList.sort((a, b) => (a.webkitRelativePath || '').localeCompare(b.webkitRelativePath || ''));

    for (const file of filesList) {
      const fullPath = file.webkitRelativePath || file.name;
      const parts = fullPath.split('/');
      parts.pop();
      const folderPath = parts.join('/');

      const targetFolderId = await getOrCreateFolder(folderPath);

      newTasks.push({
        id: crypto.randomUUID(),
        file,
        relativePath: fullPath,
        status: 'pending',
        progress: 0,
        targetFolderId,
      });
    }

    setTasks(newTasks);
    setIsProcessing(false);
  };

  const updateTask = (taskId: string, updates: Partial<UploadTask>) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));
  };

  const uploadSingleFile = async (task: UploadTask): Promise<{ success: boolean; driveSynced: boolean }> => {
    updateTask(task.id, { status: 'uploading', progress: 0, errorMsg: undefined });

    try {
      if (!window.api.files) {
        throw new Error('Módulo de arquivos indisponível');
      }
      const filesApi = window.api.files;

      const arrayBuffer = await task.file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      updateTask(task.id, { progress: 20 });

      let localPath = '';
      let driveFileName = task.file.name;
      let uploadBuffer = arrayBuffer;

      if (filesApi.saveLocal) {
        localPath = await filesApi.saveLocal(task.file.name, bytes);
      }

      updateTask(task.id, { progress: 40 });

      if (masterKey) {
        uploadBuffer = await encryptFile(arrayBuffer, masterKey);
        driveFileName = task.file.name + '.enc';
      } else {
        throw new Error('Chave mestra ausente para criptografia');
      }

      let driveId: string | undefined = undefined;
      let driveSynced = false;
      try {
        const token = await getValidAccessToken();
        if (token) {
          driveId = await uploadToDrive(token, driveFileName, uploadBuffer, 'root', (p) => {
            updateTask(task.id, { progress: 40 + p * 0.5 });
          });
          driveSynced = !!driveId;
        }
      } catch (driveErr) {
        console.warn('Drive upload falhou, salvando apenas localmente:', driveErr);
      }

      updateTask(task.id, { progress: 95 });

      const fileType = detectFileType(task.file.name);

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

      await filesApi.create(fileRecord);
      updateTask(task.id, { status: 'completed', progress: 100, driveSynced });
      return { success: true, driveSynced };
    } catch (err: unknown) {
      console.error('Erro upload:', err);
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Erro desconhecido';
      updateTask(task.id, { status: 'error', errorMsg: msg });
      return { success: false, driveSynced: false };
    }
  };

  const startUploadProcess = async (startIdx: number = 0) => {
    setIsUploading(true);
    let allGood = true;
    let anyDriveSynced = false;
    let anyDriveMissed = false;

    for (let i = startIdx; i < tasks.length; i++) {
      if (tasks[i].status === 'completed') {
        if (tasks[i].driveSynced) anyDriveSynced = true;
        else anyDriveMissed = true;
        continue;
      }

      setCurrentTaskIndex(i);
      const result = await uploadSingleFile(tasks[i]);
      if (!result.success) {
        allGood = false;
      }
      if (result.driveSynced) {
        anyDriveSynced = true;
      } else {
        anyDriveMissed = true;
      }
    }

    if (allGood) {
      if (anyDriveMissed && !anyDriveSynced) {
        triggerToast('Pasta importada apenas localmente (Google Drive desconectado).', 'info', 4000);
      } else if (anyDriveMissed && anyDriveSynced) {
        triggerToast('Pasta importada, mas alguns arquivos falharam ao sincronizar com o Drive.', 'error', 5000);
      } else {
        triggerToast('Pasta importada e sincronizada com o Google Drive com sucesso!', 'success', 4000);
      }
    } else {
      triggerToast('Alguns arquivos da pasta falharam ao serem processados.', 'error', 5000);
    }

    setIsUploading(false);
    setCurrentTaskIndex(-1);

    if (allGood && onUploadComplete) {
      onUploadComplete();
    }
  };

  const handleRetry = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === 'uploading' || isUploading) return;
    setIsUploading(true);
    try {
      await uploadSingleFile(task);
    } finally {
      setIsUploading(false);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const errorCount = tasks.filter(t => t.status === 'error').length;
  const totalProgress = tasks.length > 0 ? tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length : 0;

  return {
    tasks,
    isProcessing,
    isUploading,
    driveStatus,
    currentTaskIndex,
    completedCount,
    errorCount,
    totalProgress,
    handleFolderSelect,
    startUploadProcess,
    handleRetry,
  };
}
