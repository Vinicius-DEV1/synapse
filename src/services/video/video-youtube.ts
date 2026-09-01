import { getValidAccessToken } from '../drive';
import { uploadLocalFileToDrive } from './video-uploader';
import type { VideoItem, TrackItem } from '../../types';
import type { YouTubeDownloadOptions, DesktopVideoApi } from './video-types';

const VIDEO_TABLE = 'videos';

/**
 * Downloads YouTube video via yt-dlp, saves locally and uploads to Drive.
 */
export async function downloadYouTubeAndSync(options: YouTubeDownloadOptions): Promise<VideoItem> {
  const { url, quality, filename, youtubeInfo, collectionId, collectionName, selectedSubs, onProgress } = options;
  
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  if (!window.api?.youtube) {
    throw new Error("YouTube downloader não está disponível (desktop apenas).");
  }
  if (!window.api.video) {
    throw new Error("API de vídeo não está disponível (desktop apenas).");
  }
  const desktopVideoApi = window.api.video as DesktopVideoApi;

  let unsubscribe: (() => void) | undefined;
  if (onProgress) {
    unsubscribe = window.api.youtube.onProgress((percent: number) => {
      onProgress(percent * 0.95);
    });
  }

  try {
    // 1. Download
    const localPath = await window.api.youtube.download(url, filename, quality, selectedSubs);
    const finalFilename = localPath.split(/[\\/]/).pop() || filename.replace(/\.mp4$/, '.mkv');

    const subtitleTracksList: TrackItem[] = [];
    if (selectedSubs && selectedSubs.length > 0 && desktopVideoApi.scanTracks && desktopVideoApi.extractSubtitles && desktopVideoApi.saveLocal) {
      try {
        const scanResult = await desktopVideoApi.scanTracks(localPath);
        const streams = scanResult?.streams || [];
        const subtitleStreams = streams.filter((s: { codec_type?: string; index?: number | string; tags?: { language?: string; title?: string } }) => s.codec_type === 'subtitle');
        if (subtitleStreams.length > 0) {
          const firstSubIndex = String(subtitleStreams[0].index);
          const vttContent = await desktopVideoApi.extractSubtitles(localPath, firstSubIndex);
          if (vttContent) {
            const subFilename = `${finalFilename}_sub.vtt`;
            const localSubtitlePath = await desktopVideoApi.saveLocal(subFilename, new TextEncoder().encode(vttContent).buffer as ArrayBuffer);
            const subDriveId = await uploadLocalFileToDrive(token, localSubtitlePath, subFilename);
            const langLabel = subtitleStreams[0].tags?.language || subtitleStreams[0].tags?.title || 'Português / Legenda';
            subtitleTracksList.push({
              id: firstSubIndex,
              label: langLabel,
              drive_id: subDriveId,
              local_path: localSubtitlePath
            });
          }
        }
      } catch (e: unknown) {
        console.error("Falha ao extrair legenda do youtube:", e instanceof Error ? e.message : String(e));
      }
    }

    // 2. Upload
    const driveFileId = await uploadLocalFileToDrive(token, localPath, finalFilename, (p) => {
      if (onProgress) onProgress(95 + (p * 0.05));
    });

    // 3. Database
    const newVideo: VideoItem = {
      id: crypto.randomUUID(),
      title: finalFilename.replace(/\.[^/.]+$/, ""),
      original_name: finalFilename,
      drive_file_id: driveFileId,
      subtitles_json: subtitleTracksList.length > 0 ? JSON.stringify(subtitleTracksList) : undefined,
      is_local: true,
      file_path: localPath,
      progress: 0,
      collection_id: collectionId,
      collection_name: collectionName,
      youtube_url: url,
      youtube_description: youtubeInfo?.description,
      duration: youtubeInfo?.duration || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (window.api?.sync) {
      await window.api.sync.upsertRow(VIDEO_TABLE, newVideo);
    }

    if (onProgress) onProgress(100);

    return newVideo;
  } finally {
    if (unsubscribe) unsubscribe();
  }
}
