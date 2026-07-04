import { getValidAccessToken, getOrCreateAppFolder, uploadToDrive, downloadFromDrive } from './drive';
import { VideoItem } from '../types_video';

// Tabela sincronizada que vai guardar os metadados dos vídeos
const VIDEO_TABLE = 'videos';

/**
 * Obtém link de streaming a partir do ID do Drive.
 */
export async function getVideoStreamLink(driveFileId: string): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");
  
  // alt=media retorna os bytes reais do arquivo para a tag <video>
  // O access_token na URL permite que o navegador faça o request diretamente
  return `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&access_token=${token}`;
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
export async function uploadNewVideo(file: File, subtitleText: string | null): Promise<VideoItem> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Não foi possível autenticar com o Google Drive.");

  const buffer = await file.arrayBuffer();
  // uploadToDrive (definido em drive.ts) faz o upload na pasta do app
  const fileId = await uploadToDrive(token, file.name, buffer, false);
  
  let subtitleId = null;
  if (subtitleText) {
    const enc = new TextEncoder();
    const subBuffer = enc.encode(subtitleText).buffer;
    subtitleId = await uploadToDrive(token, `${file.name}.vtt`, subBuffer, false);
  }

  const newVideo: VideoItem = {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.[^/.]+$/, ""),
    original_name: file.name,
    drive_file_id: fileId,
    drive_subtitle_id: subtitleId || undefined,
    is_local: false, // Inicia na nuvem
    progress: 0,
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
