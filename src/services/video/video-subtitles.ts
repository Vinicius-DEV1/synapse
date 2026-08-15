import { getValidAccessToken, downloadFromDrive } from '../drive';

/**
 * Baixa as legendas (VTT) como texto.
 * Se masterKey for fornecida, tenta descriptografar o conteúdo (legendas são criptografadas no upload).
 */
export async function getSubtitleText(driveSubtitleId?: string, localSubtitlePath?: string, masterKey?: CryptoKey): Promise<string | null> {
  if (!driveSubtitleId && !localSubtitlePath) return null;

  try {
    if (driveSubtitleId) {
      const token = await getValidAccessToken();
      if (!token) return null;
      
      const buffer = await downloadFromDrive(token, driveSubtitleId);
      
      if (masterKey) {
        try {
          const { decryptFile } = await import('../storage');
          const decrypted = await decryptFile(buffer, masterKey);
          return new TextDecoder().decode(decrypted);
        } catch {
        }
      }
      return new TextDecoder().decode(buffer);
    }
    if (localSubtitlePath) {
      if (window.api?.video?.readLocalFile) {
        const uint8 = await window.api.video.readLocalFile(localSubtitlePath);
        return new TextDecoder().decode(uint8);
      } else {
        const fileUrl = 'file:///' + localSubtitlePath.replace(/\\/g, '/');
        const res = await fetch(fileUrl);
        if (res.ok) return await res.text();
      }
    }
    return null;
  } catch (e) {
    console.error("Falha ao ler legendas", e);
    return null;
  }
}
