import { TableCell as BaseTableCell } from '@tiptap/extension-table-cell';

export const TableCell = BaseTableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-bg-color'),
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            'data-bg-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor} !important;`,
          };
        },
      },
    };
  },
});
