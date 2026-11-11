import Blockquote from '@tiptap/extension-blockquote';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ColorBlockquoteComponent from './ColorBlockquoteComponent';

export const ColorBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      color: {
        default: 'default',
        parseHTML: element => element.getAttribute('data-color') || 'default',
        renderHTML: attributes => {
          if (attributes.color === 'default' || !attributes.color) {
            return {};
          }
          return {
            'data-color': attributes.color,
            style: `background-color: ${attributes.color}15 !important; border-left-color: ${attributes.color} !important;`
          };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColorBlockquoteComponent);
  },
});
