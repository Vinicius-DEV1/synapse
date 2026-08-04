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
  
  if (!video.drive_file_id) throw new Error("Vídeo não está no Drive.");
  
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  const buffer = await downloadFromDrive(token, video.drive_file_id, onProgress);
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
import { convertFileSrc } from '@tauri-apps/api/core';

export async function resolveVideoUrl(video: VideoItem, masterKey?: CryptoKey): Promise<string> {
  if (window.api?.video && video.is_local) {
    // Primeiro tenta usar o file_path absoluto salvo no banco de dados
    let localPath = video.file_path || await window.api.video.getLocalPath(video.original_name);
    
    if (!localPath) {
      localPath = await window.api.video.getLocalPath(video.original_name + ".enc");
    }
    if (localPath) {
      // Como todos os contêineres são padronizados para .mp4 na importação, usamos sempre a URI nativa com suporte a Range Requests (HTTP 206)
      return `http://encrypted.localhost/files/${encodeURIComponent(localPath)}`;
    }
  }

  if (video.drive_file_id) {
    return getVideoStreamLink(video.drive_file_id, masterKey);
  }

  throw new Error("Vídeo não foi encontrado nem localmente nem na nuvem.");
}

import type { UploadOptions } from '../components/video-player/VideoUploadModal';
import type { TrackItem } from '../types';

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
  
  const sourcePath = (file as any).TauriPath;
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const standardizedName = `${baseName}.mp4`;
  
  if (onProgress) onProgress(5); 

  if (sourcePath && window.api?.video) {
    try {
      localPath = await window.api.video.copyLocal(sourcePath, standardizedName);
      isLocal = true;
      
      if (localPath) {
          if (onProgress) onProgress(40);
          mainFileId = await uploadLocalFileToDrive(token, localPath, standardizedName + ".enc", (p) => {
            if (onProgress) onProgress(40 + (p * 0.3));
          });
      }
    } catch (e) {
      console.warn("Não foi possível processar o vídeo localmente:", e);
    }
  }

  // If local processing failed or it's a pure web file
  if (!mainFileId) {
    let bufferToUpload = await file.arrayBuffer();
    let driveFileName = file.name;
    
    if (options.masterKey) {
      const { encryptFile } = await import('./storage');
      bufferToUpload = await encryptFile(bufferToUpload, options.masterKey);
      driveFileName = file.name + '.enc';
    } else {
      throw new Error("Master key is required for uploading securely on the Web.");
    }

    mainFileId = await uploadToDrive(token, driveFileName, bufferToUpload, false as any, (p) => {
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
    original_name: standardizedName,
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
    // Ler legenda local via fetch file://
    if (localSubtitlePath) {
      const fileUrl = 'file:///' + localSubtitlePath.replace(/\\/g, '/');
      const res = await fetch(fileUrl);
      if (res.ok) return await res.text();
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
    
    // 1.5. Extract Subtitle (if available)
    let localSubtitlePath: string | undefined = undefined;
    let driveSubtitleId: string | undefined = undefined;
    
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
            localSubtitlePath = await window.api.video.saveLocal(subFilename, new TextEncoder().encode(vttContent).buffer as ArrayBuffer);
            driveSubtitleId = await uploadLocalFileToDrive(token, localSubtitlePath, subFilename);
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
      drive_subtitle_id: driveSubtitleId,
      is_local: true,
      file_path: localPath,
      local_subtitle_path: localSubtitlePath,
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
    // Legenda principal
    if (video.drive_subtitle_id) {
      await deleteFromDrive(token, video.drive_subtitle_id).catch(e => console.warn("Falha ao apagar legenda do Drive", e));
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
