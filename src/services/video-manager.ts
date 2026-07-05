import { getValidAccessToken, getOrCreateAppFolder, uploadToDrive, downloadFromDrive } from './drive';
import type { VideoItem } from '../types_video';

// Tabela sincronizada que vai guardar os metadados dos vídeos
const VIDEO_TABLE = 'videos';

/**
 * Obtém link de streaming a partir do ID do Drive.
 */
export async function getVideoStreamLink(driveFileId: string): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");
  
  // Usa o protocolo customizado do Electron. Colocamos o ID no pathname porque o hostname é convertido para minúsculo pelo URL parser
  return `stream-drive://api/${driveFileId}?token=${token}`;
}

/**
 * Baixa um vídeo do drive e salva localmente (apenas Desktop)
 */
export async function downloadVideoToLocal(video: VideoItem): Promise<string> {
  if (!window.api?.video) {
    throw new Error("Download local só está disponível no ambiente Desktop.");
  }
  
  if (!video.drive_file_id) throw new Error("Vídeo não está no Drive.");
  
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  const buffer = await downloadFromDrive(token, video.drive_file_id);
  const localPath = await window.api.video.saveLocal(video.original_name, buffer);
  
  // Atualiza banco de dados marcando como local
  await window.api.sync.upsertRow(VIDEO_TABLE, {
    ...video,
    is_local: true,
    file_path: localPath,
    updated_at: new Date().toISOString()
  });

  return localPath;
}

/**
 * Verifica se um vídeo está disponível localmente.
 * Se sim, retorna a URL com protocolo file://. Se não, retorna link do Drive.
 */
export async function resolveVideoUrl(video: VideoItem): Promise<string> {
  if (window.api?.video && video.is_local) {
    const localPath = await window.api.video.getLocalPath(video.original_name);
    if (localPath) {
      // Para Electron carregar vídeos locais, precisamos usar o protocolo file://
      return `file://${localPath.replace(/\\/g, '/')}`;
    }
  }

  if (video.drive_file_id) {
    return getVideoStreamLink(video.drive_file_id);
  }

  throw new Error("Vídeo não foi encontrado nem localmente nem na nuvem.");
}

import type { UploadOptions } from '../components/video-player/VideoUploadModal';
import type { TrackItem } from '../types_video';

/**
 * Helper to upload a local file to Drive via fetch
 */
async function uploadLocalFileToDrive(token: string, localPath: string, driveFileName: string, onProgress?: (p: number) => void) {
  const fileReq = await fetch('file:///' + localPath.replace(/\\/g, '/'));
  const blob = await fileReq.blob();
  const buffer = await blob.arrayBuffer();
  const { uploadToDrive } = await import('./drive');
  return await uploadToDrive(token, driveFileName, buffer, false, onProgress);
}

/**
 * Faz upload de um novo vídeo para o Google Drive e o registra no DB.
 */
