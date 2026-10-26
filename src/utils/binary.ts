/**
 * Unified binary conversion utilities (ArrayBuffer, Uint8Array, Base64, Hex).
 * Optimized with pre-computed lookup tables and batching to eliminate GC churn and call stack issues.
 */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Pre-computed hex lookup table to avoid allocating temporary strings per byte
const HEX_TABLE: string[] = [];
for (let i = 0; i < 256; i++) {
  HEX_TABLE[i] = i.toString(16).padStart(2, '0');
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const len = bytes.length;
  if (len === 0) return '';

  // Use ECMAScript 2024 native toBase64 if available
  if (typeof (bytes as unknown as { toBase64?: () => string }).toBase64 === 'function') {
    return (bytes as unknown as { toBase64: () => string }).toBase64();
  }

  const remainder = len % 3;
  const mainLen = len - remainder;
  const parts: string[] = [];
  const BATCH_SIZE = 16383; // 16383 chars is a multiple of 3 triples to avoid splitting
  let subStr = '';

  for (let i = 0; i < mainLen; i += 3) {
    const triple = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    subStr +=
      B64_CHARS[(triple >> 18) & 63] +
      B64_CHARS[(triple >> 12) & 63] +
      B64_CHARS[(triple >> 6) & 63] +
      B64_CHARS[triple & 63];
    if (subStr.length >= BATCH_SIZE) {
      parts.push(subStr);
      subStr = '';
    }
  }

  if (remainder === 1) {
    const b0 = bytes[mainLen];
    subStr +=
      B64_CHARS[(b0 >> 2) & 63] +
      B64_CHARS[(b0 << 4) & 63] +
      '==';
  } else if (remainder === 2) {
    const double = (bytes[mainLen] << 8) | bytes[mainLen + 1];
    subStr +=
      B64_CHARS[(double >> 10) & 63] +
      B64_CHARS[(double >> 4) & 63] +
      B64_CHARS[(double << 2) & 63] +
      '=';
  }

  if (subStr.length > 0) {
    parts.push(subStr);
  }

  return parts.length === 1 ? parts[0] : parts.join('');
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return uint8ArrayToBase64(new Uint8Array(buffer));
}

export function base64ToUint8Array(base64: string): Uint8Array {
  // Use native fromBase64 if available
  if (typeof (Uint8Array as unknown as { fromBase64?: (s: string) => Uint8Array }).fromBase64 === 'function') {
    return (Uint8Array as unknown as { fromBase64: (s: string) => Uint8Array }).fromBase64(base64);
  }
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return base64ToUint8Array(base64).buffer as ArrayBuffer;
}

export function hexToUint8Array(hex: string): Uint8Array {
  const len = hex.length;
  const bytes = new Uint8Array(len >>> 1);
  for (let i = 0; i < len; i += 2) {
    bytes[i >>> 1] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  return hexToUint8Array(hex).buffer as ArrayBuffer;
}

export function uint8ArrayToHex(bytes: Uint8Array): string {
  const len = bytes.length;
  let out = '';
  for (let i = 0; i < len; i++) {
    out += HEX_TABLE[bytes[i]];
  }
  return out;
}

export function arrayBufferToHex(buffer: ArrayBuffer): string {
  return uint8ArrayToHex(new Uint8Array(buffer));
}
