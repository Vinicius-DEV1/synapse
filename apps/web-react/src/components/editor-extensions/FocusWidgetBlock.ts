import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import FocusWidgetNodeView from './FocusWidgetNodeView';

export interface FocusWidgetOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    focusWidget: {
      insertFocusWidget: (options: { sessionId: string, duration: number, tag: string, description: string }) => ReturnType;
    }
  }
}

export const FocusWidgetBlock = Node.create<FocusWidgetOptions>({
  name: 'focusWidget',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'focus-widget',
      },
    }
  },

  addAttributes() {
    return {
      sessionId: {
        default: null,
        parseHTML: element => element.getAttribute('data-session-id'),
        renderHTML: attributes => ({ 'data-session-id': attributes.sessionId }),
      },
      duration: {
        default: 0,
        parseHTML: element => Number(element.getAttribute('data-duration') || 0),
        renderHTML: attributes => ({ 'data-duration': attributes.duration }),
      },
      tag: {
        default: '',
        parseHTML: element => element.getAttribute('data-tag'),
        renderHTML: attributes => ({ 'data-tag': attributes.tag }),
      },
      description: {
        default: '',
        parseHTML: element => element.getAttribute('data-description'),
        renderHTML: attributes => ({ 'data-description': attributes.description }),
      },
      status: {
        default: 'running', // 'running', 'completed', 'cancelled'
        parseHTML: element => element.getAttribute('data-status') || 'running',
        renderHTML: attributes => ({ 'data-status': attributes.status }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="focus-widget"]',
      },
      {
        tag: 'span.focus-widget',
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'focus-widget' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FocusWidgetNodeView)
  },

  addCommands() {
    return {
      insertFocusWidget: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            sessionId: options.sessionId,
            duration: options.duration,
            tag: options.tag,
            description: options.description,
            status: 'running'
          },
        });
      },
    }
  },
});
