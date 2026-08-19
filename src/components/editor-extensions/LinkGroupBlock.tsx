import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import GroupShell from './group-layout/GroupShell';
import { LINK_GROUP_SPEC } from './group-layout/groupSpecs';

/** Cards de link lado a lado — mesmo mecanismo das colunas, via `group-layout`. */
const LinkGroupNodeView = (props: any) => (
  <GroupShell
    spec={LINK_GROUP_SPEC}
    node={props.node}
    editor={props.editor}
    getPos={props.getPos}
    className="link-group-block"
  />
);

export const LinkGroupBlock = Node.create({
  name: 'linkGroup',

  group: 'block',
  content: 'linkPreview{1,4}',
  isolating: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="linkGroup"]' }, { tag: 'div.link-group-block' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'linkGroup', class: 'group-layout link-group-block' }),
      ['div', { class: 'group-layout__content' }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkGroupNodeView);
  },
});
