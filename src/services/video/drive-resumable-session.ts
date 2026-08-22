/**
 * Helper to upload a local file to Drive via fetch or Rust bridge with automatic retry on token expiration.
 */
export async function uploadLocalFileToDrive(
  token: string,
  localPath: string,
  driveFileName: string,
  onProgress?: (p: number) => void
): Promise<string> {
  try {
    if (window.api?.video?.uploadFileToDrive) {
      if (onProgress) onProgress(10);
      const { getOrCreateAppFolder } = await import('../drive');
      const folderId = await getOrCreateAppFolder(token);
      return await window.api.video.uploadFileToDrive(localPath, driveFileName, folderId, token);
    } else {
      const fileReq = await fetch('file:///' + localPath.replace(/\\/g, '/'));
      const blob = await fileReq.blob();
      const buffer = await blob.arrayBuffer();
      const { uploadToDrive } = await import('../drive');
      return await uploadToDrive(token, driveFileName, buffer, false as any, onProgress);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Request had invalid authentication credentials')) {
      console.warn('Token expirado interceptado! Forçando renovação automática...');
      const { getValidAccessToken } = await import('../drive');
      const newToken = await getValidAccessToken(true);
      if (!newToken)
        throw new Error('Google Drive não está conectado ou falha crítica ao renovar token.');

      // Retry with new token
      if (window.api?.video?.uploadFileToDrive) {
        const { getOrCreateAppFolder } = await import('../drive');
        const folderId = await getOrCreateAppFolder(newToken);
        return await window.api.video.uploadFileToDrive(localPath, driveFileName, folderId, newToken);
      } else {
        const fileReq = await fetch('file:///' + localPath.replace(/\\/g, '/'));
        const blob = await fileReq.blob();
        const buffer = await blob.arrayBuffer();
        const { uploadToDrive } = await import('../drive');
        return await uploadToDrive(newToken, driveFileName, buffer, false as any, onProgress);
      }
    }
    throw err;
  }
}
