import { describe, it, expect } from 'vitest';
import {
  computeSignalOverlap,
  buildDisplayLabel,
  getOrCreatePersistentToken,
} from './device-fingerprint';
import { DeviceSignals } from '../../types/sharing';

describe('device-fingerprint service', () => {
  const mockSignals: DeviceSignals = {
    canvasHash: 'a1b2c3d4e5f6',
    webglRenderer: 'ANGLE (Intel, Mesa Intel UHD Graphics 620)',
    webglVendor: 'Intel Open Source Technology Center',
    platform: 'Linux x86_64',
    hardwareConcurrency: 8,
    deviceMemory: 16,
    screenResolution: '1920x1080@1',
    colorDepth: 24,
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    touchSupport: false,
    cookieEnabled: true,
    doNotTrack: '1',
  };

  it('computes 1.0 signal overlap for identical signals', () => {
    const score = computeSignalOverlap(mockSignals, { ...mockSignals });
    expect(score).toBe(1.0);
  });

  it('computes partial overlap when some signals drift (e.g. browser update)', () => {
    const drifted: DeviceSignals = {
      ...mockSignals,
      language: 'en-US',
      screenResolution: '2560x1440@1',
    };
    const score = computeSignalOverlap(mockSignals, drifted);
    expect(score).toBeGreaterThanOrEqual(0.70);
    expect(score).toBeLessThan(1.0);
  });

  it('computes low overlap for completely different hardware/platform', () => {
    const mobileDevice: DeviceSignals = {
      canvasHash: '999999999',
      webglRenderer: 'Apple GPU',
      webglVendor: 'Apple Inc.',
      platform: 'iPhone',
      hardwareConcurrency: 6,
      deviceMemory: 4,
      screenResolution: '390x844@3',
      colorDepth: 32,
      timezone: 'Europe/London',
      language: 'en-GB',
      touchSupport: true,
      cookieEnabled: true,
      doNotTrack: null,
    };
    const score = computeSignalOverlap(mockSignals, mobileDevice);
    expect(score).toBeLessThan(0.30);
  });

  it('formats display labels cleanly for owner inspection', () => {
    const chromeUA =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    const label = buildDisplayLabel(mockSignals, chromeUA);
    expect(label).toContain('Chrome');
    expect(label).toContain('Linux');
    expect(label).toContain('1920x1080');
    expect(label).toContain('8 cores');
  });

  it('creates or reuses persistent token from localStorage', () => {
    const t1 = getOrCreatePersistentToken();
    const t2 = getOrCreatePersistentToken();
    expect(t1).toBeDefined();
    expect(t1).toEqual(t2);
  });
});
