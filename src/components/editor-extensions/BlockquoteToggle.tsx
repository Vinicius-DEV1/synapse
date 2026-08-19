import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronDown, ChevronRight, GripVertical, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { DOMSerializer } from 'prosemirror-model';
import BlockquoteToggleToolbar from './BlockquoteToggleToolbar';
import { selectNodeForDrag } from './group-layout/DragToGroup';

const BlockquoteToggleComponent = (props: any) => {
  const isOpen = props.node.attrs.isOpen;
  const [showColors, setShowColors] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as globalThis.Node)) {
        setShowColors(false);
      }
      if (confirmRef.current && !confirmRef.current.contains(e.target as globalThis.Node)) {
        setShowConfirm(false);
      }
    };

    if (showColors || showConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColors, showConfirm]);

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

  const handleSetColor = (colorHex: string) => {
    props.updateAttributes({ color: colorHex });
    setShowColors(false);
  };

  const handleClearColor = () => {
    props.updateAttributes({ color: 'default' });
    setShowColors(false);
  };

  const handleConvertToCallout = () => {
    const { editor, node, getPos } = props;
    const currentColor = node.attrs.color || 'default';
    const pos = getPos();
    const content = node.content.toJSON();

    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .insertContentAt(pos, {
        type: 'blockquote',
        attrs: { color: currentColor },
        content,
      })
      .run();
  };

  const handleCopy = () => {
    const { node, editor, getPos } = props;
    try {
      const serializer = DOMSerializer.fromSchema(editor.schema);
      const inner = serializer.serializeNode(node);
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-pm-slice', '0 0 []');
      wrapper.appendChild(inner);
      const html = wrapper.outerHTML;

      const doToast = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      };

      navigator.clipboard
        .write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([node.textContent || ''], { type: 'text/plain' }),
          }),
        ])
        .then(doToast)
        .catch(() => {
          editor.chain().setNodeSelection(getPos()).run();
          document.execCommand('copy');
          doToast();
        });
    } catch (e) {
      console.error('Falha ao copiar destaque:', e);
    }
  };

  const currentColor = props.node.attrs.color || 'default';
  const customStyle =
    currentColor !== 'default'
      ? { backgroundColor: `${currentColor}15`, borderLeftColor: currentColor }
      : {};

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
    <NodeViewWrapper
      className="toggle-wrapper blockquote-toggle block border-l-[3px] border-white/20 bg-white/5 px-4 py-3 my-4 rounded relative group/blockquote"
      style={customStyle}
      data-color={currentColor}
    >
      <div className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/blockquote:opacity-100 flex items-center z-10 bg-dark-bg/50 backdrop-blur-sm rounded-md border border-white/5 shadow-sm">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof props.getPos === 'function') {
              const pos = props.getPos();
              props.editor
                .chain()
                .focus()
                .insertContentAt(pos + props.node.nodeSize, { type: 'paragraph' })
                .run();
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
          title="Arrastar destaque"
        >
          <GripVertical size={16} />
        </div>
      </div>

      <BlockquoteToggleToolbar
        currentColor={currentColor}
        copied={copied}
        showColors={showColors}
        showConfirm={showConfirm}
        colorMenuRef={colorMenuRef}
        confirmRef={confirmRef}
        onConvertToCallout={handleConvertToCallout}
        onCopy={handleCopy}
        onToggleColors={() => {
          setShowConfirm(false);
          setShowColors(!showColors);
        }}
        onSelectColor={handleSetColor}
        onClearColor={handleClearColor}
        onToggleConfirm={() => {
          setShowColors(false);
          setShowConfirm(!showConfirm);
        }}
        onDeleteNode={() => props.deleteNode()}
        onCancelDelete={() => setShowConfirm(false)}
      />

      <div
        className="flex items-center gap-1 cursor-pointer outline-none font-medium italic text-white/85 pr-16"
        contentEditable={false}
      >
        <button
          onClick={() => props.updateAttributes({ isOpen: !isOpen })}
          className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white/90"
        >
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <input
          ref={titleInputRef}
          type="text"
          value={props.node.attrs.title}
          onChange={handleTitleChange}
          onKeyDown={handleKeyDown}
          placeholder="Título do destaque..."
          className="bg-transparent outline-none flex-1 text-white/90 placeholder-white/40 italic"
        />
      </div>

      <div className={isOpen ? 'block' : 'hidden'}>
        <div className="h-px bg-white/5 my-2 ml-7 mr-2" />
        <div className="toggle-content pl-7 text-white/85 italic">
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const BlockquoteToggle = Node.create({
  name: 'blockquoteToggle',
  group: 'block',
  content: 'block+',
  draggable: true,

  addAttributes() {
    return {
      title: { default: '' },
      color: { default: 'default' },
      isOpen: { default: true },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.blockquote-toggle',
        getAttrs: (node) => {
          if (typeof node === 'string') return {};
          const element = node as HTMLElement;
          return {
            isOpen: element.getAttribute('data-is-open') !== 'false',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'blockquote-toggle',
        'data-is-open': HTMLAttributes.isOpen,
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockquoteToggleComponent);
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
      },
    };
  },
});
