import { invoke } from '@tauri-apps/api/core';

export const tauriVideoApi = {
  getLocalPath: async (filename: string) => await invoke('video_get_local_path', { filename }),
  deleteLocal: async (filename: string) => await invoke('video_delete_local', { filename }),
  scanTracks: async (localPath: string) => await invoke('video_scan_tracks', { localPath }),
  extractSubtitles: async (localPath: string, trackIndex: string) => await invoke('video_extract_subtitles', { localPath, trackIndex }),
  extractAudio: async (localPath: string, trackIndex: string) => await invoke('video_extract_audio', { localPath, trackIndex }),
  remuxDefaultTrack: async (sourcePath: string, filename: string, trackIndex: string) => await invoke('video_remux_default_track', { sourcePath, filename, trackIndex }),
  convertToMp4: async (sourcePath: string, filename: string) => await invoke('video_convert_mp4', { sourcePath, filename }),
  getStreamPort: async () => await invoke('video_get_stream_port'),
  saveLocal: async (filename: string, buffer: ArrayBuffer) => await invoke('video_save_local', { filename, buffer: Array.from(new Uint8Array(buffer)) }),
  copyLocal: async (sourcePath: string, filename: string) => await invoke('video_import_and_encrypt', { sourcePath, destFilename: filename }),
  openFileDialog: async () => {},
  openFolderDialog: async () => {}
};

export const tauriLofiApi = {
  getLocalPath: async (filename: string) => await invoke('lofi_get_local_path', { filename }),
  deleteLocal: async (filename: string) => await invoke('lofi_delete_local', { filename }),
  saveLocal: async (filename: string, buffer: ArrayBuffer) => await invoke('lofi_save_local', { filename, buffer: Array.from(new Uint8Array(buffer)) }),
  copyLocal: async (sourcePath: string, filename: string) => await invoke('lofi_copy_local', { sourcePath, filename })
};

export const tauriYoutubeApi = {
  fetchInfo: async (url: string) => await invoke('youtube_fetch_info', { url }),
  download: async (url: string, filename: string, quality: string, subs?: string[]) => await invoke('youtube_download', { url, filename, quality, subs }),
  onProgress: (callback: (percent: number) => void) => {
    // Usa tauri event listener (listen from @tauri-apps/api/event) no frontend real
  }
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
  openInBrowser: async (url: string) => await invoke('os_open_in_browser', { url }),
  showInFolder: async (path: string) => await invoke('os_show_in_folder', { path })
};
