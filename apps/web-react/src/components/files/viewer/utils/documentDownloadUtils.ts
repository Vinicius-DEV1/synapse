import { triggerToast } from '../../../ui/ToastContext';
import { getBlobFromUrlOrFetch } from '../../../../utils/file-fetcher';

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Downloads a file across Tauri desktop and web environments safely,
 * handling custom protocol URLs (encrypted://) and blob URLs.
 */
export async function downloadDocumentFile(
  objectUrl: string,
  fileName: string
): Promise<DownloadResult> {
  if (!objectUrl) {
    triggerToast('URL do arquivo não disponível para download.', 'error');
    return { success: false, error: 'Missing objectUrl' };
  }

  // 1. Tauri Desktop Environment
  if (typeof window !== 'undefined' && (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');

      const targetPath = await save({
        defaultPath: fileName,
      });

      if (!targetPath) {
        // User cancelled the file picker
        return { success: false, error: 'cancelled' };
      }

      const blob = await getBlobFromUrlOrFetch(objectUrl);
      const buffer = await blob.arrayBuffer();
      await writeFile(targetPath, new Uint8Array(buffer));

      triggerToast('Download concluído com sucesso!', 'success');
      return { success: true, filePath: targetPath };
    } catch (tauriErr) {
      console.warn('[documentDownloadUtils] Tauri native download failed, attempting web fallback:', tauriErr);
    }
  }

  // 2. Web Browser & Fallback Environment
  try {
    const blob = await getBlobFromUrlOrFetch(objectUrl);
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 2000);

    triggerToast('Download iniciado!', 'success');
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Falha desconhecida no download.';
    console.error('[documentDownloadUtils] Download error:', err);
    triggerToast(`Falha ao baixar o arquivo: ${errorMessage}`, 'error');
    return { success: false, error: errorMessage };
  }
}
