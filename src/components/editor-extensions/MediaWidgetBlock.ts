import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import MediaWidgetNodeView from './MediaWidgetNodeView';

export interface MediaWidgetOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaWidget: {
      insertMediaWidget: (options: { mediaId: string, mediaType: 'video' | 'book', title: string }) => ReturnType;
    }
  }
}

export const MediaWidgetBlock = Node.create<MediaWidgetOptions>({
  name: 'mediaWidget',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'media-widget',
      },
    }
  },

  addAttributes() {
    return {
      mediaId: {
        default: null,
        parseHTML: element => element.getAttribute('data-media-id'),
        renderHTML: attributes => ({ 'data-media-id': attributes.mediaId }),
      },
      mediaType: {
        default: 'video',
        parseHTML: element => element.getAttribute('data-media-type'),
        renderHTML: attributes => ({ 'data-media-type': attributes.mediaType }),
      },
      title: {
        default: '',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => ({ 'data-title': attributes.title }),
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
        tag: 'span[data-type="media-widget"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'media-widget' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaWidgetNodeView);
  },

  addCommands() {
    return {
      insertMediaWidget: (options) => ({ commands }) => {
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

        if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
          const mediaId = selection.node.attrs.mediaId;
          window.dispatchEvent(new CustomEvent('media-widget-delete-request', { detail: { mediaId } }));
          return true;
        }

        const { $from } = selection;
        if (selection.empty && $from.nodeBefore?.type.name === nodeName) {
          const mediaId = $from.nodeBefore.attrs.mediaId;
          window.dispatchEvent(new CustomEvent('media-widget-delete-request', { detail: { mediaId } }));
          return true;
        }

        return false;
      },
      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;

        if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
          const mediaId = selection.node.attrs.mediaId;
          window.dispatchEvent(new CustomEvent('media-widget-delete-request', { detail: { mediaId } }));
          return true;
        }

        const { $from } = selection;
        if (selection.empty && $from.nodeAfter?.type.name === nodeName) {
          const mediaId = $from.nodeAfter.attrs.mediaId;
          window.dispatchEvent(new CustomEvent('media-widget-delete-request', { detail: { mediaId } }));
          return true;
        }

        return false;
      },
    };
  },
});
