import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import DocumentBundleNodeView from './DocumentBundleNodeView';
import type { BundledFileItem } from './types';

export interface DocumentBundleOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentBundle: {
      insertDocumentBundle: (options: {
        id?: string;
        title?: string;
        color?: string;
        items: BundledFileItem[];
      }) => ReturnType;
      ungroupDocumentBundle: (pos: number) => ReturnType;
      removeFromDocumentBundle: (pos: number, fileId: string, insertLoose?: boolean) => ReturnType;
    };
  }
}

export const DocumentBundleBlock = Node.create<DocumentBundleOptions>({
  name: 'documentBundle',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'document-bundle-widget',
      },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id') || crypto.randomUUID(),
        renderHTML: (attributes) => ({ 'data-id': attributes.id }),
      },
      title: {
        default: 'Documentos',
        parseHTML: (element) => element.getAttribute('data-title') || 'Documentos',
        renderHTML: (attributes) => ({ 'data-title': attributes.title }),
      },
      color: {
        default: 'default',
        parseHTML: (element) => element.getAttribute('data-color') || 'default',
        renderHTML: (attributes) =>
          attributes.color && attributes.color !== 'default' ? { 'data-color': attributes.color } : {},
      },
      items: {
        default: [],
        parseHTML: (element) => {
          try {
            const raw = element.getAttribute('data-items');
            return raw ? JSON.parse(raw) : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => ({
          'data-items': JSON.stringify(attributes.items || []),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="document-bundle"]',
      },
      {
        tag: 'span[data-type="document-bundle"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'document-bundle' }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DocumentBundleNodeView, {
      stopEvent: ({ event }) => {
        const target = event?.target as HTMLElement;
        if (target?.closest?.('[data-portal], [role="dialog"], .fixed, button, input, textarea, select')) {
          return true;
        }
        return false;
      },
    });
  },

  addCommands() {
    return {
      insertDocumentBundle:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: options.id || crypto.randomUUID(),
              title: options.title || 'Documentos',
              color: options.color || 'default',
              items: options.items || [],
            },
          });
        },

      ungroupDocumentBundle:
        (pos: number) =>
        ({ tr, state, dispatch }) => {
          const node = state.doc.nodeAt(pos);
          if (!node || node.type.name !== 'documentBundle') return false;

          const items: BundledFileItem[] = node.attrs.items || [];
          const color = node.attrs.color || 'default';

          if (dispatch) {
            const fileNodes = items.map((item) =>
              state.schema.nodes.fileWidget.create({
                fileId: item.fileId,
                name: item.name,
                fileType: item.fileType,
                isLink: item.isLink || false,
                color,
              })
            );

            tr.replaceWith(pos, pos + node.nodeSize, fileNodes);
            dispatch(tr);
          }
          return true;
        },

      removeFromDocumentBundle:
        (pos: number, fileId: string, insertLoose = true) =>
        ({ tr, state, dispatch }) => {
          const node = state.doc.nodeAt(pos);
          if (!node || node.type.name !== 'documentBundle') return false;

          const items: BundledFileItem[] = node.attrs.items || [];
          const removedItem = items.find((it) => it.fileId === fileId);
          if (!removedItem) return false;

          const remainingItems = items.filter((it) => it.fileId !== fileId);
          const color = node.attrs.color || 'default';

          if (dispatch) {
            if (remainingItems.length === 0) {
              if (insertLoose) {
                const looseNode = state.schema.nodes.fileWidget.create({
                  fileId: removedItem.fileId,
                  name: removedItem.name,
                  fileType: removedItem.fileType,
                  isLink: removedItem.isLink || false,
                  color,
                });
                tr.replaceWith(pos, pos + node.nodeSize, looseNode);
              } else {
                tr.delete(pos, pos + node.nodeSize);
              }
            } else {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                items: remainingItems,
              });
              if (insertLoose) {
                const looseNode = state.schema.nodes.fileWidget.create({
                  fileId: removedItem.fileId,
                  name: removedItem.name,
                  fileType: removedItem.fileType,
                  isLink: removedItem.isLink || false,
                  color,
                });
                tr.insert(pos + node.nodeSize, looseNode);
              }
            }
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    const nodeName = this.name;
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;

        if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
          const bundleId = selection.node.attrs.id;
          window.dispatchEvent(new CustomEvent('document-bundle-delete-request', { detail: { bundleId } }));
          return true;
        }

        const { $from } = selection;
        if (selection.empty && $from.nodeBefore?.type.name === nodeName) {
          const bundleId = $from.nodeBefore.attrs.id;
          window.dispatchEvent(new CustomEvent('document-bundle-delete-request', { detail: { bundleId } }));
          return true;
        }

        // Case 3: TextSelection that exactly wraps the node
        if (!selection.empty && $from.nodeAfter?.type.name === nodeName && selection.$to.pos === $from.pos + $from.nodeAfter.nodeSize) {
          const bundleId = $from.nodeAfter.attrs.id;
          window.dispatchEvent(new CustomEvent('document-bundle-delete-request', { detail: { bundleId } }));
          return true;
        }

        return false;
      },
      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;

        if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
          const bundleId = selection.node.attrs.id;
          window.dispatchEvent(new CustomEvent('document-bundle-delete-request', { detail: { bundleId } }));
          return true;
        }

        const { $from } = selection;
        if (selection.empty && $from.nodeAfter?.type.name === nodeName) {
          const bundleId = $from.nodeAfter.attrs.id;
          window.dispatchEvent(new CustomEvent('document-bundle-delete-request', { detail: { bundleId } }));
          return true;
        }

        // Case 3: TextSelection exactly wrapping the node
        if (!selection.empty && $from.nodeAfter?.type.name === nodeName && selection.$to.pos === $from.pos + $from.nodeAfter.nodeSize) {
          const bundleId = $from.nodeAfter.attrs.id;
          window.dispatchEvent(new CustomEvent('document-bundle-delete-request', { detail: { bundleId } }));
          return true;
        }

        return false;
      },
    };
  },
});
