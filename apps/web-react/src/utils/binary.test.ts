import { describe, it, expect } from 'vitest';
import {
  uint8ArrayToBase64,
  arrayBufferToBase64,
  base64ToUint8Array,
  base64ToArrayBuffer,
  hexToUint8Array,
  hexToArrayBuffer,
  uint8ArrayToHex,
  arrayBufferToHex,
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

  it('converts Uint8Array and ArrayBuffer to hex and back', () => {
    const originalBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x01, 0x0a]);
    const hex = 'deadbeef010a';

    expect(uint8ArrayToHex(originalBytes)).toBe(hex);
    expect(arrayBufferToHex(originalBytes.buffer)).toBe(hex);

    const parsedBytes = hexToUint8Array(hex);
    expect(Array.from(parsedBytes)).toEqual(Array.from(originalBytes));

    const parsedBuffer = hexToArrayBuffer(hex);
    expect(Array.from(new Uint8Array(parsedBuffer))).toEqual(Array.from(originalBytes));
  });
});
