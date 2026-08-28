import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { BlockquoteToggleComponent } from './toggle/BlockquoteToggleComponent';

export const BlockquoteToggle = Node.create({
  name: 'blockquoteToggle',
  group: 'block',
  content: 'block+',
  draggable: true,

  addAttributes() {
    return {
      title: { 
        default: '',
        parseHTML: (element) => element.getAttribute('data-title') || '',
        renderHTML: (attributes) => ({ 'data-title': attributes.title || '' }),
      },
      color: {
        default: 'default',
        parseHTML: (element) => element.getAttribute('data-color') || 'default',
        renderHTML: (attributes) => ({ 'data-color': attributes.color || 'default' }),
      },
      isOpen: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-is-open') !== 'false',
        renderHTML: (attributes) => ({ 'data-is-open': String(attributes.isOpen) }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.blockquote-toggle',
        getAttrs: (node) => {
          if (typeof node === 'string') return {};
          const element = node as HTMLElement;
          return {
            title: element.getAttribute('data-title') || '',
            isOpen: element.getAttribute('data-is-open') !== 'false',
            color: element.getAttribute('data-color') || 'default',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'blockquote-toggle',
        'data-title': HTMLAttributes.title || '',
        'data-is-open': HTMLAttributes.isOpen,
        'data-color': HTMLAttributes.color || 'default',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockquoteToggleComponent);
  },

  addKeyboardShortcuts() {
    return {
      ArrowUp: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $head, empty } = selection;

        if (!empty) return false;

        for (let depth = $head.depth; depth > 0; depth--) {
          const node = $head.node(depth);
          if (node.type.name === this.name) {
            let isAtStart = true;
            for (let d = $head.depth; d > depth; d--) {
              if ($head.index(d - 1) !== 0) {
                isAtStart = false;
                break;
              }
            }
            if (isAtStart && $head.parentOffset === 0) {
              const togglePos = $head.before(depth);
              const domNode = editor.view.nodeDOM(togglePos) as HTMLElement;
              if (domNode) {
                const input = domNode.querySelector('input');
                if (input) {
                  input.focus();
                  setTimeout(() => {
                    input.setSelectionRange(input.value.length, input.value.length);
                  }, 0);
                  return true;
                }
              }
            }
            break;
          }
        }
        return false;
      },
    };
  },
});

export default BlockquoteToggle;
