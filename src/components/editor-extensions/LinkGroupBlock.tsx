import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { LayoutGrid, Ungroup } from 'lucide-react';

import { useEffect, useRef } from 'react';

const LinkGroupBlockComponent = (props: any) => {
  const groupId = `link-group-${props.node?.attrs?.id || Math.random().toString(36).substring(7)}`;

  useEffect(() => {
    const el = document.getElementById(groupId);
    if (el) {
      console.log(`[DEBUG] LinkGroupBlock (${groupId}) rendered!`, el);
      console.log(`[DEBUG] LinkGroupBlock children:`, el.children);
      
      const contentWrapper = el.querySelector('[data-node-view-content]');
      if (contentWrapper) {
        console.log(`[DEBUG] NodeViewContent found:`, contentWrapper);
        console.log(`[DEBUG] NodeViewContent display:`, window.getComputedStyle(contentWrapper).display);
        console.log(`[DEBUG] NodeViewContent children (widgets):`, contentWrapper.children);
      }
    }
  }, [groupId]);

  return (
    <NodeViewWrapper 
      id={groupId}
      className="link-group-block my-3 group/linkgroup border border-red-500/20"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}
    >
      <NodeViewContent className="w-full" style={{ display: 'contents' }} />
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
