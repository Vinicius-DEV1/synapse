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

/**
 * Faz upload de um novo vídeo para o Google Drive e o registra no DB.
 */
export async function uploadNewVideo(
  file: File, 
  subtitleText: string | null,
  trackIndex?: string,
  duration?: number,
  onProgress?: (percent: number) => void
): Promise<VideoItem> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  const buffer = await file.arrayBuffer();
  // uploadToDrive (definido em drive.ts) faz o upload na pasta do app
  const fileId = await uploadToDrive(token, file.name, buffer, false, onProgress);
  
  let isLocal = false;
  let localPath: string | undefined = undefined;

  // Usa a propriedade electronPath injetada pelo nosso botão nativo
  const sourcePath = (file as any).electronPath;
  
  if (sourcePath && window.api?.video?.copyLocal) {
    try {
      localPath = await window.api.video.copyLocal(sourcePath, file.name);
      isLocal = true;
    } catch (e) {
      console.warn("Não foi possível copiar arquivo localmente:", e);
    }
  }

  let finalSubtitleText = subtitleText;
  
  // Tenta extrair legenda embutida automaticamente se for local e não foi fornecida legenda externa
  // Apenas extrai se um trackIndex for passado pelo usuário
  if (!finalSubtitleText && isLocal && localPath && window.api?.video?.extractSubtitles && trackIndex) {
    try {
      if (onProgress) onProgress(99); // Mocking extraction progress visually
      const extractedVtt = await window.api.video.extractSubtitles(localPath, trackIndex);
      if (extractedVtt) {
        finalSubtitleText = extractedVtt;
      }
    } catch (e) {
      console.warn("Falha na auto-extração de legendas:", e);
    }
  }

  let subtitleId = null;
  if (finalSubtitleText) {
    const enc = new TextEncoder();
    const subBuffer = enc.encode(finalSubtitleText).buffer;
    subtitleId = await uploadToDrive(token, `${file.name}.vtt`, subBuffer, false);
  }

  const newVideo: VideoItem = {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.[^/.]+$/, ""),
    original_name: file.name,
    drive_file_id: fileId,
    drive_subtitle_id: subtitleId || undefined,
    is_local: isLocal,
    file_path: localPath,
    progress: 0,
    duration: duration,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (window.api?.sync) {
    await window.api.sync.upsertRow(VIDEO_TABLE, newVideo);
  }

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
