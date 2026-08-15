import type { ICadernoAPI } from './api/types';

declare global {
  interface Window {
    api: ICadernoAPI;
    __TAURI_INTERNALS__?: Record<string, unknown>;
    __cadernoModuleKeys?: Record<string, unknown>;
  }
}

export {};
