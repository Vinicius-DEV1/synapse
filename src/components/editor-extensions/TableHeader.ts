import { TableHeader as BaseTableHeader } from '@tiptap/extension-table-header';

export const TableHeader = BaseTableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-bg-color'),
        renderHTML: (attributes) => {
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
