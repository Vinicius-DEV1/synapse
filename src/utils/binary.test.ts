import { describe, it, expect } from 'vitest';
import {
  uint8ArrayToBase64,
  arrayBufferToBase64,
  base64ToUint8Array,
  base64ToArrayBuffer,
} from './binary';

describe('binary utils', () => {
  it('converts Uint8Array to base64 and back', () => {
    const original = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]); // "Hello World"
    const base64 = uint8ArrayToBase64(original);
    
    expect(base64).toBe('SGVsbG8gV29ybGQ=');
    
    const reconstructed = base64ToUint8Array(base64);
    expect(Array.from(reconstructed)).toEqual(Array.from(original));
  });

  it('converts ArrayBuffer to base64 and back', () => {
    const text = 'Caderno Test Buffer';
    const encoder = new TextEncoder();
    const buffer = encoder.encode(text).buffer;

    const base64 = arrayBufferToBase64(buffer);
    const decodedBuffer = base64ToArrayBuffer(base64);
    
    const decoder = new TextDecoder();
    expect(decoder.decode(decodedBuffer)).toBe(text);
  });

  it('handles large Uint8Array chunks without call stack overflow', () => {
    const large = new Uint8Array(20000);
    for (let i = 0; i < large.length; i++) {
      large[i] = i % 256;
    }

    const base64 = uint8ArrayToBase64(large);
    expect(typeof base64).toBe('string');

    const reconstructed = base64ToUint8Array(base64);
    expect(reconstructed.length).toBe(20000);
    expect(reconstructed[100]).toBe(100 % 256);
  });
});
