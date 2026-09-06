import React, { useRef, useEffect, useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronDown, ChevronRight, GripVertical, Plus, ArrowUp, ArrowDown, FileText, Copy, Trash2, Sparkles } from 'lucide-react';
import { DOMSerializer } from 'prosemirror-model';
import { selectNodeForDrag } from '../group-layout/DragToGroup';
import { moveBlockUp, moveBlockDown } from '../moveBlockCommands';
import { convertToggleNodeToPage } from './togglePageConverter';
import { useBlockAiModal } from '../hooks/useBlockAiModal';
import AiPromptModal from '../../modals/AiPromptModal';

export const ToggleBlockComponent = (props: any) => {
  const isOpen = props.node.attrs.isOpen;
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const aiModal = useBlockAiModal({
    editor: props.editor,
    node: props.node,
    getPos: props.getPos,
    updateAttributes: props.updateAttributes,
    blockType: 'toggleBlock',
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (confirmRef.current && !confirmRef.current.contains(e.target as globalThis.Node)) {
        setShowConfirm(false);
      }
    };

    if (showConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConfirm]);

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
          editor.chain().setNodeSelection(getPos()).run();
          document.execCommand('copy');
          doToast();
        });
    } catch (e) {
      console.error('Falha ao copiar toggle:', e);
    }
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
      {/* Alça e controles de movimentação discretos — verticais, fora do conteúdo */}
      <div
        contentEditable={false}
        className="absolute -left-7 top-0.5 z-20 flex flex-col items-center gap-0.5 rounded-md border border-white/10 bg-dark-bg/90 p-0.5 text-dark-subtext opacity-0 shadow-lg backdrop-blur-xl transition-all group-hover/toggle:opacity-100"
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
          title="Subir toggle (Mover para cima)"
        >
          <ArrowUp size={11} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof props.getPos === 'function') {
              const pos = props.getPos();
              props.editor.chain().focus().insertContentAt(pos + props.node.nodeSize, { type: 'paragraph' }).run();
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
          title="Arrastar toggle"
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
          title="Descer toggle (Mover para baixo)"
        >
          <ArrowDown size={11} />
        </button>
      </div>

      {/* Barra de ações discretas no hover */}
      <div
        className="absolute top-0 right-1 opacity-0 [.toggle-wrapper:hover:not(:has(.toggle-wrapper:hover))_>_&]:opacity-100 transition-opacity z-50"
        contentEditable={false}
      >
        <div className="flex items-center gap-0.5 bg-dark-bg/80 backdrop-blur-sm border border-white/5 rounded-lg p-0.5 shadow-sm">
          <button
            onClick={handleConvertToPage}
            className="p-1 rounded-md transition-all text-dark-subtext hover:bg-white/10 hover:text-white"
            title="Converter em Página"
          >
            <FileText size={14} />
          </button>

          <div className="relative">
            <button
              onClick={handleCopy}
              className={`p-1 rounded-md transition-all ${
                copied ? 'text-green-400' : 'text-dark-subtext hover:bg-white/10 hover:text-white'
              }`}
              title="Copiar lista oculta"
            >
              <Copy size={14} />
            </button>
            {copied && (
              <div className="absolute bottom-full right-0 mb-1.5 px-2 py-0.5 bg-dark-bg border border-white/10 rounded-md text-[11px] text-white/70 whitespace-nowrap pointer-events-none shadow-lg">
                Copiado!
              </div>
            )}
          </div>

          <button
            ref={aiModal.aiButtonRef}
            onClick={aiModal.handleOpenAi}
            className="p-1 rounded-md transition-all text-brand-400 hover:bg-brand-500/20 hover:text-brand-300"
            title="Assistente de IA"
          >
            <Sparkles size={14} />
          </button>

          <div className="relative" ref={confirmRef}>
            <button
              onClick={() => setShowConfirm(!showConfirm)}
              className="p-1 rounded-md transition-all text-dark-subtext hover:bg-red-500/20 hover:text-red-400"
              title="Excluir lista oculta"
            >
              <Trash2 size={14} />
            </button>
            {showConfirm && (
              <div className="absolute top-full right-0 mt-1 bg-dark-bg border border-white/10 rounded-lg p-2 shadow-xl z-50 flex flex-col gap-2 min-w-[140px]">
                <span className="text-xs text-white">Excluir lista oculta?</span>
                <div className="flex gap-1 justify-end">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-2 py-1 text-xs text-dark-subtext hover:text-white rounded hover:bg-white/5"
                  >
                    Não
                  </button>
                  <button
                    onClick={() => props.deleteNode()}
                    className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded"
                  >
                    Sim
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {aiModal.isOpen && aiModal.anchorPos && (
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
        className="flex items-center gap-1 cursor-pointer outline-none font-medium pr-16"
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
