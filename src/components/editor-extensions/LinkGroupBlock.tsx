import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { LayoutGrid, Ungroup } from 'lucide-react';

const LinkGroupBlockComponent = (props: any) => {
  const handleUngroupAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof props.getPos === 'function' && props.editor) {
      const pos = props.getPos();
      const node = props.node;
      const tr = props.editor.state.tr;

      const childrenJSON: any[] = [];
      node.forEach((childNode: any) => {
        childrenJSON.push(childNode.toJSON());
      });

      if (childrenJSON.length > 0) {
        const newNodes = childrenJSON.map((c) => props.editor.schema.nodeFromJSON(c));
        tr.replaceWith(pos, pos + node.nodeSize, newNodes);
      } else {
        tr.delete(pos, pos + node.nodeSize);
      }
      props.editor.view.dispatch(tr);
    }
  };

  return (
    <NodeViewWrapper className="link-group-block my-4 block group/linkgroup">
      <div className="relative border border-white/10 bg-dark-bg/60 rounded-2xl p-3 shadow-md transition-all hover:border-white/20">
        {/* Header do Grupo */}
        <div 
          className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/5 text-xs text-dark-subtext select-none" 
          contentEditable={false}
        >
          <div className="flex items-center gap-1.5 font-medium text-brand-300">
            <LayoutGrid size={14} className="text-brand-400 shrink-0" />
            <span>Grupo de Links</span>
            <span className="text-[10px] text-dark-subtext bg-white/5 px-1.5 py-0.2 rounded-full border border-white/5 ml-1">
              {props.node.childCount} {props.node.childCount === 1 ? 'link' : 'links'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUngroupAll}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white transition-colors border border-white/5"
              title="Desagrupar todos os links deste grupo"
            >
              <Ungroup size={12} />
              <span>Desagrupar</span>
            </button>
          </div>
        </div>

        {/* Conteúdo em Grelha Responsiva (2 Colunas no Desktop) */}
        <NodeViewContent className="grid grid-cols-1 sm:grid-cols-2 gap-3" />
      </div>
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
