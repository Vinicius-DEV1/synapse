import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { EncryptedImageNodeView } from './image/EncryptedImageNodeView';

export { EncryptedImageNodeView };

// ─── TipTap Node Definition ────────────────────────────────────────────────

export const EncryptedImage = Node.create({
  name: 'encryptedImage',

  inline: false,
  group: 'block',

  atom: true,
  draggable: true,

  addAttributes() {
    return {
      driveFileId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-drive-file-id'),
        renderHTML: (attributes) => {
          if (!attributes.driveFileId) return {};
          return { 'data-drive-file-id': attributes.driveFileId };
        },
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-width');
          return val ? Number(val) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { 'data-width': attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-height');
          return val ? Number(val) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { 'data-height': attributes.height };
        },
      },
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption'),
        renderHTML: (attributes) => {
          if (!attributes.caption) return {};
          return { 'data-caption': attributes.caption };
        },
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-alt'),
        renderHTML: (attributes) => {
          if (!attributes.alt) return {};
          return { 'data-alt': attributes.alt };
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => {
          if (!attributes.align || attributes.align === 'center') return {};
          return { 'data-align': attributes.align };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'encrypted-image' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['encrypted-image', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EncryptedImageNodeView, { trackNodeViewPosition: true });
  },
});
