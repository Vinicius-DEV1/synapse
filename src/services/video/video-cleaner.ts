import { getValidAccessToken, deleteFromDrive } from '../drive';
import type { VideoItem } from '../../types';

/**
 * Exclui o vídeo permanentemente:
 * 1. Remove arquivo local (se existir)
 * 2. Remove todos os arquivos vinculados no Google Drive
 * 3. Remove do banco de dados local (e sincroniza a exclusão via soft-delete)
 */
export async function deleteVideoAndSync(video: VideoItem): Promise<void> {
  // 1. Excluir localmente (se for local)
  if (video.is_local && window.api?.video) {
    await window.api.video.deleteLocal(video.original_name).catch(e => console.warn("Failed to delete local", e));
  }

  // 2. Excluir arquivos vinculados no Drive
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
