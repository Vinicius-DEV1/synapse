import { invoke } from '@tauri-apps/api/core';

let cachedBaseDir: string | null = null;

/**
 * Returns the Single Source of Truth canonical data directory for the app.
 * This guarantees exact parity with Rust back-end path resolution (including Portable Mode).
 */
export async function getBaseAppDir(): Promise<string> {
  if (cachedBaseDir) {
    return cachedBaseDir;
  }
  try {
    const dir = await invoke<string>('get_base_dir');
    cachedBaseDir = dir;
    return dir;
  } catch (err) {
    console.warn('[getBaseAppDir] Failed to invoke get_base_dir, falling back to @tauri-apps/api/path', err);
    const { appDataDir } = await import('@tauri-apps/api/path');
    const dir = await appDataDir();
    cachedBaseDir = dir;
    return dir;
  }
}
