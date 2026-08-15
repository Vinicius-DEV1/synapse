import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import GroupShell from './group-layout/GroupShell';
import { LINK_GROUP_SPEC } from './group-layout/groupSpecs';

/**
 * Cards de link lado a lado.
 *
 * A versão anterior era um esboço que nunca funcionou: aplicava `display: grid`
 * no wrapper e `display: flex` no elemento do `NodeViewContent`, mas o Tiptap
 * injeta um <div> entre esse elemento e os filhos reais — o grid/flex acabava
 * com um único item e os cards empilhavam em largura total (medido: y=77 e
 * y=127, ambos com 589px). Sobravam ainda uma borda vermelha de debug, quatro
 * `console.log` por render e um `Math.random()` como id.
 *
 * Agora é o mesmo mecanismo das colunas, via `group-layout`.
 */
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
  // `linkPreview+` permitia grupo de um card só, deixando cards órfãos dentro
  // de um container invisível.
  content: 'linkPreview{2,4}',
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
