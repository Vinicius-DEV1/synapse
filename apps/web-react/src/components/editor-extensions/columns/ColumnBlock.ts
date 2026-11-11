import { Node, mergeAttributes } from '@tiptap/core';

export const ColumnBlock = Node.create({
  name: 'columnBlock',

  group: 'column',
  content: 'block+',
  // Without this, Backspace at start of column merges content across boundary and breaks layout.
  isolating: true,

  addAttributes() {
    return {
      width: {
        default: 50,
        parseHTML: (element) => {
          const width = element.getAttribute('data-width');
          const parsed = width ? parseFloat(width) : 50;
          return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
        },
        renderHTML: (attributes) => {
          const width = Number(attributes.width) || 50;
          return {
            'data-width': width,
            // `--group-flex` feeds shared styling rules in `group-layout`.
            style: `--group-flex: ${width};`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columnBlock"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'columnBlock',
        // Common marker for all group children (columns and link cards).
        'data-group-child': '',
        class: 'column-block',
      }),
      0,
    ];
  },
});
