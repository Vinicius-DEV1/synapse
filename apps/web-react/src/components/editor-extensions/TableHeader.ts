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
      /** Column data type: text | number | date | select | checkbox */
      columnType: {
        default: 'text',
        parseHTML: (element) => element.getAttribute('data-column-type') || 'text',
        renderHTML: (attributes) => {
          if (!attributes.columnType || attributes.columnType === 'text') {
            return {};
          }
          return { 'data-column-type': attributes.columnType };
        },
      },
      /** JSON-encoded string[] of select options (only for 'select' columns) */
      columnOptions: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-column-options'),
        renderHTML: (attributes) => {
          if (!attributes.columnOptions) {
            return {};
          }
          return { 'data-column-options': attributes.columnOptions };
        },
      },
      /** Number format: 'plain' | 'currency' | 'percent' (only for 'number' columns) */
      numberFormat: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-number-format'),
        renderHTML: (attributes) => {
          if (!attributes.numberFormat) {
            return {};
          }
          return { 'data-number-format': attributes.numberFormat };
        },
      },
      /** Date format: 'iso' | 'short' | 'long' (only for 'date' columns) */
      dateFormat: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-date-format'),
        renderHTML: (attributes) => {
          if (!attributes.dateFormat) {
            return {};
          }
          return { 'data-date-format': attributes.dateFormat };
        },
      },
    };
  },
});
