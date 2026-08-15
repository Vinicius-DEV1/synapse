import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { GripVertical, Plus, X } from 'lucide-react';
import React from 'react';

export default function CodeBlockComponent(props: any) {
  const { node, updateAttributes, extension, editor, getPos, deleteNode } = props;
  const defaultLanguage = node.attrs.language;

  return (
    <NodeViewWrapper className="code-block-wrapper relative group/code">
      <div className="absolute -left-12 top-1 opacity-0 group-hover/code:opacity-100 flex items-center z-10 bg-dark-bg/50 backdrop-blur-sm rounded-md border border-white/5 shadow-sm">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof getPos === 'function') {
              const pos = getPos();
              editor.chain().focus().insertContentAt(pos + node.nodeSize, { type: 'paragraph' }).run();
            }
          }}
          className="cursor-pointer hover:bg-white/10 p-1 rounded-l text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
          title="Adicionar linha abaixo"
        >
          <Plus size={16} />
        </button>
        <div 
          data-drag-handle
          onMouseDown={() => {
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                editor.commands.setNodeSelection(pos);
              }
            }
          }}
          className="cursor-grab hover:bg-white/10 p-1 rounded-r text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
          title="Arrastar bloco"
        >
          <GripVertical size={16} />
        </div>
      </div>
      
      <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10 flex items-center gap-1" contentEditable={false}>
        <select
          defaultValue={defaultLanguage || 'null'}
          onChange={(event) => updateAttributes({ language: event.target.value })}
          className="bg-dark-bg/90 text-dark-text text-xs border border-white/20 rounded px-2 py-1 outline-none cursor-pointer"
        >
          <option className="bg-dark-bg text-white" value="null">Auto</option>
          <option className="bg-dark-bg text-white" disabled>—</option>
          {extension.options.lowlight.listLanguages().sort().map((lang: string, index: number) => (
            <option className="bg-dark-bg text-white" key={index} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteNode();
          }}
          className="bg-dark-bg/90 text-dark-subtext hover:text-red-400 hover:bg-red-500/10 border border-white/20 rounded p-1 cursor-pointer transition-colors flex items-center justify-center"
          title="Excluir código"
        >
          <X size={14} />
        </button>
      </div>

      <pre className="hljs" spellCheck={false}>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
