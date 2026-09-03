import { triggerToast } from '../../../ui/ToastContext';

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

      const res = await fetch(objectUrl);
      if (!res.ok) {
        throw new Error(`Falha ao ler dados do arquivo: status ${res.status}`);
      }

      const buffer = await res.arrayBuffer();
      await writeFile(targetPath, new Uint8Array(buffer));

      triggerToast('Download concluído com sucesso!', 'success');
      return { success: true, filePath: targetPath };
    } catch (tauriErr) {
      console.warn('[documentDownloadUtils] Tauri native download failed, attempting web fallback:', tauriErr);
    }
  }

  // 2. Web Browser & Fallback Environment
  try {
    const res = await fetch(objectUrl);
    if (!res.ok) {
      throw new Error(`Erro de rede ao baixar o arquivo: status ${res.status}`);
    }

    const blob = await res.blob();
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
