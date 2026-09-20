export const DRIVE_CLIENT_ID =
  '380707248992-fj03dp8cdeajh25b2til4954j2h3nn1m.apps.googleusercontent.com';

function base64URLEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(digest);
}

/**
 * Generates Google OAuth2 login URL with PKCE
 */
export function getDriveAuthUrl(codeChallenge: string): string {
  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');
  const redirectUri = encodeURIComponent(
    import.meta.env.VITE_DRIVE_REDIRECT_URI || 'http://localhost:5173'
  );
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${DRIVE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&code_challenge=${codeChallenge}&code_challenge_method=S256`;
}
