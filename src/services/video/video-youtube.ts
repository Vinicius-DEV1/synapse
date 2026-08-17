import { getValidAccessToken } from '../drive';
import { uploadLocalFileToDrive } from './video-uploader';
import type { VideoItem } from '../../types';
import type { YouTubeDownloadOptions } from './video-types';

const VIDEO_TABLE = 'videos';

// `window.api.video` (ICadernoAPI, src/api/types.ts) ainda não declara `scanTracks`,
// implementado em src/api/tauri/multimedia.ts.
type DesktopVideoApi = NonNullable<typeof window.api.video> & {
  scanTracks: (localPath: string) => Promise<{ streams?: Array<{ index: number | string; codec_type: string }> }>;
};

/**
 * Baixa um vídeo do YouTube via yt-dlp, salva localmente e faz upload para o Drive.
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

    if (selectedSubs && selectedSubs.length > 0) {
      try {
        const scanResult = await desktopVideoApi.scanTracks(localPath);
        const streams = scanResult?.streams || [];
        const subtitleStreams = streams.filter((s) => s.codec_type === 'subtitle');
        if (subtitleStreams.length > 0) {
          const firstSubIndex = String(subtitleStreams[0].index);
          const vttContent = await desktopVideoApi.extractSubtitles(localPath, firstSubIndex);
          if (vttContent) {
            const subFilename = `${finalFilename}_sub.vtt`;
            const localSubtitlePath = await desktopVideoApi.saveLocal(subFilename, new TextEncoder().encode(vttContent).buffer as ArrayBuffer);
            await uploadLocalFileToDrive(token, localSubtitlePath, subFilename);
          }
        }
      } catch (e) {
        console.error("Falha ao extrair legenda do youtube:", e);
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
