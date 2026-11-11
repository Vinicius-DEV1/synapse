/**
 * BlobImageInterceptor.ts
 * 
 * ProseMirror plugin that intercepts ANY 'image' node with src="blob:..." 
 * and automatically converts it to 'encryptedImage'.
 * 
 * Solves the Linux/WebKitGTK issue where handlePaste in editorProps
 * is bypassed when pasting images, inserting raw <img src="blob:...">.
 * This plugin guarantees automatic conversion across all platforms.
 */

import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { setCachedImage } from '../../services/image-drive';

const blobInterceptorKey = new PluginKey('blobImageInterceptor');

// Track blobs currently in-flight to prevent duplicate conversions
const processingBlobs = new Set<string>();

export const BlobImageInterceptor = Extension.create({
  name: 'blobImageInterceptor',

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: blobInterceptorKey,

        // Observe transactions and inspect for 'image' nodes containing blob: URLs
        appendTransaction(transactions, _oldState, newState) {
          // Process only when document content changed
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) return null;

          // Search for image nodes with blob: URLs
          newState.doc.descendants((node, pos) => {
            if (
              node.type.name === 'image' &&
              node.attrs.src &&
              typeof node.attrs.src === 'string' &&
              node.attrs.src.startsWith('blob:') &&
              !processingBlobs.has(node.attrs.src)
            ) {
              const blobUrl = node.attrs.src;
              processingBlobs.add(blobUrl);

              console.log(`[BlobInterceptor] Detected <img src="blob:...">. Initiating async conversion...`);

              // Async flow: fetch blob data FIRST, then replace editor node
              convertBlobToEncryptedImage(editor, blobUrl, pos, node.attrs).finally(() => {
                processingBlobs.delete(blobUrl);
              });
            }
          });

          // Do not mutate current transaction — substitution executes asynchronously
          return null;
        },
      }),
    ];
  },
});

/**
 * Fetches blob buffer, saves to local cache, and replaces editor image node.
 */
async function convertBlobToEncryptedImage(
  editor: Editor,
  blobUrl: string,
  _originalPos: number,
  attrs: Record<string, unknown>
) {
  try {
    // 1. Fetch blob while active in memory
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    const file = new File([blob], 'pasted-image.png', { type: blob.type || 'image/png' });
    const buffer = await file.arrayBuffer();

    // 2. Generate temporary identifier
    const tempId = 'uploading_' + Date.now() + Math.random().toString(36).substring(2, 6);

    // 3. Persist to pendingUploads and local cache BEFORE creating node
    if (!window.__pendingImageUploads) {
      window.__pendingImageUploads = new Map();
    }
    window.__pendingImageUploads.set(tempId, file);
    await setCachedImage(tempId, buffer, file.type);

    console.log(`[BlobInterceptor] Blob cached locally. tempId="${tempId}" (${buffer.byteLength} bytes). Replacing node...`);

    // 4. Search for ALL image nodes with this blob URL in current document.
    // Replace all occurrences to prevent orphaned revoked blob URLs.
    const foundPositions: number[] = [];
    editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (node.type.name === 'image' && node.attrs.src === blobUrl) {
        foundPositions.push(pos);
      }
    });

    if (foundPositions.length === 0) {
      console.warn(`[BlobInterceptor] Node image with blob URL not found. May have already been replaced.`);
      return;
    }

    // 5. Replace each image node with encryptedImage
    const { tr } = editor.state;
    const encryptedImageType = editor.state.schema.nodes.encryptedImage;

    if (!encryptedImageType) {
      console.error('[BlobInterceptor] Node type "encryptedImage" not found in schema!');
      return;
    }

    // Replace from right to left to avoid invalidating mapped positions
    let replaced = 0;
    for (const pos of foundPositions.slice().reverse()) {
      const mappedPos = tr.mapping.map(pos, -1);
      const node = tr.doc.nodeAt(mappedPos);
      if (!node || node.type.name !== 'image' || node.attrs.src !== blobUrl) continue;
      const newNode = encryptedImageType.create({
        driveFileId: tempId,
        width: attrs.width,
        height: attrs.height,
      });
      tr.replaceWith(mappedPos, mappedPos + node.nodeSize, newNode);
      replaced += 1;
    }

    if (replaced > 0) {
      editor.view.dispatch(tr);
      console.log(`[BlobInterceptor] ${replaced} node(s) substituído(s) com sucesso! encryptedImage com tempId="${tempId}"`);
      // Free object URL immediately to release browser memory
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Ignore revoke errors on external blob URLs
      }
    }
  } catch (err: unknown) {
    console.error('[BlobInterceptor] Erro ao converter blob:', err);
  }
}
