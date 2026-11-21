import * as Y from 'yjs';

import { uint8ArrayToBase64, base64ToUint8Array } from './binary';

export { uint8ArrayToBase64, base64ToUint8Array };

const CRDT_COMPACT_THRESHOLD_BYTES = 128 * 1024;
const CRDT_COMPACT_RECHECK_DELTA_BYTES = 32 * 1024;
const CRDT_COMPACT_MIN_SAVINGS_RATIO = 0.05;

// Tracks large docs whose last compaction yielded <5% savings so subsequent 1s autosaves
// avoid repeatedly allocating/decoding temporary Y.Docs until meaningful bloat accumulates.
const compactionSkipUntilBytes = new WeakMap<Y.Doc, number>();

// Encodes current Y.Doc state as Base64 string
export function getYDocStateAsBase64(doc: Y.Doc): string {
  const stateVector = Y.encodeStateAsUpdate(doc);
  return uint8ArrayToBase64(stateVector);
}

/**
 * Encodes a Y.Doc state as Base64, applying lossless Yjs garbage-collection
 * compaction via a temporary gc-enabled Y.Doc when the raw update exceeds
 * 128 KB. Because Yjs GC replaces deleted item payloads with compact GC
 * structs while preserving all (clientID, clock) ranges identically, the
 * resulting update remains 100% CRDT-mergeable with other devices.
 */
export function getCompactedYDocStateAsBase64(
  doc: Y.Doc,
  thresholdBytes: number = CRDT_COMPACT_THRESHOLD_BYTES
): string {
  const rawUpdate = Y.encodeStateAsUpdate(doc);
  if (rawUpdate.byteLength <= thresholdBytes) {
    return uint8ArrayToBase64(rawUpdate);
  }

  const skipUntil = compactionSkipUntilBytes.get(doc);
  if (skipUntil !== undefined && rawUpdate.byteLength < skipUntil) {
    return uint8ArrayToBase64(rawUpdate);
  }

  let compactDoc: Y.Doc | null = null;
  try {
    compactDoc = new Y.Doc({ gc: true });
    Y.applyUpdate(compactDoc, rawUpdate);
    const compacted = Y.encodeStateAsUpdate(compactDoc);
    const savedBytes = rawUpdate.byteLength - compacted.byteLength;
    if (savedBytes < rawUpdate.byteLength * CRDT_COMPACT_MIN_SAVINGS_RATIO) {
      compactionSkipUntilBytes.set(doc, rawUpdate.byteLength + CRDT_COMPACT_RECHECK_DELTA_BYTES);
    } else {
      compactionSkipUntilBytes.delete(doc);
    }
    return uint8ArrayToBase64(
      compacted.byteLength < rawUpdate.byteLength ? compacted : rawUpdate
    );
  } catch (err) {
    console.warn('[Caderno:CRDT] Compaction skipped, falling back to raw update:', err);
    return uint8ArrayToBase64(rawUpdate);
  } finally {
    compactDoc?.destroy();
  }
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
