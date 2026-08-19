import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { GripVertical, Plus, X, ArrowUp, ArrowDown } from 'lucide-react';
import { selectNodeForDrag } from './group-layout/DragToGroup';
import { moveBlockUp, moveBlockDown } from './moveBlockCommands';

export default function CodeBlockComponent(props: any) {
  const { node, updateAttributes, extension, editor, getPos, deleteNode } = props;
  const defaultLanguage = node.attrs.language;

  const handleDragMouseDown = () => {
    if (typeof getPos === 'function' && editor?.view) {
      const pos = getPos();
      if (typeof pos === 'number') {
        selectNodeForDrag(editor.view, pos, node);
      }
    }
  };

  return (
    <NodeViewWrapper className="code-block-wrapper relative group/code">
      <div
        contentEditable={false}
        className="absolute -left-7 top-1 z-20 flex flex-col items-center gap-0.5 rounded-md border border-white/10 bg-dark-bg/90 p-0.5 text-dark-subtext opacity-0 shadow-lg backdrop-blur-xl transition-all group-hover/code:opacity-100"
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof getPos === 'function' && editor) {
              const pos = getPos();
              if (typeof pos === 'number') moveBlockUp(editor.view, pos);
            }
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Subir bloco de código (Mover para cima)"
        >
          <ArrowUp size={11} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof getPos === 'function') {
              const pos = getPos();
              editor.chain().focus().insertContentAt(pos + node.nodeSize, { type: 'paragraph' }).run();
            }
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Adicionar linha abaixo (+)"
        >
          <Plus size={11} />
        </button>
        <div 
          data-drag-handle
          onMouseDown={handleDragMouseDown}
          className="p-0.5 cursor-grab active:cursor-grabbing hover:text-white transition-colors"
          title="Arrastar bloco de código"
        >
          <GripVertical size={13} />
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof getPos === 'function' && editor) {
              const pos = getPos();
              if (typeof pos === 'number') moveBlockDown(editor.view, pos);
            }
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Descer bloco de código (Mover para baixo)"
        >
          <ArrowDown size={11} />
        </button>
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
        <NodeViewContent<'code'> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
