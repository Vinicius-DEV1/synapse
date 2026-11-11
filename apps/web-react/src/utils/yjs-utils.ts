import * as Y from 'yjs';

import { uint8ArrayToBase64, base64ToUint8Array } from './binary';

export { uint8ArrayToBase64, base64ToUint8Array };

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
