import { getValidAccessToken, uploadToDrive, deleteFromDrive } from '../drive';
import type { VideoItem, TrackItem } from '../../types';
import type { UploadStats, UploadOptions, DesktopVideoApi } from './video-types';
import { uploadLocalFileToDrive } from './drive-resumable-session';

export { uploadLocalFileToDrive };

const VIDEO_TABLE = 'videos';

/**
 * Uploads a new video to Google Drive and registers the video entity in the local/cloud DB.
 */
export async function uploadNewVideo(options: UploadOptions & { onPhaseChange?: (phase: string) => void }): Promise<{ video: VideoItem; stats: UploadStats }> {
  const startTime = Date.now();
  const { videoFile: file, subtitleText, duration, extraAudioTracks = [], extraSubtitleTracks = [], webQuality, conversionPreset, onProgress, onPhaseChange, signal } = options;
  
  if (signal?.aborted) throw new Error("Cancelado pelo usuário");

  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  let isLocal = false;
  let localPath: string | undefined = undefined;
  let webFileId = '';
  let mainFileId = '';
  
  let originalSize: number | undefined = file.size;
  let webSize: number | undefined = undefined;
  
  const sourcePath = (file as any).TauriPath;
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const standardizedName = `${baseName}.mp4`;
  
  if (onProgress) onProgress(5); 

  if (sourcePath && window.api?.video) {
    try {
      if (onPhaseChange) onPhaseChange('Convertendo e criptografando vídeos no Desktop...');
      
      let unlistenProgress: any = null;
      if (window.api?.events) {
        unlistenProgress = await window.api.events.listen('video_upload_progress', (event: any) => {
           if (onProgress) onProgress(5 + (event.payload * 0.35)); // Map 0-100 to 5-40%
        });
      }
      const handleAbort = () => {
        const desktopVideoApi = window.api?.video as DesktopVideoApi | undefined;
        if (desktopVideoApi?.cancelConversion) {
          desktopVideoApi.cancelConversion();
        }
      };
      if (signal) signal.addEventListener('abort', handleAbort);

      let processRes;
      try {
          processRes = await (window.api.video as any).processUpload(sourcePath, file.name, webQuality, conversionPreset || 'medium', duration);
      } finally {
          if (signal) signal.removeEventListener('abort', handleAbort);
      }
      
      if (unlistenProgress) {
         unlistenProgress();
      }

      if (signal?.aborted) throw new Error("Cancelado pelo usuário");

      isLocal = true;
      localPath = processRes.original_path;
      if (processRes.original_size) originalSize = processRes.original_size;
      if (processRes.web_size) webSize = processRes.web_size;
      
      if (onProgress) onProgress(40);
      if (onPhaseChange) onPhaseChange('Enviando Arquivo Original...');
      if (signal?.aborted) throw new Error("Cancelado pelo usuário");
      
      mainFileId = await uploadLocalFileToDrive(token, processRes.original_path, file.name + ".enc", (p) => {
        if (signal?.aborted) throw new Error("Cancelado pelo usuário");
        if (onProgress) onProgress(40 + (p * 0.15));
      });
      
      if (processRes.web_path) {
        if (onPhaseChange) onPhaseChange('Enviando Versão Web...');
        if (signal?.aborted) throw new Error("Cancelado pelo usuário");
        webFileId = await uploadLocalFileToDrive(token, processRes.web_path, standardizedName + ".enc", (p) => {
           if (signal?.aborted) throw new Error("Cancelado pelo usuário");
           if (onProgress) onProgress(55 + (p * 0.15));
        });
      }
    } catch (e: any) {
      console.warn("Não foi possível processar o vídeo localmente:", e);
      throw new Error("Falha no processamento nativo: " + (e.message || e));
    }
  }

  // If local processing failed or it's a pure web file
  if (!mainFileId && !isLocal) {
    let driveFileName = file.name;
    let dataToUpload: ArrayBuffer | Blob = file;
    
    if (webQuality !== 'original') {
      if (onPhaseChange) onPhaseChange(`Transcodificando vídeo na Web para ${webQuality} (Cuidado)...`);
      const { processVideoWeb } = await import('../ffmpeg-web');
      try {
        if (signal?.aborted) throw new Error("Cancelado pelo usuário");
        dataToUpload = await processVideoWeb(file, webQuality, conversionPreset || 'medium', (p) => {
          if (signal?.aborted) throw new Error("Cancelado pelo usuário");
          if (onProgress) onProgress(p * 0.7); 
        }, signal);
        driveFileName = standardizedName;
      } catch (err: any) {
        if (err.message === 'Cancelado pelo usuário' || signal?.aborted) {
          throw new Error('Cancelado pelo usuário');
        }
        console.error('Falha no FFmpeg Web:', err);
        // Fallback to original
      }
    }

    if (options.masterKey) {
      if (signal?.aborted) throw new Error("Cancelado pelo usuário");
      if (onPhaseChange) onPhaseChange('Criptografando e enviando para nuvem (Isso pode demorar)...');
      
      const { encryptFileChunked } = await import('../storage');
      const encryptedBlob = await encryptFileChunked(dataToUpload as File | Blob, options.masterKey, (p) => {
        if (signal?.aborted) throw new Error("Cancelado pelo usuário");
        if (onProgress) onProgress(30 + (p * 0.1));
      });
      
      if (signal?.aborted) throw new Error("Cancelado pelo usuário");

      mainFileId = await uploadToDrive(token, driveFileName + ".enc", encryptedBlob, false as any, (p) => {
        if (signal?.aborted) throw new Error("Cancelado pelo usuário");
        if (onProgress) onProgress(70 + (p * 0.3));
      });
    } else {
      throw new Error("Master key is required for uploading securely on the Web.");
    }
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
  
  if (subtitleText) {
    const enc = new TextEncoder();
    let subBuffer = enc.encode(subtitleText).buffer as ArrayBuffer;
    let driveFileName = `${file.name}.vtt`;
    
    if (options.masterKey) {
      const { encryptFile } = await import('../storage');
      subBuffer = await encryptFile(subBuffer, options.masterKey);
      driveFileName += '.enc';
    }
    
    let localSubPath: string | undefined;
    if (window.api?.video?.saveLocal) {
      try {
        const subLocalFilename = `${baseName}.vtt`;
        localSubPath = await window.api.video.saveLocal(subLocalFilename, enc.encode(subtitleText).buffer as ArrayBuffer);
      } catch (err) {
        console.warn('Falha ao salvar legenda localmente:', err);
      }
    }

    const subDriveId = await uploadToDrive(token, driveFileName, subBuffer, false as any);
    
    subtitleTracksList.unshift({
      id: 'main_sub',
      label: 'Legenda Principal',
      drive_id: subDriveId,
      local_path: localSubPath
    });
  }

  // Embedded extra subtitles
  if (sourcePath && window.api?.video && extraSubtitleTracks.length > 0) {
    for (const track of extraSubtitleTracks) {
      try {
        const vttText = await window.api.video.extractSubtitles(sourcePath, track);
        if (vttText) {
          const enc = new TextEncoder();
          let subBuffer = enc.encode(vttText).buffer as ArrayBuffer;
          let driveFileName = `${baseName} - Legenda ${track.replace(/:/g, '')}.vtt`;
          
          if (options.masterKey) {
            const { encryptFile } = await import('../storage');
            subBuffer = await encryptFile(subBuffer, options.masterKey);
            driveFileName += '.enc';
          }
          
          const subDriveId = await uploadToDrive(token, driveFileName, subBuffer, false as any);
          
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
    drive_web_file_id: webFileId || undefined,
    is_local: isLocal,
    file_path: localPath,
    collection_id: options.collectionId || undefined,
    collection_name: options.collectionName || undefined,
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

  return {
    video: newVideo,
    stats: {
      originalSize,
      webSize,
      durationMs: Date.now() - startTime,
      webQuality
    }
  };
}

/**
 * Retranscodes an existing local video to a specific web quality, uploads it, and replaces the old web version.
 */
export async function generateWebVersionTask(
  video: VideoItem,
  webQuality: string,
  conversionPreset: string = 'medium',
  onProgress?: (percent: number) => void,
  onPhaseChange?: (phase: string) => void,
  signal?: AbortSignal
): Promise<void> {
  if (!video.is_local || !video.file_path) {
    throw new Error("Vídeo precisa estar baixado localmente para gerar versão web.");
  }

  const desktopVideoApi = window.api?.video as DesktopVideoApi | undefined;
  if (!desktopVideoApi?.generateWebVersion) {
    throw new Error("API de conversão não suportada.");
  }

  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  if (signal?.aborted) throw new Error("Cancelado pelo usuário");

  // 1. Convert video locally via FFmpeg
  if (onPhaseChange) onPhaseChange('Convertendo vídeo no Desktop...');
  
  let unlistenProgress: any = null;
  if (window.api?.events && onProgress) {
    unlistenProgress = await window.api.events.listen('video_upload_progress', (event: any) => {
      onProgress(event.payload * 0.7);
    });
  }

  let genResult: { web_path: string, web_size: number };
  
  const handleAbort = () => {
    if (desktopVideoApi?.cancelConversion) {
      desktopVideoApi.cancelConversion();
    }
  };
  if (signal) signal.addEventListener('abort', handleAbort);

  try {
    genResult = await desktopVideoApi.generateWebVersion(
      video.file_path,
      video.original_name,
      webQuality,
      conversionPreset,
      video.duration || 0
    );
  } finally {
    if (unlistenProgress) unlistenProgress();
    if (signal) signal.removeEventListener('abort', handleAbort);
  }

  if (signal?.aborted) throw new Error("Cancelado pelo usuário");

  // 2. Upload
  if (onPhaseChange) onPhaseChange('Enviando para o Drive...');
  const baseName = video.original_name.replace(/\.[^/.]+$/, "");
  const webFilenameEnc = `${baseName}_web.mp4.enc`;

  const newWebFileId = await uploadLocalFileToDrive(token, genResult.web_path, webFilenameEnc, (p) => {
    if (signal?.aborted) throw new Error("Cancelado pelo usuário");
    if (onProgress) onProgress(70 + (p * 0.3));
  });

  // 3. Delete old web version from drive if different from original
  if (video.drive_web_file_id && video.drive_web_file_id !== video.drive_file_id) {
    if (onPhaseChange) onPhaseChange('Limpando versão antiga...');
    await deleteFromDrive(token, video.drive_web_file_id).catch(e => console.warn("Failed to delete old web version", e));
  }

  // 4. Update Database
  if (onPhaseChange) onPhaseChange('Atualizando Banco de Dados...');
  if (window.api?.sync) {
    await window.api.sync.upsertRow(VIDEO_TABLE, {
      ...video,
      drive_web_file_id: newWebFileId,
      updated_at: new Date().toISOString()
    });
  }
}
