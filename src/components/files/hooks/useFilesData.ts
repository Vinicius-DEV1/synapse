import { useState, useEffect, useCallback } from 'react';
import type { FileFolder, FileItem } from '../../../types';
import { useStore } from '../../../store/useStore';
import { getValidAccessToken } from '../../../services/drive';
import { getDecryptedFileUrl } from '../../../utils/file-fetcher';
import { triggerToast } from '../../ui/ToastContext';

export function useFilesData() {
  const { state } = useStore();
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [driveStatus, setDriveStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  const loadData = useCallback(async () => {
    if (window.api && window.api.files) {
      try {
        const fs = await window.api.files.getAll();
        const fds = await window.api.files.folders.getAll();
        setFiles(fs || []);
        setFolders(fds || []);
      } catch (err: unknown) {
        console.error('Erro ao carregar arquivos/pastas:', err);
        const msg = err instanceof Error ? err.message : 'Erro ao carregar lista de arquivos';
        triggerToast(msg, 'error');
      }
    }
  }, []);

  const handleDownload = useCallback(async (item: FileItem) => {
    try {
      const url = await getDecryptedFileUrl(item, state.moduleKeys['files']);
      
      if (url && typeof url === 'string') {
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        triggerToast(`Download iniciado: ${item.name}`, 'info');
        
        // Revoke blob URL safely after 60s to prevent early revocation during large file disk writing
        if (url.startsWith('blob:')) {
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
      } else {
        triggerToast("Arquivo não está disponível para download local nem na nuvem.", "error");
      }
    } catch (err: unknown) {
      console.error("Failed to download", err);
      const msg = err instanceof Error ? err.message : "Erro ao tentar baixar o arquivo.";
      triggerToast(msg, "error");
    }
  }, [state.moduleKeys]);

  const renameItem = useCallback(async (id: string, newName: string, isFolder: boolean) => {
    if (window.api && window.api.files) {
      if (isFolder) {
        const folder = folders.find(f => f.id === id);
        if (folder) {
          await window.api.files.folders.update({ ...folder, name: newName });
        }
      } else {
        const file = files.find(f => f.id === id);
        if (file) {
          await window.api.files.update({ ...file, name: newName });
        }
      }
      await loadData();
    }
  }, [folders, files, loadData]);

  const moveItems = useCallback(async (id: string, targetFolderId: string | null, isFolder: boolean) => {
    if (window.api && window.api.files) {
      if (isFolder) {
        const folder = folders.find(f => f.id === id);
        if (folder) {
          await window.api.files.folders.update({ ...folder, parent_id: targetFolderId });
        }
      } else {
        await window.api.files.move(id, targetFolderId);
      }
      setSelectedIds(new Set());
      await loadData();
    }
  }, [folders, loadData]);

  useEffect(() => {
    loadData();
    getValidAccessToken()
      .then(token => setDriveStatus(token ? 'connected' : 'disconnected'))
      .catch(() => setDriveStatus('disconnected'));
    
    const handleNavigateFolder = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setSelectedFolderId(customEvent.detail ?? null);
    };
    
    window.addEventListener('navigate-folder', handleNavigateFolder);
    const handleFileUpdate = () => {
      loadData();
    };
    window.addEventListener('caderno-file-updated', handleFileUpdate);
    window.addEventListener('app-sync-trigger', handleFileUpdate);

    return () => {
      window.removeEventListener('navigate-folder', handleNavigateFolder);
      window.removeEventListener('caderno-file-updated', handleFileUpdate);
      window.removeEventListener('app-sync-trigger', handleFileUpdate);
    };
  }, [loadData]);

  const toggleSelect = useCallback((fileId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((currentFiles: FileItem[]) => {
    setSelectedIds(prev => {
      if (currentFiles.length > 0 && prev.size === currentFiles.length) {
        return new Set();
      }
      return new Set(currentFiles.map(f => f.id));
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    folders,
    files,
    selectedFolderId,
    setSelectedFolderId,
    searchQuery,
    setSearchQuery,
    selectedIds,
    setSelectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    driveStatus,
    setDriveStatus,
    loadData,
    handleDownload,
    renameItem,
    moveItems,
  };
}
