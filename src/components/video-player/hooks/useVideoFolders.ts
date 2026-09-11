import { useState, useEffect, useCallback } from 'react';
import type { VideoItem } from '../../../types';

export function useVideoFolders(videos: VideoItem[], onRefreshVideos: () => Promise<void>) {
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);


  const saveFolders = useCallback(async (newFoldersOrFn: { id: string; name: string }[] | ((prev: { id: string; name: string }[]) => { id: string; name: string }[])) => {
    let nextFolders: { id: string; name: string }[] = [];
    setFolders(prev => {
      nextFolders = typeof newFoldersOrFn === 'function' ? newFoldersOrFn(prev) : newFoldersOrFn;
      return nextFolders;
    });
    if (window.api?.config) {
      await window.api.config.set('videoFolders', nextFolders);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitialFolders = async () => {
      try {
        if (window.api?.config) {
          const data = await window.api.config.get('videoFolders');
          if (isMounted && Array.isArray(data)) setFolders(data);
        }
      } catch (e) {
        console.error('Failed to load folders:', e);
      }
    };
    fetchInitialFolders();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateFolder = useCallback((name: string) => {
    const newFolder = { id: crypto.randomUUID(), name };
    saveFolders(prev => [...prev, newFolder]);
  }, [saveFolders]);

  const handleRenameFolder = useCallback(async (id: string, newName: string) => {
    await saveFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    const videosInFolder = videos.filter(v => v.collection_id === id);
    try {
      if (window.api?.sync) {
        await Promise.all(videosInFolder.map(v => 
          window.api.sync.upsertRow('videos', {
            ...v,
            collection_name: newName,
            updated_at: new Date().toISOString()
          })
        ));
      }
    } catch (e) {
      console.error('Error renaming folder videos:', e);
    }
    await onRefreshVideos();
  }, [videos, saveFolders, onRefreshVideos]);

  const handleDeleteFolder = useCallback(async (id: string) => {
    await saveFolders(prev => prev.filter(f => f.id !== id));
    const videosInFolder = videos.filter(v => v.collection_id === id);
    try {
      if (window.api?.sync) {
        await Promise.all(videosInFolder.map(v => 
          window.api.sync.upsertRow('videos', {
            ...v,
            collection_id: undefined,
            collection_name: undefined,
            updated_at: new Date().toISOString()
          })
        ));
      }
    } catch (e) {
      console.error('Error deleting folder videos:', e);
    }
    await onRefreshVideos();
  }, [videos, saveFolders, onRefreshVideos]);

  const handleMoveVideo = useCallback(async (video: VideoItem, folderId: string | null, folderName: string | null) => {
    if (window.api?.sync) {
      await window.api.sync.upsertRow('videos', {
        ...video,
        collection_id: folderId || undefined,
        collection_name: folderName || undefined,
        updated_at: new Date().toISOString()
      });
      await onRefreshVideos();
    }
  }, [onRefreshVideos]);

  return {
    folders,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveVideo
  };
}
