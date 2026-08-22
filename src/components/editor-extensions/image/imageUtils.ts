/**
 * imageUtils.ts
 *
 * Helpers compartilhados pelos node views de imagem (ResizableImage e
 * EncryptedImage) e pelo Editor. Concentra tudo que depende do ProseMirror
 * keeping React components purely focused on UI rendering.
 */

import type { Editor } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';

/** Todos os tipos de node que representam uma imagem no documento. */
export const IMAGE_NODE_TYPES = ['image', 'resizableImage', 'encryptedImage'];

export type ImageAlign = 'left' | 'center' | 'right';

export const MIN_IMAGE_WIDTH = 60;

export function isImageNode(node: PMNode | null | undefined): boolean {
  return !!node && IMAGE_NODE_TYPES.includes(node.type.name);
}

/**
 * TipTap's `getPos` can return `undefined` when the node view has already been
 * destroyed (during a drag operation, collaborative undo, etc.).
 * precisa tratar isso — usar o valor cru causa `deleteRange({from: undefined})`.
 */
export function safePos(getPos: unknown): number | null {
  if (typeof getPos !== 'function') return null;
  const pos = (getPos as () => number | undefined)();
  return typeof pos === 'number' && Number.isFinite(pos) ? pos : null;
}

/** Normalized alignment attributes (legacy documents omit `align`). */
export function normalizeAlign(value: unknown): ImageAlign {
  return value === 'left' || value === 'right' ? value : 'center';
}

/** Classe de margem que implementa o alinhamento de um bloco `w-fit`. */
export function alignToClass(align: ImageAlign): string {
  if (align === 'left') return 'mr-auto ml-0';
  if (align === 'right') return 'ml-auto mr-0';
  return 'mx-auto';
}

/** Imagem atualmente selecionada (NodeSelection), se houver. */
export function getSelectedImage(state: EditorState): { node: PMNode; pos: number } | null {
  const sel = state.selection;
  if (sel instanceof NodeSelection && isImageNode(sel.node)) {
    return { node: sel.node, pos: sel.from };
  }
  return null;
}

/**
 * Relocates a specific node position in current document state.
 * Used when a previously captured position (e.g. before opening modal)
 * might be stale due to concurrent edits or sync.
 */
export function findNodePos(doc: PMNode, node: PMNode, hintPos?: number | null): number | null {
  if (typeof hintPos === 'number' && hintPos >= 0 && hintPos < doc.content.size) {
    const atHint = doc.nodeAt(hintPos);
    if (atHint === node) return hintPos;
  }

  let found: number | null = null;
  doc.descendants((candidate, pos) => {
    if (found !== null) return false;
    if (candidate === node) {
      found = pos;
      return false;
    }
    return true;
  });

  if (found !== null) return found;

  // Fallback: same logical identity (matching node type + key attributes).
  const key = identityKey(node);
  if (!key) return null;

  doc.descendants((candidate, pos) => {
    if (found !== null) return false;
    if (candidate.type === node.type && identityKey(candidate) === key) {
      found = pos;
      return false;
    }
    return true;
  });

  return found;
}

function identityKey(node: PMNode): string | null {
  const { driveFileId, src } = node.attrs as Record<string, unknown>;
  if (typeof driveFileId === 'string' && driveFileId) return `drive:${driveFileId}`;
  if (typeof src === 'string' && src) return `src:${src}`;
  return null;
}

/**
 * Moves the block at `pos` one step up (-1) or down (+1) inside
 * its container, preserving selection on the moved node.
 */
export function moveBlockNode(editor: Editor, pos: number, direction: -1 | 1): boolean {
  const { state, dispatch } = editor.view;
  const node = state.doc.nodeAt(pos);
  if (!node) return false;

  const from = pos;
  const to = pos + node.nodeSize;

  let insertPos: number;
  if (direction === -1) {
    const sibling = state.doc.resolve(from).nodeBefore;
    if (!sibling) return false;
    insertPos = from - sibling.nodeSize;
  } else {
    const sibling = state.doc.resolve(to).nodeAfter;
    if (!sibling) return false;
    insertPos = to + sibling.nodeSize;
  }

  const tr = state.tr;
  tr.delete(from, to);
  const mapped = tr.mapping.map(insertPos, -1);
  tr.insert(mapped, node);

  try {
    tr.setSelection(NodeSelection.create(tr.doc, mapped));
  } catch {
    /* Non-selectable position — continue without explicit selection */
  }

  dispatch(tr.scrollIntoView());
  return true;
}

/** Removes image node at `pos` (re-validating position prior to removal). */
export function deleteImageAt(editor: Editor, node: PMNode, hintPos: number | null): boolean {
  const { state, dispatch } = editor.view;
  const pos = findNodePos(state.doc, node, hintPos);
  if (pos === null) return false;

  const current = state.doc.nodeAt(pos);
  if (!current) return false;

  dispatch(state.tr.delete(pos, pos + current.nodeSize));
  return true;
}

/**
 * Copies the image to clipboard.
 * `navigator.clipboard.write` reliably accepts image/png, so
 * other formats (JPEG, WebP) are converted via canvas to prevent
 * silent clipboard write failures.
 */
export async function copyImageToClipboard(src: string): Promise<void> {
  const response = await fetch(src);
  const blob = await response.blob();

  if (blob.type === 'image/png') {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return;
  }

  const pngBlob = await blobToPng(blob);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
}

function blobToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas 2d indisponível');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((out) => {
          URL.revokeObjectURL(url);
          out ? resolve(out) : reject(new Error('falha ao converter para PNG'));
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('falha ao decodificar a imagem'));
    };
    img.src = url;
  });
}

/** Triggers image download without relying on `<a download>` with blob/data URLs. */
export async function downloadImage(src: string, fileName: string): Promise<void> {
  const response = await fetch(src);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = withExtension(fileName, blob.type);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function withExtension(name: string, mimeType: string): string {
  if (/\.[a-z0-9]{2,5}$/i.test(name)) return name;
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg').replace(/\+.*$/, '') || 'png';
  return `${name}.${ext}`;
}
