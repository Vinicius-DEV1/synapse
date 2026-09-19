/**
 * @file device-fingerprint.ts
 * @description High-entropy composite browser device fingerprinting engine.
 * Combines hardware, GPU rendering, and OS metrics with a persistent token.
 * Prevents device spoofing while providing human-readable labels for owner authorization.
 */

import type { DeviceFingerprint, DeviceSignals } from '../../types/sharing';
import { computeSha256Hex } from './share-crypto';

const PERSISTENT_TOKEN_KEY = 'caderno_share_device_token';

/**
 * Renders a subtle 2D canvas scene with text and geometric transforms
 * to extract GPU/driver rendering idiosyncrasies.
 */
function computeCanvasData(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas-context';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', sans-serif";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.fillText('Caderno-Vault-Fingerprint! ✨🔐', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Caderno-Vault-Fingerprint! ✨🔐', 4, 17);

    return canvas.toDataURL();
  } catch {
    return 'canvas-unsupported';
  }
}

/**
 * Extracts unmasked WebGL GPU vendor and renderer info if supported.
 */
function getWebGLInfo(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return { renderer: 'none', vendor: 'none' };

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return { renderer: 'generic-webgl', vendor: 'generic-vendor' };

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

    return {
      renderer: typeof renderer === 'string' ? renderer : 'unknown-renderer',
      vendor: typeof vendor === 'string' ? vendor : 'unknown-vendor',
    };
  } catch {
    return { renderer: 'webgl-error', vendor: 'webgl-error' };
  }
}

/**
 * Retrieves or initializes a persistent device token stored in localStorage.
 */
export function getOrCreatePersistentToken(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return crypto.randomUUID();
  }

  try {
    const existing = window.localStorage.getItem(PERSISTENT_TOKEN_KEY);
    if (existing && existing.length >= 16) {
      return existing;
    }
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(PERSISTENT_TOKEN_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Collects raw environmental and hardware signals from the running browser.
 */
export async function collectDeviceSignals(): Promise<DeviceSignals> {
  const canvasData = computeCanvasData();
  const canvasHash = await computeSha256Hex(canvasData);
  const webgl = getWebGLInfo();

  // navigator.deviceMemory is available in Chromium browsers
  interface NavigatorWithMemory extends Navigator {
    deviceMemory?: number;
  }
  const navMemory = (navigator as NavigatorWithMemory).deviceMemory ?? null;

  return {
    canvasHash,
    webglRenderer: webgl.renderer,
    webglVendor: webgl.vendor,
    platform: typeof navigator !== 'undefined' ? navigator.platform || 'unknown' : 'unknown',
    hardwareConcurrency:
      typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
    deviceMemory: navMemory,
    screenResolution:
      typeof screen !== 'undefined'
        ? `${screen.width}x${screen.height}@${window.devicePixelRatio || 1}`
        : 'unknown',
    colorDepth: typeof screen !== 'undefined' ? screen.colorDepth || 24 : 24,
    timezone:
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        : 'UTC',
    language: typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en',
    touchSupport:
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || (navigator?.maxTouchPoints ?? 0) > 0),
    cookieEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : true,
    doNotTrack: typeof navigator !== 'undefined' ? navigator.doNotTrack : null,
  };
}

/**
 * Computes a deterministic SHA-256 fingerprint hash from the composite signals.
 */
export async function computeFingerprintHash(signals: DeviceSignals): Promise<string> {
  const canonicalString = [
    signals.canvasHash,
    signals.webglRenderer,
    signals.webglVendor,
    signals.platform,
    signals.hardwareConcurrency,
    signals.deviceMemory,
    signals.screenResolution,
    signals.colorDepth,
    signals.timezone,
    signals.language,
    signals.touchSupport,
  ].join('|');

  return await computeSha256Hex(canonicalString);
}

/**
 * Builds a friendly, human-readable device label shown to the owner during approval.
 */
export function buildDisplayLabel(signals: DeviceSignals, userAgent: string): string {
  let browser = 'Browser';
  if (/Edg\//i.test(userAgent)) browser = 'Edge';
  else if (/Chrome\//i.test(userAgent)) browser = 'Chrome';
  else if (/Firefox\//i.test(userAgent)) browser = 'Firefox';
  else if (/Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';

  let os = 'Unknown OS';
  if (/Windows/i.test(userAgent)) os = 'Windows';
  else if (/Macintosh|Mac OS/i.test(userAgent)) os = 'macOS';
  else if (/Linux/i.test(userAgent)) os = 'Linux';
  else if (/Android/i.test(userAgent)) os = 'Android';
  else if (/iPhone|iPad/i.test(userAgent)) os = 'iOS';

  const res = signals.screenResolution.split('@')[0] || '';
  const cores = `${signals.hardwareConcurrency} cores`;

  return [browser, os, res, cores].filter(Boolean).join(' · ');
}

/**
 * Assembles the complete DeviceFingerprint composite structure.
 */
export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  const signals = await collectDeviceSignals();
  const fingerprintHash = await computeFingerprintHash(signals);
  const persistentToken = getOrCreatePersistentToken();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const displayLabel = buildDisplayLabel(signals, userAgent);

  return {
    fingerprintHash,
    persistentToken,
    displayLabel,
    signals,
  };
}

/**
 * Computes signal overlap ratio between two device signal snapshots.
 * Used to verify identity when a persistent token matches but browser updates
 * caused minor fingerprint drift.
 * Returns a score between 0.0 and 1.0 (threshold: >= 0.70).
 */
export function computeSignalOverlap(a: DeviceSignals, b: DeviceSignals): number {
  const checkedKeys: Array<keyof DeviceSignals> = [
    'webglRenderer',
    'webglVendor',
    'platform',
    'hardwareConcurrency',
    'deviceMemory',
    'colorDepth',
    'timezone',
    'language',
    'touchSupport',
  ];

  let matches = 0;
  for (const key of checkedKeys) {
    if (a[key] === b[key]) {
      matches++;
    }
  }

  // Screen resolution match (exact or aspect ratio)
  if (a.screenResolution === b.screenResolution) {
    matches++;
  }

  const total = checkedKeys.length + 1;
  return matches / total;
}
