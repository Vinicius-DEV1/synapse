import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronDown, ChevronRight, Palette, X, Type } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { BG_COLORS } from '../../utils/colors';

const BlockquoteToggleComponent = (props: any) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showColors, setShowColors] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.updateAttributes({ title: e.target.value });
  };

  const handleSetColor = (colorHex: string) => {
    props.updateAttributes({ color: colorHex });
    setShowColors(false);
  };

  const handleConvertToCallout = () => {
    const { editor } = props;
    const currentContent = props.node.content;
    const currentColor = props.node.attrs.color || 'default';
    const currentTitle = props.node.attrs.title || '';

    // Replace with regular blockquote (callout)
    editor.chain()
      .focus()
      .deleteRange({ from: props.node.pos, to: props.node.pos + props.node.node.nodeSize })
      .insertContent({
        type: 'blockquote',
        attrs: { color: currentColor },
        content: currentContent
      })
      .run();
  };

  const currentColor = props.node.attrs.color || 'default';
  const customStyle = currentColor !== 'default'
    ? { backgroundColor: `${currentColor}15`, borderLeftColor: currentColor }
    : {};

  return (
    <NodeViewWrapper 
      className="blockquote-toggle block border-l-[3px] border-white/20 bg-white/5 px-4 py-3 my-4 rounded group relative"
      style={customStyle}
      data-color={currentColor}
    >
      <div 
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-50"
        contentEditable={false}
      >
        <div className="flex items-center gap-0.5 bg-dark-bg/80 backdrop-blur-sm border border-white/5 rounded-lg p-0.5 shadow-sm">
          <button
            onClick={handleConvertToCallout}
            className="p-1 rounded-md transition-all text-dark-subtext hover:bg-white/10 hover:text-white"
            title="Converter em Callout"
          >
            <Type size={14} />
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
          <div ref={colorMenuRef} className="absolute top-full right-0 mt-1 bg-dark-card border border-white/10 rounded-xl p-2 shadow-xl flex gap-1 z-50 w-max">
            {BG_COLORS.filter(c => c.value !== 'transparent').map(color => (
              <button 
                key={color.name}
                onClick={() => { setShowConfirm(false); handleSetColor(color.hex); }}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform focus:outline-none"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              >
                {currentColor === color.hex && (
                  <div className="w-2 h-2 bg-dark-bg rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div 
        className="flex items-center gap-1 cursor-pointer outline-none font-medium italic text-white/85 pr-16"
        contentEditable={false}
      >
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white/90"
        >
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <input 
          type="text"
          value={props.node.attrs.title}
          onChange={handleTitleChange}
          placeholder="Título do destaque..."
          className="bg-transparent outline-none flex-1 text-white/90 placeholder-white/40 italic"
        />
      </div>
      
      {isOpen && (
        <div className="toggle-content pl-7 mt-2 text-white/85 italic">
          <NodeViewContent />
        </div>
      )}
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
    };
  },

  parseHTML() {
    return [{ tag: 'div.blockquote-toggle' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'blockquote-toggle' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockquoteToggleComponent);
  },
});
