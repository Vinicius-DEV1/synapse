import { isDesktopApp } from '../../../services/platform';

/**
 * Supported image extensions for clipboard path and URI detection.
 */
export const IMAGE_EXTENSIONS_REGEX = /\.(png|jpe?g|webp|gif|svg|bmp|avif|ico|tiff?)$/i;

/**
 * Common MIME type mapping for image file extensions.
 */
const MIME_TYPE_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  tif: 'image/tiff',
  tiff: 'image/tiff',
};

/**
 * Maps a file path or extension to its corresponding image MIME type.
 */
export function getMimeTypeFromPath(filePath: string): string {
  const extMatch = filePath.match(IMAGE_EXTENSIONS_REGEX);
  if (extMatch && extMatch[1]) {
    const ext = extMatch[1].toLowerCase();
    return MIME_TYPE_MAP[ext] || 'image/jpeg';
  }
  return 'image/jpeg';
}

/**
 * Checks whether a given path or filename has a supported image extension.
 */
export function isImageFilePath(pathOrName: string): boolean {
  if (!pathOrName) return false;
  return IMAGE_EXTENSIONS_REGEX.test(pathOrName.trim());
}

/**
 * Extracts clean local file paths from a clipboard string (e.g. text/plain or text/uri-list).
 * Handles Linux, macOS, and Windows file paths as well as file:// URIs.
 */
export function extractLocalImagePaths(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);

  const resolvedPaths: string[] = [];

  for (const line of lines) {
    let candidate = line;

    // Handle file:// URIs
    if (candidate.startsWith('file://')) {
      try {
        const parsedUrl = new URL(candidate);
        // On Unix, pathname starts with /home/...; on Windows, pathname starts with /C:/...
        candidate = decodeURIComponent(parsedUrl.pathname);
        // Windows drive letter fix: /C:/path -> C:/path
        if (/^\/[a-zA-Z]:/.test(candidate)) {
          candidate = candidate.slice(1);
        }
      } catch {
        candidate = decodeURIComponent(candidate.replace(/^file:\/\//, ''));
      }
    }

    // Must be an absolute Unix path or Windows drive/UNC path
    const isUnixPath = candidate.startsWith('/');
    const isWindowsPath = /^[a-zA-Z]:[/\\]/.test(candidate) || candidate.startsWith('\\\\');

    if ((isUnixPath || isWindowsPath) && isImageFilePath(candidate)) {
      resolvedPaths.push(candidate);
    }
  }

  return Array.from(new Set(resolvedPaths));
}

/**
 * Extracts immediate image File objects from ClipboardEvent data (items and files lists).
 */
export function extractImageFilesFromClipboard(event: ClipboardEvent): File[] {
  const collectedFiles: File[] = [];
  const seenNames = new Set<string>();

  const addFile = (file: File | null) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/') || isImageFilePath(file.name);
    if (!isImage) return;

    const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
    if (!seenNames.has(fileKey)) {
      seenNames.add(fileKey);
      collectedFiles.push(file);
    }
  };

  const items = Array.from(event.clipboardData?.items || []);
  for (const item of items) {
    if (item.type.startsWith('image/') || item.kind === 'file') {
      const file = item.getAsFile();
      addFile(file);
    }
  }

  const files = Array.from(event.clipboardData?.files || []);
  for (const file of files) {
    addFile(file);
  }

  return collectedFiles;
}

/**
 * Reads a local image file from disk and converts it into a web File object.
 * Uses Tauri asset protocol (`convertFileSrc`) as primary strategy, with
 * `@tauri-apps/plugin-fs` as fallback.
 */
export async function readLocalImageAsFile(filePath: string): Promise<File | null> {
  if (!filePath || !isDesktopApp()) {
    return null;
  }

  const filename = filePath.split(/[/\\]/).pop() || 'image.png';
  const defaultMime = getMimeTypeFromPath(filePath);

  // Strategy 1: Tauri v2 asset protocol streaming via convertFileSrc
  try {
    const { convertFileSrc } = await import('@tauri-apps/api/core');
    const assetUrl = convertFileSrc(filePath);
    const response = await fetch(assetUrl);
    if (response.ok) {
      const blob = await response.blob();
      const mimeType = blob.type && blob.type.startsWith('image/') ? blob.type : defaultMime;
      return new File([blob], filename, { type: mimeType });
    }
  } catch (err) {
    console.warn('[clipboardMediaUtils] convertFileSrc fetch fallback:', err);
  }

  // Strategy 2: Tauri plugin-fs direct read fallback
  try {
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const rawBytes = await readFile(filePath);
    if (rawBytes && rawBytes.byteLength > 0) {
      const blob = new Blob([rawBytes], { type: defaultMime });
      return new File([blob], filename, { type: defaultMime });
    }
  } catch (err) {
    console.warn('[clipboardMediaUtils] plugin-fs readFile fallback:', err);
  }

  return null;
}

/**
 * Resolves all image files from a ClipboardEvent:
 * 1. Immediate File objects in clipboardData.items / files.
 * 2. If none, checks for local file paths or URIs in text/plain or text/uri-list
 *    and loads them from disk if running in desktop mode.
 */
export async function resolveClipboardImages(event: ClipboardEvent): Promise<File[]> {
  const directFiles = extractImageFilesFromClipboard(event);
  if (directFiles.length > 0) {
    return directFiles;
  }

  if (!isDesktopApp()) {
    return [];
  }

  const plainText = event.clipboardData?.getData('text/plain') || '';
  const uriList = event.clipboardData?.getData('text/uri-list') || '';
  const combined = `${plainText}\n${uriList}`;

  const paths = extractLocalImagePaths(combined);
  if (paths.length === 0) {
    return [];
  }

  const loadedFiles = await Promise.all(paths.map((p) => readLocalImageAsFile(p)));
  return loadedFiles.filter((f): f is File => f !== null);
}
