import { getValidAccessToken, getOrCreateAppFolder, uploadToDrive, downloadFromDrive } from './drive';
import type { VideoItem } from '../types';

// Tabela sincronizada que vai guardar os metadados dos vídeos
const VIDEO_TABLE = 'videos';

/**
 * Obtém link de streaming a partir do ID do Drive.
 */
export async function getVideoStreamLink(driveFileId: string, masterKey?: CryptoKey): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");
  
  if (!masterKey) {
    // Se não tivermos chave (ex: modo público?), caímos para o stream direto (só vai funcionar se não estiver criptografado)
    return `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&access_token=${token}`;
  }

  // Na Web, como TUDO é criptografado, e não temos Service Worker pra fazer chunking on-the-fly de AES-GCM,
  // baixamos o arquivo inteiro em memória, descriptografamos e criamos um Blob.
  // IMPORTANTE: Isso vai usar RAM proporcional ao tamanho do vídeo!
  const buffer = await downloadFromDrive(token, driveFileId);
  try {
    const { decryptFile } = await import('./storage');
    const decryptedBuffer = await decryptFile(buffer, masterKey);
    const blob = new Blob([decryptedBuffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn("Could not decrypt video. Maybe it is not encrypted?", e);
    const blob = new Blob([buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }
}

/**
 * Baixa um vídeo do drive e salva localmente (apenas Desktop)
 */
export async function downloadVideoToLocal(video: VideoItem, onProgress?: (percent: number) => void): Promise<string> {
  if (!window.api?.video) {
    throw new Error("Download local só está disponível no ambiente Desktop.");
  }
  
  const ext = video.original_name.split('.').pop()?.toLowerCase() || '';
  const isUnsupported = !['mp4', 'webm'].includes(ext);
  
  const targetDriveId = isUnsupported && video.drive_web_file_id ? video.drive_web_file_id : video.drive_file_id;
  if (!targetDriveId) throw new Error("Vídeo não está no Drive ou versão compatível indisponível.");
  
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  const baseName = video.original_name.replace(/\.[^/.]+$/, "");
  const targetFileName = isUnsupported ? `${baseName}_web.mp4` : video.original_name;

  let localPath = "";
  if (window.api.video.downloadFromDrive) {
    localPath = await window.api.video.downloadFromDrive(targetDriveId, token, targetFileName);
  } else {
    const buffer = await downloadFromDrive(token, targetDriveId, onProgress);
    localPath = await window.api.video.saveLocal(targetFileName, buffer);
  }
  
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
import { convertFileSrc } from '@tauri-apps/api/core';

export async function resolveVideoUrl(video: VideoItem, masterKey?: CryptoKey, forceWeb?: boolean): Promise<string> {
  const { getSettings } = await import('../utils/settings');
  const pref = getSettings().videoPlaybackPreference;
  
  const ext = video.original_name.split('.').pop()?.toLowerCase() || '';
  
  let isUnsupported = forceWeb || !['mp4', 'webm'].includes(ext);
  
  if (pref === 'force_web') {
    isUnsupported = true; // Sempre tenta puxar a web version
  } else if (pref === 'force_original') {
    isUnsupported = false; // Sempre tenta rodar o original
  }

  const baseName = video.original_name.replace(/\.[^/.]+$/, "");

  if (window.api?.video && video.is_local) {
    // Quando sincroniza de outro SO, o file_path salvo pode ser do Windows e não existir no Linux.
    // Vamos sempre verificar a existência real do arquivo usando o filename.
    const fileNameFallback = video.file_path ? video.file_path.split(/[/\\]/).pop() : undefined;
    const searchName = isUnsupported ? `${baseName}_web.mp4` : video.original_name;
    
    let localPath = await window.api.video.getLocalPath(searchName);
    if (!localPath) {
      localPath = await window.api.video.getLocalPath(searchName + ".enc");
    }
    if (!localPath && fileNameFallback) {
      localPath = await window.api.video.getLocalPath(fileNameFallback);
    }
    
    if (localPath) {
      if (window.api?.video?.getStreamPort) {
        try {
          const port = await window.api.video.getStreamPort();
          const fileName = localPath.split(/[/\\]/).pop();
          return `http://127.0.0.1:${port}/stream?file=culture/${encodeURIComponent(fileName || '')}`;
        } catch (e) {
          console.warn("Failed to get stream port:", e);
        }
      }
      const fileName = localPath.split(/[/\\]/).pop();
      return `encrypted://localhost/culture/${encodeURIComponent(fileName || '')}`;
    }
  }
  
  const isWebEnv = !window.api?.video;
  
  if (isWebEnv) {
    // No Web, se for formato não suportado (ex: MKV), forçamos o uso da versão Web.
    const targetDriveId = isUnsupported && video.drive_web_file_id 
      ? video.drive_web_file_id 
      : (video.drive_web_file_id || video.drive_file_id);
      
    if (targetDriveId) {
      return `/stream-video/${targetDriveId}`;
    }
  } else {
    // Desktop: Streaming Nativo em Rust do Google Drive (ignorando o Service Worker)
    // Se for formato não suportado (MKV), forçamos a busca pelo web_file_id na nuvem se ele não estivesse local
    const targetDriveId = isUnsupported && video.drive_web_file_id 
      ? video.drive_web_file_id 
      : (video.drive_file_id || video.drive_web_file_id);
      
    if (targetDriveId && window.api?.video?.getStreamPort) {
      try {
        const port = await window.api.video.getStreamPort();
        const token = await getValidAccessToken();
        if (token) {
          return `http://127.0.0.1:${port}/stream-drive?file_id=${targetDriveId}&token=${token}&module=culture`;
        }
      } catch (e) {
        console.warn("Failed to get stream port for drive:", e);
      }
    }
    if (targetDriveId) {
      return `/stream-video/${targetDriveId}`; // Fallback para SW
    }
  }

  throw new Error("Vídeo não foi encontrado nem localmente nem na nuvem.");
}

import type { UploadOptions } from '../components/video-player/VideoUploadModal';
import type { TrackItem } from '../types';

/**
 * Helper to upload a local file to Drive via fetch
 */
async function uploadLocalFileToDrive(token: string, localPath: string, driveFileName: string, onProgress?: (p: number) => void) {
  try {
    if (window.api?.video?.uploadFileToDrive) {
      if (onProgress) onProgress(10); // Fake initial progress since streaming doesn't report chunks yet via this simple Rust command
      const { getOrCreateAppFolder } = await import('./drive');
      const folderId = await getOrCreateAppFolder(token);
      return await window.api.video.uploadFileToDrive(localPath, driveFileName, folderId, token);
    } else {
      const fileReq = await fetch('file:///' + localPath.replace(/\\/g, '/'));
      const blob = await fileReq.blob();
      const buffer = await blob.arrayBuffer();
      const { uploadToDrive } = await import('./drive');
      return await uploadToDrive(token, driveFileName, buffer, false as any, onProgress);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Request had invalid authentication credentials')) {
      console.warn("Token expirado interceptado! Forçando renovação automática...");
      const { getValidAccessToken } = await import('./drive');
      const newToken = await getValidAccessToken(true);
      if (!newToken) throw new Error("Google Drive não está conectado ou falha crítica ao renovar token.");
      
      // Retry with new token
      if (window.api?.video?.uploadFileToDrive) {
        const { getOrCreateAppFolder } = await import('./drive');
        const folderId = await getOrCreateAppFolder(newToken);
        return await window.api.video.uploadFileToDrive(localPath, driveFileName, folderId, newToken);
      } else {
        const fileReq = await fetch('file:///' + localPath.replace(/\\/g, '/'));
        const blob = await fileReq.blob();
        const buffer = await blob.arrayBuffer();
        const { uploadToDrive } = await import('./drive');
        return await uploadToDrive(newToken, driveFileName, buffer, false as any, onProgress);
      }
    }
    throw err;
  }
}

/**
 * Faz upload de um novo vídeo para o Google Drive e o registra no DB.
 */
export interface UploadStats {
  originalSize?: number;
  webSize?: number;
  durationMs: number;
  webQuality: string;
}

export async function uploadNewVideo(options: UploadOptions & { onPhaseChange?: (phase: string) => void }): Promise<{ video: VideoItem; stats: UploadStats }> {
  const startTime = Date.now();
  const { videoFile: file, subtitleText, duration, primaryAudioTrack, extraAudioTracks = [], extraSubtitleTracks = [], webQuality, conversionPreset, onProgress, onPhaseChange, signal } = options;
  
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
      
      const processRes = await (window.api.video as any).processUpload(sourcePath, file.name, webQuality, conversionPreset || 'medium', duration);
      
      if (unlistenProgress) {
         unlistenProgress();
      }

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
      const { processVideoWeb } = await import('./ffmpeg-web');
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
      
      const { encryptFileChunked } = await import('./storage');
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
  
  let mainSubtitleId = null;
  if (subtitleText) {
    const enc = new TextEncoder();
    let subBuffer = enc.encode(subtitleText).buffer as ArrayBuffer;
    let driveFileName = `${file.name}.vtt`;
    
    if (options.masterKey) {
      const { encryptFile } = await import('./storage');
      subBuffer = await encryptFile(subBuffer, options.masterKey);
      driveFileName += '.enc';
    }
    
    mainSubtitleId = await uploadToDrive(token, driveFileName, subBuffer, false as any);
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
            const { encryptFile } = await import('./storage');
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
 * Baixa as legendas (VTT) como texto.
 * Se masterKey for fornecida, tenta descriptografar o conteúdo (legendas são criptografadas no upload).
 */
export async function getSubtitleText(driveSubtitleId?: string, localSubtitlePath?: string, masterKey?: CryptoKey): Promise<string | null> {
  if (!driveSubtitleId && !localSubtitlePath) return null;

  try {
    if (driveSubtitleId) {
      const token = await getValidAccessToken();
      if (!token) return null;
      
      const buffer = await downloadFromDrive(token, driveSubtitleId);
      
      if (masterKey) {
        try {
          const { decryptFile } = await import('./storage');
          const decrypted = await decryptFile(buffer, masterKey);
          return new TextDecoder().decode(decrypted);
        } catch {
        }
      }
      return new TextDecoder().decode(buffer);
    }
    if (localSubtitlePath) {
      if (window.api?.video?.readLocalFile) {
        const uint8 = await window.api.video.readLocalFile(localSubtitlePath);
        return new TextDecoder().decode(uint8);
      } else {
        const fileUrl = 'file:///' + localSubtitlePath.replace(/\\/g, '/');
        const res = await fetch(fileUrl);
        if (res.ok) return await res.text();
      }
    }
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
  selectedSubs?: string[];
  onProgress?: (percent: number) => void;
}

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

  let unsubscribe: (() => void) | undefined;
  if (onProgress) {
    unsubscribe = window.api.youtube.onProgress((percent) => {
      // Reservamos os 95% para o download do yt-dlp
      onProgress(percent * 0.95);
    });
  }

  try {
    // 1. Download
    const localPath = await window.api.youtube.download(url, filename, quality, selectedSubs);
    const finalFilename = localPath.split(/[\\/]/).pop() || filename.replace(/\.mp4$/, '.mkv');
    
    if (selectedSubs && selectedSubs.length > 0) {
      try {
        const scanResult = await window.api.video.scanTracks(localPath);
        const streams = scanResult?.streams || [];
        const subtitleStreams = streams.filter((s: any) => s.codec_type === 'subtitle');
        if (subtitleStreams.length > 0) {
          const firstSubIndex = String(subtitleStreams[0].index);
          const vttContent = await window.api.video.extractSubtitles(localPath, firstSubIndex);
          if (vttContent) {
            const subFilename = `${finalFilename}_sub.vtt`;
            const localSubtitlePath = await window.api.video.saveLocal(subFilename, new TextEncoder().encode(vttContent).buffer as ArrayBuffer);
            await uploadLocalFileToDrive(token, localSubtitlePath, subFilename);
          }
        }
      } catch (e) {
        console.error("Falha ao extrair legenda do youtube:", e);
      }
    }

    // 2. Upload
    const driveFileId = await uploadLocalFileToDrive(token, localPath, finalFilename, (p) => {
      if (onProgress) onProgress(95 + (p * 0.05)); // 95% a 100% para o upload
    });

    // 3. Database
    const newVideo: VideoItem = {
      id: crypto.randomUUID(),
      title: finalFilename.replace(/\.[^/.]+$/, ""),
      original_name: finalFilename,
      drive_file_id: driveFileId,
      is_local: true,
      file_path: localPath,
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

import { deleteFromDrive } from './drive';

/**
 * Exclui o vídeo permanentemente:
 * 1. Remove arquivo local (se existir)
 * 2. Remove todos os arquivos vinculados no Google Drive
 * 3. Remove do banco de dados local (e sincroniza a exclusão)
 */

export async function deleteVideoAndSync(video: VideoItem): Promise<void> {
  // 1. Excluir localmente (se for local)
  if (video.is_local && window.api?.video) {
    await window.api.video.deleteLocal(video.original_name).catch(e => console.warn("Failed to delete local", e));
  }

  // 2. Excluir arquivos vinculados no Drive (não joga exceção se falhar, pois pode já ter sido apagado)
  const token = await getValidAccessToken();
  if (token) {
    // Arquivo principal
    if (video.drive_file_id) {
      await deleteFromDrive(token, video.drive_file_id).catch(e => console.warn("Falha ao apagar vídeo do Drive", e));
    }
    // Arquivo alternativo da Web
    if (video.drive_web_file_id) {
      await deleteFromDrive(token, video.drive_web_file_id).catch(e => console.warn("Falha ao apagar vídeo web do Drive", e));
    }


    // Áudios extras
    try {
      const audios = JSON.parse(video.audio_tracks_json || '[]');
      for (const track of audios) {
        if (track.drive_id) {
          await deleteFromDrive(token, track.drive_id).catch(e => console.warn("Falha ao apagar áudio extra do Drive", e));
        }
      }
    } catch (e) {
      console.warn("Falha ao ler audios_json para exclusão", e);
    }

    // Legendas extras
    try {
      const subs = JSON.parse(video.subtitles_json || '[]');
      for (const track of subs) {
        if (track.drive_id) {
          await deleteFromDrive(token, track.drive_id).catch(e => console.warn("Falha ao apagar legenda extra do Drive", e));
        }
      }
    } catch (e) {
      console.warn("Falha ao ler subtitles_json para exclusão", e);
    }
  }

  // 3. Excluir do Banco de Dados (soft-delete para sincronizar a exclusão entre dispositivos)
  if (window.api?.sync) {
    await window.api.sync.upsertRow('videos', {
      ...video,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
}
