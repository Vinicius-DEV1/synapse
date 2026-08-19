import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronDown, ChevronRight, GripVertical, Plus } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { selectNodeForDrag } from './group-layout/DragToGroup';

const ToggleBlockComponent = (props: any) => {
  const isOpen = props.node.attrs.isOpen;
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.node.attrs.title === '' && titleInputRef.current) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.updateAttributes({ title: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      if (typeof props.getPos === 'function') {
        const pos = props.getPos();
        const firstChild = props.node.firstChild;
        if (firstChild) {
          if (firstChild.isTextblock) {
            props.editor.commands.focus(pos + 2);
          } else {
            props.editor.commands.setNodeSelection(pos + 1);
          }
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (typeof props.getPos === 'function') {
        props.editor.commands.focus(Math.max(0, props.getPos() - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (typeof props.getPos === 'function') {
        const pos = props.getPos();
        props.editor
          .chain()
          .focus()
          .insertContentAt(pos + props.node.nodeSize, { type: 'paragraph' })
          .run();
      }
    }
  };

  const handleDragHandleMouseDown = () => {
    if (typeof props.getPos === 'function' && props.editor?.view) {
      const pos = props.getPos();
      if (typeof pos === 'number') {
        selectNodeForDrag(props.editor.view, pos, props.node);
      }
    }
  };

  return (
    <NodeViewWrapper className="toggle-wrapper toggle-block my-1 marker:text-dark-subtext block relative group/toggle">
      <div className="absolute -left-12 top-1 opacity-0 group-hover/toggle:opacity-100 flex items-center z-10 bg-dark-bg/50 backdrop-blur-sm rounded-md border border-white/5 shadow-sm">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof props.getPos === 'function') {
              const pos = props.getPos();
              props.editor.chain().focus().insertContentAt(pos + props.node.nodeSize, { type: 'paragraph' }).run();
            }
          }}
          className="cursor-pointer hover:bg-white/10 p-1 rounded-l text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
          title="Adicionar linha abaixo"
        >
          <Plus size={16} />
        </button>
        <div 
          data-drag-handle
          onMouseDown={handleDragHandleMouseDown}
          className="cursor-grab hover:bg-white/10 p-1 rounded-r text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
          title="Arrastar toggle"
        >
          <GripVertical size={16} />
        </div>
      </div>

      <div 
        className="flex items-center gap-1 cursor-pointer outline-none font-medium"
        contentEditable={false}
      >
        <button 
          onClick={() => props.updateAttributes({ isOpen: !isOpen })}
          className="p-1 hover:bg-white/10 rounded transition-colors text-dark-subtext"
        >
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <input 
          ref={titleInputRef} 
          type="text"
          value={props.node.attrs.title}
          onChange={handleTitleChange}
          onKeyDown={handleKeyDown}
          placeholder="Tópico..."
          className="bg-transparent outline-none flex-1 text-dark-text placeholder-white/30"
        />
      </div>
      
      <div className={isOpen ? 'block' : 'hidden'}>
        <div className="h-px bg-white/5 my-1 ml-7 mr-2"></div>
        <div className="toggle-content pl-6 text-dark-subtext border-l-2 border-white/5 ml-2">
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const ToggleBlock = Node.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'block+',
  draggable: true,

  addAttributes() {
    return {
      title: { default: '' },
      isOpen: { default: true },
    };
  },

  parseHTML() {
    return [{ 
      tag: 'div.toggle-block',
      getAttrs: (node) => {
        if (typeof node === 'string') return {};
        const element = node as HTMLElement;
        return {
          isOpen: element.getAttribute('data-is-open') !== 'false'
        };
      }
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 
      class: 'toggle-block',
      'data-is-open': HTMLAttributes.isOpen
    }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockComponent);
  },

  addKeyboardShortcuts() {
    return {
      ArrowUp: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $head, empty } = selection;

        if (!empty) return false;

        for (let depth = $head.depth; depth > 0; depth--) {
          const node = $head.node(depth);
          if (node.type.name === this.name) {
            let isAtStart = true;
            for (let d = $head.depth; d > depth; d--) {
              if ($head.index(d - 1) !== 0) {
                isAtStart = false;
                break;
              }
            }
            if (isAtStart && $head.parentOffset === 0) {
              const togglePos = $head.before(depth);
              const domNode = editor.view.nodeDOM(togglePos) as HTMLElement;
              if (domNode) {
                const input = domNode.querySelector('input');
                if (input) {
                  input.focus();
                  setTimeout(() => {
                    input.setSelectionRange(input.value.length, input.value.length);
                  }, 0);
                  return true;
                }
              }
            }
            break;
          }
        }
        return false;
      }
    };
  }
});
