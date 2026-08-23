import { Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { LinkPreviewComponent } from './LinkPreviewNodeView';

export const LinkPreviewBlock = Node.create({
  name: 'linkPreview',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          const url = selection.node.attrs.url;
          window.dispatchEvent(new CustomEvent('link-widget-delete-request', { detail: { url } }));
          return true;
        }
        return false;
      },
      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          const url = selection.node.attrs.url;
          window.dispatchEvent(new CustomEvent('link-widget-delete-request', { detail: { url } }));
          return true;
        }
        return false;
      },
    };
  },

  addAttributes() {
    const booleanAttr = (name: string, defaultValue: boolean) => ({
      default: defaultValue,
      parseHTML: (element: HTMLElement) => element.getAttribute(name) === 'true',
      renderHTML: (attributes: Record<string, any>) => ({ [name]: attributes[name] ? 'true' : 'false' }),
    });

    const numberAttr = (name: string, defaultValue: number | null) => ({
      default: defaultValue,
      parseHTML: (element: HTMLElement) => {
        const raw = element.getAttribute(name);
        const parsed = raw === null ? NaN : Number(raw);
        return Number.isFinite(parsed) ? parsed : defaultValue;
      },
      renderHTML: (attributes: Record<string, any>) =>
        attributes[name] == null ? {} : { [name]: String(attributes[name]) },
    });

    return {
      url: { default: '' },
      title: { default: null },
      channel: { default: null },
      uploadDate: { default: null },
      notes: { default: '' },
      duration: numberAttr('duration', null),
      width: numberAttr('width', 50),
      isLoading: booleanAttr('isLoading', true),
      isPlaylist: booleanAttr('isPlaylist', false),
      showNotes: booleanAttr('showNotes', false),
      watched: booleanAttr('watched', false),
    };
  },

  parseHTML() {
    return [{ tag: 'div.link-preview-block' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'link-preview-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkPreviewComponent, {
      attrs: ({ node }) => ({
        'data-group-child': '',
        style: `--group-flex: ${Number(node.attrs.width) || 50};`,
      }),
    });
  },
});
