import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildShareUrl } from './share-manager';

describe('share-manager - buildShareUrl', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('builds a secure public share URL with the default domain', () => {
    vi.stubEnv('VITE_FIREBASE_SHARE_DOMAIN', 'synapse-dev.web.app');
    const url = buildShareUrl('testShare123');
    expect(url).toBe('https://synapse-dev.web.app/s/testShare123');
  });

  it('never returns tauri://localhost even when running inside Tauri desktop webview', () => {
    // Simulate Tauri desktop environment
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'tauri://localhost',
        hostname: 'localhost',
        protocol: 'tauri:',
        pathname: '/',
      },
      writable: true,
      configurable: true,
    });

    vi.stubEnv('VITE_FIREBASE_SHARE_DOMAIN', 'synapse-dev.web.app');
    const url = buildShareUrl('AydavWcPUgtW');
    expect(url).toBe('https://synapse-dev.web.app/s/AydavWcPUgtW');
    expect(url).not.toContain('tauri://');
  });

  it('formats custom domains correctly and strips trailing slashes', () => {
    vi.stubEnv('VITE_FIREBASE_SHARE_DOMAIN', 'https://caderno.app///');
    const url = buildShareUrl('slug999');
    expect(url).toBe('https://caderno.app/s/slug999');
  });

  it('automatically adds https:// if protocol is omitted in domain env', () => {
    vi.stubEnv('VITE_FIREBASE_SHARE_DOMAIN', 'notes.myserver.com');
    const url = buildShareUrl('slug123');
    expect(url).toBe('https://notes.myserver.com/s/slug123');
  });

  it('allows local dev testing URL only when explicitly opted in via VITE_USE_LOCAL_SHARE_URL', () => {
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:5173',
        hostname: 'localhost',
        protocol: 'http:',
        pathname: '/',
      },
      writable: true,
      configurable: true,
    });

    // Without opt-in flag, still uses public domain
    vi.stubEnv('VITE_FIREBASE_SHARE_DOMAIN', 'synapse-dev.web.app');
    vi.stubEnv('VITE_USE_LOCAL_SHARE_URL', '');
    expect(buildShareUrl('devShare1')).toBe('https://synapse-dev.web.app/s/devShare1');

    // With explicit opt-in flag in http browser
    vi.stubEnv('VITE_USE_LOCAL_SHARE_URL', 'true');
    expect(buildShareUrl('devShare1')).toBe('http://localhost:5173/s/devShare1');
  });
});
