import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
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
  group: 'inline',
  inline: true,
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
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="file-widget"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'file-widget' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileWidgetNodeView);
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
});
