/**
 * Helper to upload a local file to Drive via fetch or Rust bridge with automatic retry on token expiration.
 */
export async function uploadLocalFileToDrive(
  token: string,
  localPath: string,
  driveFileName: string,
  onProgress?: (p: number) => void
): Promise<any> {
  const doUpload = async (activeToken: string): Promise<any> => {
    if (window.api?.video?.uploadFileToDrive) {
      if (onProgress) onProgress(10);
      const { getOrCreateAppFolder } = await import('../drive');
      const folderId = await getOrCreateAppFolder(activeToken);
      return await window.api.video.uploadFileToDrive(localPath, driveFileName, folderId, activeToken);
    } else {
      const fileReq = await fetch('file:///' + localPath.replace(/\\/g, '/'));
      const blob = await fileReq.blob();
      const buffer = await blob.arrayBuffer();
      const { uploadToDrive } = await import('../drive');
      return await uploadToDrive(activeToken, driveFileName, buffer, 'root', onProgress);
    }
  };

  try {
    return await doUpload(token);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Request had invalid authentication credentials')) {
      console.warn('Expired Google Drive token intercepted. Forcing automatic token renewal...');
      const { getValidAccessToken } = await import('../drive');
      const newToken = await getValidAccessToken(true);
      if (!newToken) {
        throw new Error('Google Drive is disconnected or failed to refresh authentication token.');
      }
      return await doUpload(newToken);
    }
    throw err;
  }
}
