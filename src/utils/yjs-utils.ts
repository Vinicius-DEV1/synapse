import * as Y from 'yjs';

// Converte Uint8Array para Base64
export function uint8ArrayToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

// Converte Base64 para Uint8Array
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
