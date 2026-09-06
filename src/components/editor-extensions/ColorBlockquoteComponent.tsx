import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Palette, X, ListTree, Copy, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { DOMSerializer } from 'prosemirror-model';
import { BG_COLORS } from '../../utils/colors';
import { useBlockAiModal } from './hooks/useBlockAiModal';
import AiPromptModal from '../modals/AiPromptModal';

export default function ColorBlockquoteComponent(props: any) {
  const [showColors, setShowColors] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  const aiModal = useBlockAiModal({
    editor: props.editor,
    node: props.node,
    getPos: props.getPos,
    updateAttributes: props.updateAttributes,
    blockType: 'blockquote',
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setShowColors(false);
      }
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node)) {
        setShowConfirm(false);
      }
    };

    if (showColors || showConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColors, showConfirm]);

  const handleSetColor = (colorHex: string) => {
    props.updateAttributes({ color: colorHex });
    setShowColors(false);
  };

  const handleConvertToToggle = () => {
    const { editor, node, getPos } = props;
    const currentColor = node.attrs.color || 'default';
    const pos = getPos();
    const content = node.content.toJSON();

    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .insertContentAt(pos, {
        type: 'blockquoteToggle',
        attrs: { color: currentColor, title: '' },
        content,
      })
      .run();
  };

  const handleCopy = () => {
    const { node, editor, getPos } = props;
    try {
      const serializer = DOMSerializer.fromSchema(editor.schema);
      const inner = serializer.serializeNode(node);
      // Wrap with data-pm-slice so ProseMirror reconstructs the full node on paste
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-pm-slice', '0 0 []');
      wrapper.appendChild(inner);
      const html = wrapper.outerHTML;

      const doToast = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

      navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([node.textContent || ''], { type: 'text/plain' }),
        })
      ]).then(doToast).catch(() => {
        // Fallback: select node + execCommand
        editor.chain().setNodeSelection(getPos()).run();
        document.execCommand('copy');
        doToast();
      });
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const currentColor = props.node.attrs.color || 'default';

  // index.css provides base blockquote styling; custom colors are applied here
  const customStyle = currentColor !== 'default'
    ? { backgroundColor: `${currentColor}15`, borderLeftColor: currentColor }
    : {};

  return (
    <NodeViewWrapper 
      as="blockquote" 
      className="group/callout relative"
      style={customStyle}
      data-color={currentColor}
    >
      <div 
        className="absolute top-1 right-1 opacity-0 group-hover/callout:opacity-100 transition-opacity"
        contentEditable={false}
      >
        <div className="flex items-center gap-0.5 bg-dark-bg/80 backdrop-blur-sm border border-white/5 rounded-lg p-0.5 shadow-sm">
          <button
            onClick={handleConvertToToggle}
            className="p-1 rounded-md transition-all text-dark-subtext hover:bg-white/10 hover:text-white"
            title="Converter em Toggle"
          >
            <ListTree size={14} />
          </button>
          <div className="relative">
            <button
              onClick={handleCopy}
              className={`p-1 rounded-md transition-all ${copied ? 'text-green-400' : 'text-dark-subtext hover:bg-white/10 hover:text-white'}`}
              title="Copiar callout"
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
          <div className="w-[1px] h-3 bg-white/10 mx-0.5"></div>
          <button
            onClick={() => {
              setShowConfirm(false);
              setShowColors(!showColors);
            }}
            className="p-1 rounded-md transition-all text-dark-subtext hover:bg-white/10 hover:text-white"
            title="Cor do Destaque"
          >
            <Palette size={14} />
          </button>
          <div className="w-[1px] h-3 bg-white/10 mx-0.5"></div>
          <button
            onClick={() => {
              setShowColors(false);
              setShowConfirm(!showConfirm);
            }}
            className={`p-1 rounded-md transition-all ${showConfirm ? 'bg-red-500/20 text-red-400' : 'text-dark-subtext hover:bg-red-500/20 hover:text-red-400'}`}
            title="Excluir Destaque"
          >
            <X size={14} />
          </button>
        </div>
        
        {showConfirm && (
          <div ref={confirmRef} className="absolute top-full right-0 mt-1 bg-dark-card border border-red-500/30 rounded-xl p-3 shadow-xl z-50 w-64 animate-fade-in">
            <p className="text-xs text-dark-text mb-3">Deseja apagar este destaque e todo o conteúdo dentro dele?</p>
            <div className="flex items-center justify-end gap-2">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-2 py-1 text-xs text-dark-subtext hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => props.deleteNode()}
                className="px-3 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-md transition-colors"
              >
                Sim, apagar
              </button>
            </div>
          </div>
        )}

        {showColors && (
          <div ref={colorMenuRef} 
               className="absolute top-full right-0 mt-1 bg-dark-card border border-white/10 rounded-xl p-2 shadow-xl flex gap-1 z-50 w-max"
               onMouseDown={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
               }}
          >
            {BG_COLORS.filter(c => c.value !== 'transparent').map(color => (
              <button 
                key={color.name}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowConfirm(false); 
                  handleSetColor(color.hex);
                }}
                onClick={(e) => e.preventDefault()}
                className={`w-5 h-5 rounded-full border hover:scale-110 transition-transform ${currentColor === color.hex ? 'border-white' : 'border-white/20'}`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
            <button 
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowConfirm(false); 
                handleSetColor('default');
              }}
              onClick={(e) => e.preventDefault()}
              className={`w-5 h-5 rounded-full hover:scale-110 transition-transform bg-transparent flex items-center justify-center hover:text-white ${currentColor === 'default' ? 'border border-white text-white' : 'border border-white/20 text-white/50'}`}
              title="Cor Padrão"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        )}
      </div>

      {aiModal.isOpen && aiModal.anchorPos && (
        <AiPromptModal
          x={aiModal.anchorPos.x}
          y={aiModal.anchorPos.y}
          chatId={aiModal.chatId}
          messages={aiModal.messages}
          contextText={aiModal.contextText}
          systemInstruction={aiModal.systemInstruction}
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

      <NodeViewContent />
    </NodeViewWrapper>
  );
}
