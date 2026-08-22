export { formatDuration } from '../../../utils/format';

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr || dateStr.length !== 8) return '';
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${day}/${month}/${year}`;
};

export const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

export const getVideoId = (videoUrl: string): string | null => {
  try {
    const urlObj = new URL(videoUrl);
    if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    }
    return urlObj.searchParams.get('v');
  } catch {
    return null;
  }
};
