import { invoke } from '@tauri-apps/api/core';
import { platform } from '../platform';

export interface ScrapPayload {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  html_content: string;
  file_size: number;
  created_at: string;
  local_path: string;
}

/**
 * Captures an offline web snapshot via native Tauri backend.
 * Provides a clean cross-platform abstraction over Tauri IPC.
 */
export async function captureWebScrap(url: string): Promise<ScrapPayload> {
  if (platform.platform !== 'desktop') {
    throw new Error('A captura de snapshots está disponível apenas na versão Desktop.');
  }

  return await invoke<ScrapPayload>('scrap_capture_page', { url });
}
