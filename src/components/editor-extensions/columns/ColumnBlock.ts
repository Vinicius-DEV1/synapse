import { Node, mergeAttributes } from '@tiptap/core';

export const ColumnBlock = Node.create({
  name: 'columnBlock',

  group: 'column',
  content: 'block+',
  // Era `isolates: true` — propriedade inexistente no ProseMirror, então não
  // fazia nada e o Backspace no início de uma coluna juntava conteúdo através
  // da fronteira, destruindo o layout.
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
            // `--group-flex` alimenta a regra compartilhada em `group-layout`.
            // Com `width: X%` + `gap`, a soma passava de 100% e a última coluna
            // transbordava do editor.
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
        // Marcador comum a todos os filhos de grupo (colunas e cards de link).
        'data-group-child': '',
        class: 'column-block',
      }),
      0,
    ];
  },
});
