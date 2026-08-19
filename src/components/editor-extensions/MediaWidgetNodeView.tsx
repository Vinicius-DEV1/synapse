import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { Film, BookOpen, X } from 'lucide-react';

export default function MediaWidgetNodeView(props: any) {
  const { node, deleteNode } = props;
  const { mediaId, mediaType, title } = node.attrs;

  const pos = typeof props.getPos === 'function' ? props.getPos() : null;
  const isNodeSelected = !!(
    props.selected &&
    props.editor?.state?.selection instanceof NodeSelection &&
    typeof pos === 'number' &&
    props.editor.state.selection.from === pos
  );

  const getIcon = () => {
    switch(mediaType) {
      case 'video': return <Film size={16} className="text-purple-400" />;
      case 'book': return <BookOpen size={16} className="text-blue-400" />;
      default: return <Film size={16} className="text-brand-400" />;
    }
  };

  const handleOpenAction = () => {
    window.dispatchEvent(new CustomEvent('open-media-action', { 
      detail: { mediaId, mediaType, title } 
    }));
  };

  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const handleDeleteRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.mediaId === mediaId) {
        setShowConfirm(true);
      }
    };
    window.addEventListener('media-widget-delete-request', handleDeleteRequest);
    return () => window.removeEventListener('media-widget-delete-request', handleDeleteRequest);
  }, [mediaId]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  return (
    <NodeViewWrapper as="span" className="inline-block relative group align-middle mx-1 my-1">
      <div 
        onMouseDown={() => {
          if (typeof pos === 'number' && props.editor) {
            props.editor.commands.setNodeSelection(pos);
          }
        }}
        className={`inline-flex items-center gap-2 pr-2 pl-3 py-1.5 rounded-lg border cursor-pointer select-none transition-colors bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/20 ${
          isNodeSelected ? 'ring-2 ring-brand-400 border-brand-400' : ''
        }`}
        onClick={handleOpenAction}
      >
        <div className="flex items-center justify-center p-2 bg-dark-bg rounded-lg border border-white/5 mr-1">
          {getIcon()}
        </div>
        <span className="flex-1 break-words leading-tight group-hover:text-white transition-colors">
          {title || (mediaType === 'video' ? 'Vídeo' : 'Livro')}
        </span>
        <button 
          onClick={handleDelete}
          className="p-1 ml-1 rounded-md text-dark-subtext hover:bg-black/20 hover:text-red-400 transition-colors"
          title="Remover"
        >
          <X size={14} />
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" contentEditable={false}>
          <div className="bg-dark-card border border-red-500/20 rounded-xl p-5 w-[320px] shadow-2xl flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg text-center">Remover Vínculo</h3>
            <p className="text-dark-subtext text-sm text-center">
              Deseja remover este vínculo da anotação? (A mídia original não será excluída)
            </p>
            
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={() => deleteNode()}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
