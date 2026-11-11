import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import FileWidgetNodeView from './FileWidgetNodeView';

export interface FileWidgetOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileWidget: {
      insertFileWidget: (options: { fileId: string, name: string, fileType: string, isLink: boolean }) => ReturnType;
    }
  }
}

export const FileWidgetBlock = Node.create<FileWidgetOptions>({
  name: 'fileWidget',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'file-widget',
      },
    }
  },

  addAttributes() {
    return {
      fileId: {
        default: null,
        parseHTML: element => element.getAttribute('data-file-id'),
        renderHTML: attributes => ({ 'data-file-id': attributes.fileId }),
      },
      name: {
        default: '',
        parseHTML: element => element.getAttribute('data-name'),
        renderHTML: attributes => ({ 'data-name': attributes.name }),
      },
      fileType: {
        default: 'other',
        parseHTML: element => element.getAttribute('data-file-type'),
        renderHTML: attributes => ({ 'data-file-type': attributes.fileType }),
      },
      isLink: {
        default: false,
        parseHTML: element => element.getAttribute('data-is-link') === 'true',
        renderHTML: attributes => ({ 'data-is-link': attributes.isLink ? 'true' : 'false' }),
      },
      color: {
        default: 'default',
        parseHTML: element => element.getAttribute('data-color') || 'default',
        renderHTML: attributes =>
          attributes.color && attributes.color !== 'default' ? { 'data-color': attributes.color } : {},
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="file-widget"]',
      },
      {
        tag: 'span[data-type="file-widget"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'file-widget' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileWidgetNodeView, {
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
      insertFileWidget: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    }
  },

  addKeyboardShortcuts() {
    const nodeName = this.name;

    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;

        // Case 1: Node is already selected via NodeSelection
        if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
          const fileId = selection.node.attrs.fileId;
          window.dispatchEvent(new CustomEvent('file-widget-delete-request', { detail: { fileId } }));
          return true;
        }

        // Case 2: Cursor (TextSelection) right after inline atom - Backspace would delete directly
        const { $from } = selection;
        if (selection.empty && $from.nodeBefore?.type.name === nodeName) {
          const fileId = $from.nodeBefore.attrs.fileId;
          window.dispatchEvent(new CustomEvent('file-widget-delete-request', { detail: { fileId } }));
          return true;
        }

        // Case 3: TextSelection that exactly wraps the node (happens on focus restore)
        if (!selection.empty && $from.nodeAfter?.type.name === nodeName && selection.$to.pos === $from.pos + $from.nodeAfter.nodeSize) {
          const fileId = $from.nodeAfter.attrs.fileId;
          window.dispatchEvent(new CustomEvent('file-widget-delete-request', { detail: { fileId } }));
          return true;
        }

        return false;
      },
      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;

        // Case 1: NodeSelection
        if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
          const fileId = selection.node.attrs.fileId;
          window.dispatchEvent(new CustomEvent('file-widget-delete-request', { detail: { fileId } }));
          return true;
        }

        // Case 2: Cursor directly before inline atom — prevent unhandled delete
        const { $from } = selection;
        if (selection.empty && $from.nodeAfter?.type.name === nodeName) {
          const fileId = $from.nodeAfter.attrs.fileId;
          window.dispatchEvent(new CustomEvent('file-widget-delete-request', { detail: { fileId } }));
          return true;
        }

        // Case 3: TextSelection exactly wrapping the node
        if (!selection.empty && $from.nodeAfter?.type.name === nodeName && selection.$to.pos === $from.pos + $from.nodeAfter.nodeSize) {
          const fileId = $from.nodeAfter.attrs.fileId;
          window.dispatchEvent(new CustomEvent('file-widget-delete-request', { detail: { fileId } }));
          return true;
        }

        return false;
      },
    };
  },
});

