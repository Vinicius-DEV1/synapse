import { useState, useCallback, useEffect } from 'react';
import type { FileFolder, FileItem } from '../../../types';
import { detectFileType } from '../../../utils/file-type-detector';

export type FileViewMode = 'grid' | 'table';
export type FileSortColumn = 'name' | 'size' | 'updated_at' | 'type';
export type FileSortOrder = 'asc' | 'desc';
export type FileCategoryFilter =
  | 'all'
  | 'pdf'
  | 'epub'
  | 'image'
  | 'video'
  | 'text'
  | 'code'
  | 'archive';
export type FileSectionType = 'folders' | 'all' | 'recent' | 'drive';
export type FileSearchScope = 'current' | 'all';

export interface UseFilesExplorerOptions {
  folders: FileFolder[];
  files: FileItem[];
  searchQuery: string;
}

const VIEW_MODE_STORAGE_KEY = 'caderno_files_view_mode';
const INSPECTOR_STORAGE_KEY = 'caderno_files_inspector_open';

export function useFilesExplorer({ folders, files, searchQuery }: UseFilesExplorerOptions) {
  // Navigation history
  const [history, setHistory] = useState<(string | null)[]>([null]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const currentFolderId = history[historyIndex] ?? null;

  // Active section
  const [activeSection, setActiveSection] = useState<FileSectionType>('folders');

  // View mode
  const [viewMode, setViewModeState] = useState<FileViewMode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return saved === 'table' ? 'table' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const setViewMode = useCallback((mode: FileViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Could not persist view mode:', e);
    }
  }, []);

  // Inspector panel
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(INSPECTOR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleInspector = useCallback(() => {
    setIsInspectorOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(INSPECTOR_STORAGE_KEY, String(next));
      } catch (e) {
        console.warn('Could not persist inspector state:', e);
      }
      return next;
    });
  }, []);

  // Focused item for inspector preview
  const [focusedItem, setFocusedItem] = useState<{ item: FileItem | FileFolder; isFolder: boolean } | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<FileSortColumn>('name');
  const [sortOrder, setSortOrder] = useState<FileSortOrder>('asc');

  const toggleSort = useCallback((column: FileSortColumn) => {
    setSortBy((prevCol) => {
      if (prevCol === column) {
        setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
        return column;
      } else {
        setSortOrder('asc');
        return column;
      }
    });
  }, []);

  // Category filter chips
  const [categoryFilter, setCategoryFilter] = useState<FileCategoryFilter>('all');

  // Search scope ('current' = in active folder, 'all' = across all vault folders)
  const [searchScope, setSearchScope] = useState<FileSearchScope>('current');

  // Navigation handlers
  const navigateToFolder = useCallback((folderId: string | null) => {
    setActiveSection('folders');
    setHistory((prev) => {
      const current = prev[historyIndex];
      if (current === folderId) return prev;
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, folderId];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setActiveSection('folders');
    }
  }, [historyIndex]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setActiveSection('folders');
    }
  }, [historyIndex, history.length]);

  const goUpOneLevel = useCallback(() => {
    if (activeSection !== 'folders' || currentFolderId === null) {
      return;
    }
    const currentFolder = folders.find((f) => f.id === currentFolderId);
    const parentId = currentFolder?.parent_id ?? null;
    navigateToFolder(parentId);
  }, [activeSection, currentFolderId, folders, navigateToFolder]);

  // Navigate to special section
  const selectSection = useCallback((section: FileSectionType) => {
    setActiveSection(section);
  }, []);

  // External event listener for cross-module folder navigation (e.g. from editor widget or search)
  useEffect(() => {
    const handleNavigateFolder = (e: Event) => {
      const customEvent = e as CustomEvent<string | null | { folderId?: string }>;
      const targetId =
        typeof customEvent.detail === 'string'
          ? customEvent.detail
          : customEvent.detail && typeof customEvent.detail === 'object' && 'folderId' in customEvent.detail
          ? customEvent.detail.folderId ?? null
          : null;
      navigateToFolder(targetId);
    };

    window.addEventListener('navigate-folder', handleNavigateFolder);
    return () => {
      window.removeEventListener('navigate-folder', handleNavigateFolder);
    };
  }, [navigateToFolder]);

  // Folder deletion recovery: if current folder was deleted, navigate up to its parent or root
  const handleFolderDeleted = useCallback(
    (deletedFolderId: string) => {
      if (currentFolderId === deletedFolderId) {
        const deletedFolder = folders.find((f) => f.id === deletedFolderId);
        navigateToFolder(deletedFolder?.parent_id ?? null);
      }
    },
    [currentFolderId, folders, navigateToFolder]
  );

  // Filter subfolders: only shown in 'folders' section, matching current parent (or any folder if searching globally)
  const visibleSubfolders =
    activeSection === 'folders'
      ? folders
          .filter((f) => {
            if (searchQuery.trim() && searchScope === 'all') return true;
            return f.parent_id === currentFolderId;
          })
          .filter((f) => !searchQuery.trim() || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : [];

  // Filter files based on section, folder, category and search
  const visibleFiles = files.filter((file) => {
    // 1. Section & Folder filtering
    if (activeSection === 'folders') {
      const bypassFolder = Boolean(searchQuery.trim() && searchScope === 'all');
      if (!bypassFolder && file.folder_id !== currentFolderId) return false;
    } else if (activeSection === 'drive') {
      if (!file.drive_file_id) return false;
    } else if (activeSection === 'recent') {
      // Last 30 days
      const updated = file.updated_at ? new Date(file.updated_at).getTime() : 0;
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (updated < thirtyDaysAgo) return false;
    }
    // 'all' includes every file

    // 2. Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!file.name.toLowerCase().includes(q)) return false;
    }

    // 3. Category filtering
    if (categoryFilter !== 'all') {
      const type = file.file_type || detectFileType(file.name);
      if (categoryFilter === 'pdf' && type !== 'pdf') return false;
      if (categoryFilter === 'epub' && type !== 'epub') return false;
      if (categoryFilter === 'image' && type !== 'image') return false;
      if (categoryFilter === 'video' && type !== 'video') return false;
      if (categoryFilter === 'text' && type !== 'text') return false;
      if (categoryFilter === 'code' && type !== 'code') return false;
      if (categoryFilter === 'archive' && type !== 'archive') return false;
    }

    return true;
  });

  // Sort folders
  const sortedSubfolders = [...visibleSubfolders].sort((a, b) => {
    const res = a.name.localeCompare(b.name);
    return sortOrder === 'asc' ? res : -res;
  });

  // Sort files
  const sortedFiles = [...visibleFiles].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'name') {
      comp = a.name.localeCompare(b.name);
    } else if (sortBy === 'size') {
      comp = (a.file_size || 0) - (b.file_size || 0);
    } else if (sortBy === 'updated_at') {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      comp = dateA - dateB;
    } else if (sortBy === 'type') {
      const typeA = a.file_type || detectFileType(a.name);
      const typeB = b.file_type || detectFileType(b.name);
      comp = typeA.localeCompare(typeB);
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  // Clear focused item if it no longer exists
  useEffect(() => {
    if (focusedItem) {
      if (focusedItem.isFolder) {
        if (!folders.some((f) => f.id === focusedItem.item.id)) {
          setFocusedItem(null);
        }
      } else {
        if (!files.some((f) => f.id === focusedItem.item.id)) {
          setFocusedItem(null);
        }
      }
    }
  }, [folders, files, focusedItem]);

  return {
    currentFolderId,
    activeSection,
    selectSection,
    navigateToFolder,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    goUpOneLevel,
    viewMode,
    setViewMode,
    isInspectorOpen,
    toggleInspector,
    setIsInspectorOpen,
    focusedItem,
    setFocusedItem,
    sortBy,
    sortOrder,
    toggleSort,
    setSortBy,
    setSortOrder,
    categoryFilter,
    setCategoryFilter,
    searchScope,
    setSearchScope,
    handleFolderDeleted,
    subfolders: sortedSubfolders,
    files: sortedFiles,
    totalFilesCount: visibleFiles.length,
    totalSubfoldersCount: sortedSubfolders.length,
  };
}
