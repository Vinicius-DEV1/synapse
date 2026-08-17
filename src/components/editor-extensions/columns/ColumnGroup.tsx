import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import GroupShell from '../group-layout/GroupShell';
import { COLUMN_GROUP_SPEC } from '../group-layout/groupSpecs';

const ColumnGroupNodeView = (props: any) => (
  <GroupShell
    spec={COLUMN_GROUP_SPEC}
    node={props.node}
    editor={props.editor}
    getPos={props.getPos}
    className="column-group"
  />
);

export const ColumnGroup = Node.create({
  name: 'columnGroup',

  group: 'block',
  content: 'columnBlock{1,5}',
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="columnGroup"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // A estrutura em dois níveis espelha o que o node view produz, para que o
    // HTML salvo continue renderizando lado a lado fora do editor.
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'columnGroup', class: 'group-layout column-group' }),
      ['div', { class: 'group-layout__content' }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnGroupNodeView);
  },
});
