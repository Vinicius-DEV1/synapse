import type { FileFolder, FileItem } from '../../../types';

export interface FolderTreeNode {
  folder: FileFolder;
  children: FolderTreeNode[];
  itemCount: number;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export interface StorageStats {
  totalBytes: number;
  formattedTotalSize: string;
  fileCount: number;
  driveCount: number;
  localCount: number;
}

/**
 * Formats raw bytes into a human-readable size string.
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  const mb = bytes / (1024 * 1024);
  if (mb < 0.01) return `${(bytes / 1024).toFixed(1)} KB`;
  if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Calculates storage statistics for the vault files.
 */
export function calculateStorageStats(files: FileItem[]): StorageStats {
  let totalBytes = 0;
  let driveCount = 0;
  let localCount = 0;

  for (const file of files) {
    totalBytes += file.file_size || 0;
    if (file.drive_file_id) {
      driveCount++;
    } else {
      localCount++;
    }
  }

  return {
    totalBytes,
    formattedTotalSize: formatBytes(totalBytes),
    fileCount: files.length,
    driveCount,
    localCount,
  };
}

/**
 * Constructs an ordered breadcrumb trail from root to the active folder.
 */
export function getBreadcrumbTrail(
  currentFolderId: string | null,
  folders: FileFolder[],
  rootLabel = 'Início'
): BreadcrumbItem[] {
  const trail: BreadcrumbItem[] = [{ id: null, name: rootLabel }];

  if (!currentFolderId) {
    return trail;
  }

  const folderMap = new Map<string, FileFolder>();
  for (const f of folders) {
    folderMap.set(f.id, f);
  }

  const path: BreadcrumbItem[] = [];
  let current: FileFolder | undefined = folderMap.get(currentFolderId);
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift({ id: current.id, name: current.name });
    current = current.parent_id ? folderMap.get(current.parent_id) : undefined;
  }

  return [...trail, ...path];
}

/**
 * Returns a Set of all descendant folder IDs for a given folder ID,
 * preventing cyclic hierarchies (e.g. moving a folder into its child).
 */
export function getDescendantFolderIds(folderId: string, folders: FileFolder[]): Set<string> {
  const descendants = new Set<string>();
  const childrenMap = new Map<string, string[]>();

  for (const f of folders) {
    if (f.parent_id) {
      const list = childrenMap.get(f.parent_id) || [];
      list.push(f.id);
      childrenMap.set(f.parent_id, list);
    }
  }

  const queue = [folderId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const children = childrenMap.get(curr) || [];
    for (const childId of children) {
      if (!descendants.has(childId)) {
        descendants.add(childId);
        queue.push(childId);
      }
    }
  }

  return descendants;
}

/**
 * Organizes flat folder records into a nested tree structure.
 */
export function buildFolderTree(
  folders: FileFolder[],
  files: FileItem[]
): FolderTreeNode[] {
  const fileCountByFolder = new Map<string, number>();
  for (const file of files) {
    if (file.folder_id) {
      fileCountByFolder.set(
        file.folder_id,
        (fileCountByFolder.get(file.folder_id) || 0) + 1
      );
    }
  }

  const nodeMap = new Map<string, FolderTreeNode>();
  for (const folder of folders) {
    nodeMap.set(folder.id, {
      folder,
      children: [],
      itemCount: fileCountByFolder.get(folder.id) || 0,
    });
  }

  const rootNodes: FolderTreeNode[] = [];

  for (const folder of folders) {
    const node = nodeMap.get(folder.id)!;
    if (folder.parent_id && nodeMap.has(folder.parent_id)) {
      const parentNode = nodeMap.get(folder.parent_id)!;
      parentNode.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  // Sort nodes alphabetically by name
  const sortNodes = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) => a.folder.name.localeCompare(b.folder.name));
    for (const n of nodes) {
      sortNodes(n.children);
    }
  };
  sortNodes(rootNodes);

  return rootNodes;
}
