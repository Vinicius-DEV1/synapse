import { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { getValidAccessToken, uploadToDrive } from '../../../services/drive';
import { encryptFile } from '../../../services/storage';

export interface UploadTask {
  id: string;
  file: File;
  relativePath: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  errorMsg?: string;
  targetFolderId: string | null;
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

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

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
          await window.api.files.folders.create({
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

  const uploadSingleFile = async (task: UploadTask) => {
    updateTask(task.id, { status: 'uploading', progress: 0, errorMsg: undefined });

    try {
      const arrayBuffer = await task.file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      updateTask(task.id, { progress: 20 });

      let localPath = '';
      let driveFileName = task.file.name;
      let uploadBuffer = arrayBuffer;

      if (window.api?.files?.saveLocal) {
        localPath = await window.api.files.saveLocal(task.file.name, new Uint8Array(bytes));
      }

      updateTask(task.id, { progress: 40 });

      if (masterKey) {
        uploadBuffer = await encryptFile(arrayBuffer, masterKey);
        driveFileName = task.file.name + '.enc';
      } else {
        throw new Error('Chave mestra ausente');
      }

      let driveId: string | undefined = undefined;
      try {
        const token = await getValidAccessToken();
        if (token) {
          driveId = await uploadToDrive(token, driveFileName, uploadBuffer, 'root', (p) => {
            updateTask(task.id, { progress: 40 + p * 0.5 });
          });
        }
      } catch (driveErr) {
        console.warn('Drive upload falhou:', driveErr);
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
      console.error('Erro upload:', err);
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
      }
    }

    setIsUploading(false);
    setCurrentTaskIndex(-1);

    if (allGood && onUploadComplete) {
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
  const totalProgress = tasks.length > 0 ? tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length : 0;

  return {
    tasks,
    isProcessing,
    isUploading,
    currentTaskIndex,
    completedCount,
    errorCount,
    totalProgress,
    handleFolderSelect,
    startUploadProcess,
    handleRetry,
  };
}
