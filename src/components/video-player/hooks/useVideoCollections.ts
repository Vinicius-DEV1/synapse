import { useState, useMemo } from 'react';
import type { VideoItem } from '../../../types';

export interface VideoCollection {
  id: string;
  name: string;
  count: number;
  totalDuration: number;
  videos: VideoItem[];
}

export function useVideoCollections(
  videos: VideoItem[],
  folders: { id: string; name: string }[] = [],
  onActiveCollectionChange?: (id: string | null, name: string | null) => void
) {
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  const { collectionsMap, standaloneVideos, mergedCollections } = useMemo(() => {
    const colMap = new Map<string, VideoCollection>();
    const standalone: VideoItem[] = [];

    videos.forEach((v) => {
      if (v.collection_id) {
        if (!colMap.has(v.collection_id)) {
          colMap.set(v.collection_id, {
            id: v.collection_id,
            name: v.collection_name || 'Playlist',
            count: 0,
            totalDuration: 0,
            videos: [],
          });
        }
        const c = colMap.get(v.collection_id)!;
        c.count++;
        c.totalDuration += v.duration || 0;
        c.videos.push(v);
      } else {
        standalone.push(v);
      }
    });

    const allFolderIds = new Set<string>();
    folders.forEach((f) => allFolderIds.add(f.id));
    colMap.forEach((_, id) => allFolderIds.add(id));

    const merged: VideoCollection[] = [];
    allFolderIds.forEach((id) => {
      const fromMap = colMap.get(id);
      const fromFolder = folders.find((f) => f.id === id);
      merged.push({
        id,
        name: fromFolder?.name || fromMap?.name || 'Pasta',
        count: fromMap?.count || 0,
        totalDuration: fromMap?.totalDuration || 0,
        videos: fromMap?.videos || [],
      });
    });

    return {
      collectionsMap: colMap,
      standaloneVideos: standalone,
      mergedCollections: merged,
    };
  }, [videos, folders]);

  const displayVideos = activeCollectionId
    ? collectionsMap.get(activeCollectionId)?.videos || []
    : standaloneVideos;

  const activeCollectionName = activeCollectionId
    ? mergedCollections.find((c) => c.id === activeCollectionId)?.name || ''
    : '';

  const handleSelectCollection = (id: string | null, name: string | null = null) => {
    setActiveCollectionId(id);
    if (onActiveCollectionChange) {
      if (!id) {
        onActiveCollectionChange(null, null);
      } else {
        const colName = name || mergedCollections.find((c) => c.id === id)?.name || null;
        onActiveCollectionChange(id, colName);
      }
    }
  };

  const availableFolders = mergedCollections.filter((c) => c.id !== activeCollectionId);

  return {
    activeCollectionId,
    activeCollectionName,
    displayVideos,
    mergedCollections,
    availableFolders,
    handleSelectCollection,
  };
}
