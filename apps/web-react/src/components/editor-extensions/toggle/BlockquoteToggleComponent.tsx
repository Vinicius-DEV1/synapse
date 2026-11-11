import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { ChevronDown, ChevronRight, GripVertical, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { DOMSerializer } from 'prosemirror-model';
import BlockquoteToggleToolbar from '../BlockquoteToggleToolbar';
import { selectNodeForDrag } from '../group-layout/DragToGroup';
import { moveBlockUp, moveBlockDown } from '../moveBlockCommands';
import { convertToggleNodeToPage } from './togglePageConverter';
import { useBlockAiModal } from '../hooks/useBlockAiModal';
import AiPromptModal from '../../modals/AiPromptModal';

export const BlockquoteToggleComponent = (props: NodeViewProps) => {
  const isEditable = props.editor?.isEditable ?? true;
  const [localIsOpen, setLocalIsOpen] = useState<boolean>(props.node.attrs.isOpen ?? true);
  const [showColors, setShowColors] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.node.attrs.isOpen !== undefined) {
      setLocalIsOpen(props.node.attrs.isOpen);
    }
  }, [props.node.attrs.isOpen]);

  const toggleOpen = () => {
    const next = !localIsOpen;
    setLocalIsOpen(next);
    if (isEditable) {
      props.updateAttributes({ isOpen: next });
    }
  };

  const aiModal = useBlockAiModal({
    editor: props.editor,
    node: props.node,
    getPos: props.getPos,
    updateAttributes: props.updateAttributes,
    blockType: 'blockquoteToggle',
  });

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
    if (typeof pos !== 'number') return;
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

  const handleConvertToPage = async () => {
    await convertToggleNodeToPage(props.editor, props.node, props.getPos);
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
          const currentPos = getPos();
          if (typeof currentPos === 'number') {
            editor.chain().setNodeSelection(currentPos).run();
          }
          document.execCommand('copy');
          doToast();
        });
    } catch (e) {
      console.error('Falha ao copiar destaque:', e);
    }
  };

  const currentColor = props.node.attrs.color || 'default';
  const customStyle = (() => {
    if (!currentColor || currentColor === 'default') return {};
    if (currentColor.startsWith('#')) {
      return {
        backgroundColor: `${currentColor}18`,
        borderLeftColor: currentColor,
      };
    }
    return {
      backgroundColor: currentColor,
      borderLeftColor: currentColor,
    };
  })();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && localIsOpen) {
      e.preventDefault();
      if (typeof props.getPos === 'function') {
        const pos = props.getPos();
        if (typeof pos === 'number') {
          const firstChild = props.node.firstChild;
          if (firstChild) {
            if (firstChild.isTextblock) {
              props.editor.commands.focus(pos + 2);
            } else {
              props.editor.commands.setNodeSelection(pos + 1);
            }
          }
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (typeof props.getPos === 'function') {
        const pos = props.getPos();
        if (typeof pos === 'number') {
          props.editor.commands.focus(Math.max(0, pos - 1));
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (typeof props.getPos === 'function') {
        const pos = props.getPos();
        if (typeof pos === 'number') {
          props.editor
            .chain()
            .focus()
            .insertContentAt(pos + props.node.nodeSize, { type: 'paragraph' })
            .run();
        }
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
      {isEditable && (
        <div
          contentEditable={false}
          className="absolute -left-7 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5 rounded-md border border-white/10 bg-dark-bg/90 p-0.5 text-dark-subtext opacity-0 shadow-lg backdrop-blur-xl transition-all group-hover/blockquote:opacity-100"
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (typeof props.getPos === 'function' && props.editor) {
                const pos = props.getPos();
                if (typeof pos === 'number') moveBlockUp(props.editor.view, pos);
              }
            }}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Subir destaque (Mover para cima)"
          >
            <ArrowUp size={11} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (typeof props.getPos === 'function') {
                const pos = props.getPos();
                if (typeof pos === 'number') {
                  props.editor
                    .chain()
                    .focus()
                    .insertContentAt(pos + props.node.nodeSize, { type: 'paragraph' })
                    .run();
                }
              }
            }}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Adicionar linha abaixo (+)"
          >
            <Plus size={11} />
          </button>
          <div
            data-drag-handle
            onMouseDown={handleDragHandleMouseDown}
            className="p-0.5 cursor-grab active:cursor-grabbing hover:text-white transition-colors"
            title="Arrastar destaque"
          >
            <GripVertical size={13} />
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (typeof props.getPos === 'function' && props.editor) {
                const pos = props.getPos();
                if (typeof pos === 'number') moveBlockDown(props.editor.view, pos);
              }
            }}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Descer destaque (Mover para baixo)"
          >
            <ArrowDown size={11} />
          </button>
        </div>
      )}

      {isEditable && (
        <BlockquoteToggleToolbar
          currentColor={currentColor}
          copied={copied}
          showColors={showColors}
          showConfirm={showConfirm}
          colorMenuRef={colorMenuRef}
          confirmRef={confirmRef}
          onConvertToCallout={handleConvertToCallout}
          onConvertToPage={handleConvertToPage}
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
          onAiClick={aiModal.handleOpenAi}
          aiButtonRef={aiModal.aiButtonRef}
        />
      )}

      {isEditable && aiModal.isOpen && aiModal.anchorPos && (
        <AiPromptModal
          x={aiModal.anchorPos.x}
          y={aiModal.anchorPos.y}
          chatId={aiModal.chatId}
          messages={aiModal.messages}
          contextText={aiModal.contextText}
          systemInstruction={aiModal.systemInstruction}
          originalContent={aiModal.originalContent}
          blockBadge={aiModal.blockBadge}
          blockTitle={aiModal.blockTitle}
          targetType={aiModal.targetType}
          onMessageAdd={aiModal.handleMessageAdd}
          onClear={aiModal.handleClearChat}
          onClose={aiModal.handleCloseAi}
          onApplyReplacement={aiModal.handleApplyReplacement}
          onInsertContent={aiModal.handleInsertContent}
          anchorRef={aiModal.aiButtonRef}
        />
      )}

      <div
        className="flex items-center gap-1 cursor-pointer outline-none font-medium italic text-white/85 pr-4 select-none"
        contentEditable={false}
        onClick={toggleOpen}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleOpen();
          }}
          className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white/90"
        >
          {localIsOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        {isEditable ? (
          <input
            ref={titleInputRef}
            type="text"
            value={props.node.attrs.title}
            onClick={(e) => e.stopPropagation()}
            onChange={handleTitleChange}
            onKeyDown={handleKeyDown}
            placeholder="Título do destaque..."
            className="bg-transparent outline-none flex-1 text-white/90 placeholder-white/40 italic"
          />
        ) : (
          <span className="flex-1 text-white/90 italic font-medium">
            {props.node.attrs.title || 'Destaque'}
          </span>
        )}
      </div>

      <div className={localIsOpen ? 'block' : 'hidden'}>
        <div className="h-px bg-white/5 my-2 ml-7 mr-2" />
        <div className="toggle-content pl-7 text-white/85 italic">
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
};
