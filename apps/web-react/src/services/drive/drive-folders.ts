import { resilientFetch } from './drive-auth';

export const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
export const APP_FOLDER_NAME = 'Caderno - Biblioteca';

export async function getOrCreateAppFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(`name = '${APP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const res = await resilientFetch(`${DRIVE_API_URL}?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder if not found
  const createRes = await resilientFetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Falha ao criar pasta: ${createData.error?.message || 'Erro desconhecido'}`);
  }
  return createData.id;
}

export async function getOrCreatePhotosFolder(accessToken: string, parentFolderId: string): Promise<string> {
  const query = encodeURIComponent(`name = 'FOTOS' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const res = await resilientFetch(`${DRIVE_API_URL}?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  const createRes = await resilientFetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'FOTOS',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    })
  });

  const createData = await createRes.json();
  return createData.id;
}

export async function getOrCreateLofiFolder(accessToken: string, parentFolderId: string): Promise<string> {
  const query = encodeURIComponent(`name = 'LOFI' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const res = await resilientFetch(`${DRIVE_API_URL}?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  const createRes = await resilientFetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'LOFI',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    })
  });

  const createData = await createRes.json();
  return createData.id;
}