export async function uploadNewVideo(options: UploadOptions): Promise<VideoItem> {
  const { videoFile: file, subtitleText, duration, primaryAudioTrack, extraAudioTracks = [], extraSubtitleTracks = [], onProgress } = options;
  
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  let isLocal = false;
  let localPath: string | undefined = undefined;
  let mainFileId = '';
  
  const sourcePath = (file as any).electronPath;
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  
  if (onProgress) onProgress(5); 

  if (sourcePath && window.api?.video) {
    try {
      if (primaryAudioTrack && (window.api.video as any).remuxDefaultTrack) {
        if (onProgress) onProgress(15); 
        // 1. Remux the video
        localPath = await (window.api.video as any).remuxDefaultTrack(sourcePath, file.name, primaryAudioTrack);
        isLocal = true;
        
        if (onProgress) onProgress(40);
        // Upload the remuxed video instead of the original
        mainFileId = await uploadLocalFileToDrive(token, localPath, file.name, (p) => {
          if (onProgress) onProgress(40 + (p * 0.3)); // 40 to 70%
        });
      } else if (window.api.video.copyLocal) {
        // Fallback or no primary track selected
        localPath = await window.api.video.copyLocal(sourcePath, file.name);
        isLocal = true;
        
        if (onProgress) onProgress(40);
        const buffer = await file.arrayBuffer();
        mainFileId = await uploadToDrive(token, file.name, buffer, false, (p) => {
          if (onProgress) onProgress(40 + (p * 0.3));
        });
      }
    } catch (e) {
      console.warn("Não foi possível processar o vídeo localmente:", e);
    }
  }

  // If local processing failed or it's a pure web file
  if (!mainFileId) {
    const buffer = await file.arrayBuffer();
    mainFileId = await uploadToDrive(token, file.name, buffer, false, (p) => {
      if (onProgress) onProgress(10 + (p * 0.6));
    });
  }

  if (onProgress) onProgress(75);

  // 2. Extract and Upload Extra Audios
  const audioTracksList: TrackItem[] = [];
  if (sourcePath && window.api?.video && extraAudioTracks.length > 0) {
    for (const track of extraAudioTracks) {
      try {
        const audioOutPath = await (window.api.video as any).extractAudio(sourcePath, track);
        if (audioOutPath) {
          const driveFileName = `${baseName} - Audio ${track.replace(/:/g, '')}.m4a`;
          const audioDriveId = await uploadLocalFileToDrive(token, audioOutPath, driveFileName);
          audioTracksList.push({
            id: track,
            label: `Áudio ${track}`,
            drive_id: audioDriveId,
            local_path: audioOutPath
          });
        }
      } catch (err) {
        console.error(`Falha ao extrair/upar áudio extra ${track}:`, err);
      }
    }
  }

  if (onProgress) onProgress(85);

  // 3. Extract and Upload Extra Subtitles
  const subtitleTracksList: TrackItem[] = [];
  
  // Custom external subtitle (Legacy main subtitle)
  let mainSubtitleId = null;
  if (subtitleText) {
    const enc = new TextEncoder();
    const subBuffer = enc.encode(subtitleText).buffer;
    mainSubtitleId = await uploadToDrive(token, `${file.name}.vtt`, subBuffer, false);
  }

  // Embedded extra subtitles
  if (sourcePath && window.api?.video && extraSubtitleTracks.length > 0) {
    for (const track of extraSubtitleTracks) {
      try {
        const vttText = await window.api.video.extractSubtitles(sourcePath, track);
        if (vttText) {
          const enc = new TextEncoder();
          const subBuffer = enc.encode(vttText).buffer;
          const driveFileName = `${baseName} - Legenda ${track.replace(/:/g, '')}.vtt`;
          const subDriveId = await uploadToDrive(token, driveFileName, subBuffer, false);
          
          subtitleTracksList.push({
            id: track,
            label: `Legenda ${track}`,
            drive_id: subDriveId
          });
        }
      } catch (err) {
        console.error(`Falha ao extrair/upar legenda extra ${track}:`, err);
      }
    }
  }

  if (onProgress) onProgress(99);

  const newVideo: VideoItem = {
    id: crypto.randomUUID(),
    title: baseName,
    original_name: file.name,
    drive_file_id: mainFileId,
    drive_subtitle_id: mainSubtitleId || undefined,
    is_local: isLocal,
    file_path: localPath,
    audio_tracks_json: JSON.stringify(audioTracksList),
    subtitles_json: JSON.stringify(subtitleTracksList),
    progress: 0,
    duration: duration,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (window.api?.sync) {
    await window.api.sync.upsertRow(VIDEO_TABLE, newVideo);
  }

  if (onProgress) onProgress(100);

  return newVideo;
}

/**
 * Baixa as legendas (VTT) como texto.
 */
export async function getSubtitleText(driveSubtitleId?: string, localSubtitlePath?: string): Promise<string | null> {
  if (!driveSubtitleId && !localSubtitlePath) return null;

  try {
    if (driveSubtitleId) {
      const token = await getValidAccessToken();
      if (!token) return null;
      
      const buffer = await downloadFromDrive(token, driveSubtitleId);
      return new TextDecoder().decode(buffer);
    }
    // Lógica para ler legenda local via Electron se necessário
    return null;
  } catch (e) {
    console.error("Falha ao ler legendas", e);
    return null;
  }
}

export interface YouTubeDownloadOptions {
  url: string;
  quality: string;
  filename: string;
  youtubeInfo?: any; 
  collectionId?: string;
  collectionName?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Baixa um vídeo do YouTube via yt-dlp, salva localmente e faz upload para o Drive.
 */
export async function downloadYouTubeAndSync(options: YouTubeDownloadOptions): Promise<VideoItem> {
  const { url, quality, filename, youtubeInfo, collectionId, collectionName, onProgress } = options;
  
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  if (!window.api?.youtube) {
    throw new Error("YouTube downloader não está disponível (desktop apenas).");
  }

  let unsubscribe: (() => void) | undefined;
  if (onProgress) {
    unsubscribe = window.api.youtube.onProgress((percent) => {
      // Reservamos os 95% para o download do yt-dlp
      onProgress(percent * 0.95);
    });
  }

  try {
    // 1. Download
    const localPath = await window.api.youtube.download(url, filename, quality);
    
    // 2. Upload
    const driveFileId = await uploadLocalFileToDrive(token, localPath, filename, (p) => {
      if (onProgress) onProgress(95 + (p * 0.05)); // 95% a 100% para o upload
    });

    // 3. Database
    const newVideo: VideoItem = {
      id: crypto.randomUUID(),
      title: filename.replace(/\.[^/.]+$/, ""),
      original_name: filename,
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
