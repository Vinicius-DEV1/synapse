import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Palette, X, ListTree } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { BG_COLORS } from '../../utils/colors';

export default function ColorBlockquoteComponent(props: any) {
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

  const handleSetColor = (colorHex: string) => {
    props.updateAttributes({ color: colorHex });
    setShowColors(false);
  };

  const handleConvertToToggle = () => {
    const { editor } = props;
    const currentColor = props.node.attrs.color || 'default';

    // Get the HTML content of the current blockquote
    const htmlContent = editor.getHTML(props.node.pos, props.node.pos + props.node.node.nodeSize);

    // Replace with blockquoteToggle using HTML content
    editor.chain()
      .focus()
      .deleteRange({ from: props.node.pos, to: props.node.pos + props.node.node.nodeSize })
      .insertContent(`<div class="blockquote-toggle" data-color="${currentColor}" data-title=""><p>${htmlContent}</p></div>`)
      .run();
  };

  const currentColor = props.node.attrs.color || 'default';

  // O index.css já estliza o blockquote, aqui apenas aplicamos as cores customizadas
  const customStyle = currentColor !== 'default'
    ? { backgroundColor: `${currentColor}15`, borderLeftColor: currentColor }
    : {};

  return (
    <NodeViewWrapper 
      as="blockquote" 
      className="group relative"
      style={customStyle}
      data-color={currentColor}
    >
      <div 
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                className={`w-5 h-5 rounded-full border hover:scale-110 transition-transform ${currentColor === color.hex ? 'border-white' : 'border-white/20'}`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
            <button 
              onClick={() => { setShowConfirm(false); handleSetColor('default'); }}
              className={`w-5 h-5 rounded-full hover:scale-110 transition-transform bg-transparent flex items-center justify-center hover:text-white ${currentColor === 'default' ? 'border border-white text-white' : 'border border-white/20 text-white/50'}`}
              title="Cor Padrão"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        )}
      </div>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}
