import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ToggleBlockComponent } from './toggle/ToggleBlockComponent';

export const ToggleBlock = Node.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'block+',
  draggable: true,

  addAttributes() {
    return {
      title: { default: '' },
      isOpen: { default: true },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.toggle-block',
        getAttrs: (node) => {
          if (typeof node === 'string') return {};
          const element = node as HTMLElement;
          return {
            isOpen: element.getAttribute('data-is-open') !== 'false',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'toggle-block',
        'data-is-open': HTMLAttributes.isOpen,
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockComponent);
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

export default ToggleBlock;
