import * as Y from 'yjs';

// Converts Uint8Array to Base64 using high-performance chunking (prevents blocking the JS main thread)
export function uint8ArrayToBase64(buffer: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  const len = buffer.length;
  if (len <= CHUNK_SIZE) {
    return btoa(String.fromCharCode.apply(null, buffer as unknown as number[]));
  }
  let binary = '';
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = buffer.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

// Converts Base64 string to Uint8Array with optimal performance
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Encodes current Y.Doc state as Base64 string
export function getYDocStateAsBase64(doc: Y.Doc): string {
  const stateVector = Y.encodeStateAsUpdate(doc);
  return uint8ArrayToBase64(stateVector);
}

// Applies a Base64 update state to a Y.Doc
export function applyBase64StateToYDoc(doc: Y.Doc, base64State: string) {
  try {
    const update = base64ToUint8Array(base64State);
    Y.applyUpdate(doc, update);
  } catch (err) {
    console.error("Failed to apply CRDT state update:", err);
  }
}
