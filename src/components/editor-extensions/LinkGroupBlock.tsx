import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { LayoutGrid, Ungroup } from 'lucide-react';

const LinkGroupBlockComponent = () => {
  return (
    <NodeViewWrapper className="link-group-block my-3 block group/linkgroup">
      <NodeViewContent className="flex flex-row flex-wrap items-stretch gap-3 w-full" />
    </NodeViewWrapper>
  );
};

export const LinkGroupBlock = Node.create({
  name: 'linkGroup',
  group: 'block',
  content: 'linkPreview+',
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      {
        tag: 'div.link-group-block',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'link-group-block' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkGroupBlockComponent);
  },
});
