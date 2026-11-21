import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import {
  applyBase64StateToYDoc,
  getCompactedYDocStateAsBase64,
  getYDocStateAsBase64,
} from './yjs-utils';

describe('yjs-utils lossless CRDT compaction', () => {
  it('compacts deleted history from non-gc docs while staying 100% merge-compatible with peers', () => {
    const sourceDoc = new Y.Doc({ gc: false });
    const text = sourceDoc.getText('content');
    text.insert(0, 'A'.repeat(2000));
    text.delete(0, 1990);
    text.insert(10, ' final');

    // Capture a peer state BEFORE compaction
    const peerDoc = new Y.Doc();
    applyBase64StateToYDoc(peerDoc, getYDocStateAsBase64(sourceDoc));

    const rawBase64 = getYDocStateAsBase64(sourceDoc);
    const compactedBase64 = getCompactedYDocStateAsBase64(sourceDoc, 64);

    // Compaction drops deleted text payload into tiny GC tombstones
    expect(compactedBase64.length).toBeLessThan(rawBase64.length);

    // Loading compacted state preserves exact live text
    const freshDoc = new Y.Doc();
    applyBase64StateToYDoc(freshDoc, compactedBase64);
    expect(freshDoc.getText('content').toString()).toBe('AAAAAAAAAA final');

    // Merging compacted state into a peer holding pre-compaction history does NOT duplicate text
    applyBase64StateToYDoc(peerDoc, compactedBase64);
    expect(peerDoc.getText('content').toString()).toBe('AAAAAAAAAA final');

    // Concurrent edit on peer still merges cleanly onto compacted doc
    peerDoc.getText('content').insert(peerDoc.getText('content').length, '!');
    applyBase64StateToYDoc(freshDoc, getYDocStateAsBase64(peerDoc));
    expect(freshDoc.getText('content').toString()).toBe('AAAAAAAAAA final!');

    sourceDoc.destroy();
    peerDoc.destroy();
    freshDoc.destroy();
  });

  it('converges cleanly when Device A compacts >128KB history offline while Device B edits concurrently', () => {
    const deviceA = new Y.Doc({ gc: false });
    const fragA = deviceA.getXmlFragment('default');
    const p1 = new Y.XmlElement('paragraph');
    p1.insert(0, [new Y.XmlText('Shared intro')]);
    fragA.insert(0, [p1]);

    // Sync initial doc to Device B before offline divergence
    const deviceB = new Y.Doc({ gc: false });
    applyBase64StateToYDoc(deviceB, getYDocStateAsBase64(deviceA));

    // Device A creates and deletes >140KB of temporary text offline, then compacts using default 128KB threshold
    const tempBlock = new Y.XmlElement('paragraph');
    tempBlock.insert(0, [new Y.XmlText('X'.repeat(145 * 1024))]);
    fragA.insert(1, [tempBlock]);
    fragA.delete(1, 1);

    const aNote = new Y.XmlElement('paragraph');
    aNote.insert(0, [new Y.XmlText('Added by A')]);
    fragA.insert(1, [aNote]);

    const rawA = getYDocStateAsBase64(deviceA);
    const compactedA = getCompactedYDocStateAsBase64(deviceA);
    expect(compactedA.length).toBeLessThan(rawA.length / 10);

    // Concurrently offline, Device B adds a new block without seeing A's compaction
    const fragB = deviceB.getXmlFragment('default');
    const bNote = new Y.XmlElement('paragraph');
    bNote.insert(0, [new Y.XmlText('Added by B')]);
    fragB.insert(1, [bNote]);
    const stateB = getYDocStateAsBase64(deviceB);

    // Both devices merge each other's states (A compacted + B uncompacted)
    const deviceACompactReloaded = new Y.Doc();
    applyBase64StateToYDoc(deviceACompactReloaded, compactedA);
    applyBase64StateToYDoc(deviceACompactReloaded, stateB);

    applyBase64StateToYDoc(deviceB, compactedA);

    const xmlA = deviceACompactReloaded.getXmlFragment('default').toString();
    const xmlB = deviceB.getXmlFragment('default').toString();
    expect(xmlA).toBe(xmlB);
    expect(xmlA).toContain('Shared intro');
    expect(xmlA).toContain('Added by A');
    expect(xmlA).toContain('Added by B');
    expect(xmlA).not.toContain('XXXXXX');

    deviceA.destroy();
    deviceB.destroy();
    deviceACompactReloaded.destroy();
  });
});
