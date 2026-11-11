import { useMemo } from 'react';
import type { FileFolder, FileItem } from '../../../types';
import type { FileSectionType } from './useFilesExplorer';
import { getBreadcrumbTrail } from '../utils/filesHierarchy';

interface UseFilesViewDerivedParams {
  currentFolderId: string | null;
  folders: FileFolder[];
  activeSection: FileSectionType;
  visibleFiles: FileItem[];
}

export function useFilesViewDerived({
  currentFolderId,
  folders,
  activeSection,
  visibleFiles,
}: UseFilesViewDerivedParams) {
  const currentFolder = useMemo(() => {
    return folders.find((f) => f.id === currentFolderId) || null;
  }, [folders, currentFolderId]);

  const breadcrumbs = useMemo(() => {
    const rootLabel =
      activeSection === 'folders'
        ? 'Início'
        : activeSection === 'all'
        ? 'Todos os Arquivos'
        : activeSection === 'recent'
        ? 'Recentes'
        : 'Google Drive';

    if (activeSection !== 'folders') {
      return [{ id: null, name: rootLabel }];
    }
    return getBreadcrumbTrail(currentFolderId, folders, 'Início');
  }, [currentFolderId, folders, activeSection]);

  const folderTotalBytes = useMemo(() => {
    return visibleFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);
  }, [visibleFiles]);

  return {
    currentFolder,
    breadcrumbs,
    folderTotalBytes,
  };
}
