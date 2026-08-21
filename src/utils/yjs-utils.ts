import * as Y from 'yjs';

// Converte Uint8Array para Base64 em chunks de alta performance (evita congelamento da thread JS)
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

// Converte Base64 para Uint8Array em alta performance
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Extrai o estado atual de um Y.Doc como Base64
export function getYDocStateAsBase64(doc: Y.Doc): string {
  const stateVector = Y.encodeStateAsUpdate(doc);
  return uint8ArrayToBase64(stateVector);
}

// Aplica um estado em Base64 a um Y.Doc
export function applyBase64StateToYDoc(doc: Y.Doc, base64State: string) {
  try {
    const update = base64ToUint8Array(base64State);
    Y.applyUpdate(doc, update);
  } catch (err) {
    console.error("Erro ao aplicar estado CRDT:", err);
  }
}
