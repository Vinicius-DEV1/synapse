export {};

declare global {
  interface Window {
    api: any; // we will type this properly after consolidating types
    __TAURI_INTERNALS__?: Record<string, unknown>;
    __cadernoModuleKeys?: Record<string, unknown>;
  }
}
