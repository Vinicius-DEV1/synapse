import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  getDriveAuthUrl,
  exchangeCodeForToken,
  refreshToken,
  getDriveCredentials,
  saveDriveCredentials,
  getValidAccessToken,
  setDriveMasterKey,
} from './drive-auth';
import { importHexKey } from '../crypto';

describe('drive-auth service', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setDriveMasterKey(null);
    vi.clearAllMocks();

    (window as any).api = {
      sync: {
        getTable: vi.fn().mockResolvedValue([]),
        upsertRow: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates PKCE code verifier and SHA-256 challenge correctly', async () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toBeDefined();
    expect(verifier.length).toBeGreaterThan(30);

    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toBeDefined();
    expect(typeof challenge).toBe('string');
    expect(challenge.length).toBeGreaterThan(20);
  });

  it('constructs correct Google OAuth2 authorization URL with PKCE parameters', () => {
    const url = getDriveAuthUrl('test_challenge_123');
    expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('code_challenge=test_challenge_123');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file');
  });

  it('exchanges authorization code for access and refresh tokens', async () => {
    const mockTokenResponse = {
      access_token: 'mock_access_token_123',
      refresh_token: 'mock_refresh_token_456',
      expires_in: 3600,
      token_type: 'Bearer',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTokenResponse,
    } as Response);

    const token = await exchangeCodeForToken('auth_code_xyz', 'verifier_abc');
    expect(token.access_token).toBe('mock_access_token_123');
    expect(token.refresh_token).toBe('mock_refresh_token_456');
    expect(token.expires_at).toBeGreaterThan(Date.now());
  });

  it('refreshes expired access token using refresh_token', async () => {
    const mockRefreshResponse = {
      access_token: 'renewed_access_token_789',
      expires_in: 3600,
      token_type: 'Bearer',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRefreshResponse,
    } as Response);

    const token = await refreshToken('existing_refresh_token');
    expect(token.access_token).toBe('renewed_access_token_789');
    expect(token.refresh_token).toBe('existing_refresh_token');
  });

  it('saves and retrieves drive credentials via window.api.sync', async () => {
    const mockToken = {
      access_token: 'access_1',
      refresh_token: 'refresh_1',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
    };

    await saveDriveCredentials(mockToken);
    expect(window.api.sync.upsertRow).toHaveBeenCalledWith(
      'config',
      expect.objectContaining({
        id: 'drive_credentials',
        data: JSON.stringify({ token: mockToken }),
      })
    );

    (window as any).api.sync.getTable.mockResolvedValue([
      {
        id: 'drive_credentials',
        data: JSON.stringify({ token: mockToken }),
      },
    ]);

    const retrieved = await getDriveCredentials();
    expect(retrieved.token).toEqual(mockToken);
  });

  it('returns valid access token and auto-refreshes if close to expiration', async () => {
    // Token expiring in 10 seconds (< 60s buffer)
    const almostExpiredToken = {
      access_token: 'old_access',
      refresh_token: 'valid_refresh',
      expires_in: 10,
      expires_at: Date.now() + 10000,
    };

    (window as any).api.sync.getTable.mockResolvedValue([
      {
        id: 'drive_credentials',
        data: JSON.stringify({ token: almostExpiredToken }),
      },
    ]);

    const mockRefreshResponse = {
      access_token: 'brand_new_token',
      expires_in: 3600,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRefreshResponse,
    } as Response);

    const validToken = await getValidAccessToken();
    expect(validToken).toBe('brand_new_token');
  });
});
