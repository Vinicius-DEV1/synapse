import { useState, useEffect, useCallback } from 'react';
import type { FileFolder, FileItem } from '../../../types';
import { useStore } from '../../../store/useStore';
import { getValidAccessToken } from '../../../services/drive';
import { getDecryptedFileUrl } from '../../../utils/file-fetcher';

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
      const fs = await window.api.files.getAll();
      const fds = await window.api.files.folders.getAll();
      setFiles(fs || []);
      setFolders(fds || []);
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
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        alert("Arquivo não está disponível para download.");
      }
    } catch (err) {
      console.error("Failed to download", err);
      alert("Erro ao tentar baixar o arquivo.");
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
    
    const handleNavigateFolder = (e: any) => {
      const folderId = e.detail;
      setSelectedFolderId(folderId);
    };
    
    window.addEventListener('navigate-folder', handleNavigateFolder);
    return () => window.removeEventListener('navigate-folder', handleNavigateFolder);
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
    if (selectedIds.size === currentFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentFiles.map(f => f.id)));
    }
  }, [selectedIds.size]);

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
