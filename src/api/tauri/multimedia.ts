import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { open as openBrowser } from '@tauri-apps/plugin-shell';

export const tauriVideoApi = {
  getLocalPath: async (filename: string) => await invoke('video_get_local_path', { filename }),
  readLocalFile: async (path: string): Promise<Uint8Array> => {
    const arr: number[] = await invoke('video_read_file', { path });
    return new Uint8Array(arr);
  },
  uploadFileToDrive: async (localPath: string, driveFilename: string, folderId: string, accessToken: string) => {
    return await invoke('video_upload_file_to_drive', { localPath, driveFilename, folderId, accessToken });
  },
  deleteLocal: async (filename: string) => await invoke('video_delete_local', { filename }),
  scanTracks: async (localPath: string) => await invoke('video_scan_tracks', { localPath }),
  extractSubtitles: async (localPath: string, trackIndex: string) => await invoke('video_extract_subtitles', { localPath, trackIndex }),
  extractAudio: async (localPath: string, trackIndex: string) => await invoke('video_extract_audio', { localPath, trackIndex }),
  remuxDefaultTrack: async (sourcePath: string, filename: string, trackIndex: string) => await invoke('video_remux_default_track', { sourcePath, filename, trackIndex }),
  convertToMp4: async (sourcePath: string, filename: string) => await invoke('video_convert_mp4', { sourcePath, filename }),
  getStreamPort: async () => await invoke('video_get_stream_port'),
  saveLocal: async (filename: string, buffer: ArrayBuffer) => await invoke('video_save_local', { filename, buffer: Array.from(new Uint8Array(buffer)) }),
  copyLocal: async (sourcePath: string, filename: string) => await invoke('video_import_and_encrypt', { sourcePath, destFilename: filename }),
  processUpload: async (sourcePath: string, filename: string, webQuality: string, conversionPreset: string, duration: number) => await invoke<{ original_path: string, web_path: string | null }>('video_process_upload', { sourcePath, destFilename: filename, webQuality, conversionPreset, duration }),
  openFileDialog: async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Vídeos', extensions: ['mp4', 'mkv', 'avi', 'flv', 'wmv', 'mov', 'webm'] }]
    });
    if (!selected || Array.isArray(selected)) return null;
    const pathStr = String(selected);
    const name = pathStr.split('\\').pop()?.split('/').pop() || 'video.mp4';
    const ext = name.split('.').pop()?.toLowerCase() || 'mp4';
    let type = 'video/mp4';
    if (ext === 'mkv') type = 'video/x-matroska';
    else if (ext === 'webm') type = 'video/webm';
    return {
      path: pathStr,
      name,
      type
    };
  },
  openFolderDialog: async () => {
    const selected = await open({
      directory: true,
      multiple: false
    });
    return selected ? String(selected) : null;
  }
};

export const tauriLofiApi = {
  getLocalPath: async (filename: string) => await invoke('lofi_get_local_path', { filename }),
  deleteLocal: async (filename: string) => await invoke('lofi_delete_local', { filename }),
  saveLocal: async (filename: string, buffer: ArrayBuffer) => await invoke('lofi_save_local', { filename, buffer: Array.from(new Uint8Array(buffer)) }),
  copyLocal: async (sourcePath: string, filename: string) => await invoke('lofi_copy_local', { sourcePath, filename })
};

export const tauriYoutubeApi = {
  fetchInfo: async (url: string) => await invoke('youtube_fetch_info', { url }),
  fetchPlaylistInfo: async (url: string) => await invoke('youtube_fetch_playlist_info', { url }),
  download: async (url: string, filename: string, quality: string, subs?: string[]) => await invoke('youtube_download', { url, filename, quality, subs }),
  onProgress: (callback: (percent: number) => void) => {
    // Usa tauri event listener (listen from @tauri-apps/api/event) no frontend real
  },
  getWatched: async (videoIds: string[]) => await invoke<string[]>('youtube_get_watched', { videoIds }),
  setWatched: async (videoId: string, isWatched: boolean, title?: string, channel?: string) => await invoke('youtube_set_watched', { videoId, isWatched, title, channel })
};

export const tauriAudioApi = {
  generateTTS: async (text: string, lang?: string) => {
    try {
      const path = await invoke('audio_generate_tts', { text, lang });
      return { success: true, filePath: path };
    } catch (e) {
      return { success: false, error: e };
    }
  },
  extractClip: async (videoPath: string, startTimeMs: number, endTimeMs: number) => {
    try {
      const path = await invoke('audio_extract_clip', { videoPath, startTimeMs, endTimeMs });
      return { success: true, filePath: path };
    } catch (e) {
      return { success: false, error: e };
    }
  }
};

export const tauriTranscribeApi = {
  transcribeAudio: async (audioPath: string, lang: string = "pt") => await invoke('transcribe_audio', { audioPath, lang }),
  translateText: async (text: string, targetLang: string = "pt") => await invoke('translate_text', { text, targetLang })
};

export const tauriOsApi = {
  openInBrowser: async (url: string) => await openBrowser(url),
  showInFolder: async (path: string) => await invoke('os_show_in_folder', { path })
};
