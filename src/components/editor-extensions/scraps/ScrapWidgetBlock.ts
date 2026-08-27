import { Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ScrapWidgetNodeView } from './ScrapWidgetNodeView';

export interface ScrapWidgetAttributes {
  id: string;
  url: string;
  title: string | null;
  favicon: string | null;
  drive_file_id: string | null;
  local_path: string | null;
  file_size: number | null;
  status: 'capturing' | 'ready' | 'sync_pending' | 'error';
  error_reason?: string | null;
  created_at: string;
}

export const ScrapWidgetBlock = Node.create({
  name: 'scrapWidget',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          editor.commands.deleteSelection();
          return true;
        }
        return false;
      },
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          editor.commands.deleteSelection();
          return true;
        }
        return false;
      },
    };
  },

  addAttributes() {
    return {
      id: { default: '' },
      url: { default: '' },
      title: { default: null },
      favicon: { default: null },
      drive_file_id: { default: null },
      local_path: { default: null },
      file_size: { default: null },
      status: { default: 'capturing' },
      error_reason: { default: null },
      created_at: { default: () => new Date().toISOString() },
    };
  },

  parseHTML() {
    return [{ tag: 'div.scrap-widget-block' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'scrap-widget-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ScrapWidgetNodeView);
  },
});
