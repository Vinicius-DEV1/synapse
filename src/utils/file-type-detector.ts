/**
 * Centralized file type detector based on file extension and mime type heuristics.
 */
export type FileTypeCategory =
  | 'pdf'
  | 'image'
  | 'video'
  | 'epub'
  | 'slide'
  | 'text'
  | 'archive'
  | 'code'
  | 'other';

export function detectFileType(filename: string): FileTypeCategory {
  const nameLower = filename.toLowerCase();

  if (nameLower.endsWith('.pdf')) {
    return 'pdf';
  }

  if (/\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)$/i.test(nameLower)) {
    return 'image';
  }

  if (/\.(mp4|mkv|webm|mov|avi|flv|wmv|m4v)$/i.test(nameLower)) {
    return 'video';
  }

  if (nameLower.endsWith('.epub')) {
    return 'epub';
  }

  if (/\.(pptx?|key|odp)$/i.test(nameLower)) {
    return 'slide';
  }

  if (/\.(txt|md|markdown|json|csv|xml|js|ts|jsx|tsx|css|html|log|yaml|yml|toml|ini|env)$/i.test(nameLower)) {
    return 'text';
  }

  if (/\.(zip|rar|7z|tar|gz|bz2|xz)$/i.test(nameLower)) {
    return 'archive';
  }

  return 'other';
}
