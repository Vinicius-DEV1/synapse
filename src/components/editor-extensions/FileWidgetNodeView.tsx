import { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { File, FileText, Image as ImageIcon, Film, X, Folder, Plus, GripVertical } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getValidAccessToken, deleteFromDrive } from '../../services/drive';
import FileViewer from '../files/FileViewer';
import FloatingPdfViewer from './FloatingPdfViewer';

export default function FileWidgetNodeView(props: any) {
  const { node, deleteNode } = props;
  const { fileId, name, fileType, isLink } = node.attrs;
  
  const { state, dispatch } = useStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [fileItem, setFileItem] = useState<any>(null);

  useEffect(() => {
    // Fetch file data if needed for viewer
    if (window.api && window.api.files && fileId) {
      window.api.files.getById(fileId).then(setFileItem).catch(console.error);
    }
  }, [fileId]);

  // Escuta evento de delete via teclado (Backspace/Delete) para mostrar modal de confirmação
  useEffect(() => {
    const handleDeleteRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.fileId === fileId) {
        setShowDeleteConfirm(true);
      }
    };
    window.addEventListener('file-widget-delete-request', handleDeleteRequest);
    return () => window.removeEventListener('file-widget-delete-request', handleDeleteRequest);
  }, [fileId]);

  useEffect(() => {
    const handleOpenQuickViewer = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.fileId === fileId) {
        setShowViewer(true);
      }
    };
    window.addEventListener('open-quick-viewer', handleOpenQuickViewer);
    return () => window.removeEventListener('open-quick-viewer', handleOpenQuickViewer);
  }, [fileId]);

  const getIcon = () => {
    switch(fileType) {
      case 'pdf': return <FileText size={16} className="text-blue-400" />;
      case 'image': return <ImageIcon size={16} className="text-green-400" />;
      case 'video': return <Film size={16} className="text-purple-400" />;
      case 'folder': return <Folder size={16} className="text-yellow-400" />;
      default: return <File size={16} className="text-brand-400" />;
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (fileItem && window.api.files) {
        // Remove from DB
        await window.api.files.delete(fileItem.id);
        
        // Não há opção de "manter no Drive" na UI — o botão "Excluir de Tudo"
        // sempre remove de lá também quando existe um drive_file_id.
        if (fileItem.drive_file_id) {
          try {
            const token = await getValidAccessToken();
            if (token) {
              await deleteFromDrive(token, fileItem.drive_file_id);
            }
          } catch (e) {
            console.warn("Failed to delete from Drive", e);
          }
        }
      }
      deleteNode();
    } catch (e) {
      console.error("Delete failed", e);
      alert("Falha ao excluir arquivo do sistema.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <NodeViewWrapper as="span" className="inline-block relative group align-middle mx-1 my-1">
      {/* Custom Drag Handle & Add Below Button */}
      <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
          onMouseDown={() => {
            if (typeof props.getPos === 'function') {
              const pos = props.getPos();
              if (typeof pos === 'number') {
                props.editor.commands.setNodeSelection(pos);
              }
            }
          }}
          className="cursor-grab hover:bg-white/10 p-1 rounded-r text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
          title="Arrastar arquivo"
        >
          <GripVertical size={16} />
        </div>
      </div>

      <div 
        data-drag-handle
        onMouseDown={() => {
          if (typeof props.getPos === 'function') {
            const pos = props.getPos();
            if (typeof pos === 'number' && props.editor) {
              props.editor.commands.setNodeSelection(pos);
            }
          }
        }}
        className={`inline-flex items-center gap-2 pr-2 pl-3 py-1.5 rounded-lg border cursor-pointer select-none transition-colors ${
          props.selected ? 'ring-2 ring-brand-400 border-brand-400 ' : ''
        }${
          isLink 
            ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' 
            : 'bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/20'
        }`}
        onClick={() => {
          if (fileType === 'folder') {
            // Não existe ação global "trocar módulo" — o módulo é por aba.
            dispatch({ type: 'UPDATE_TAB_MODULE', tabId: state.activeTabId, module: 'files' });
            // Should probably emit an event to navigate to that folder inside the module
            window.dispatchEvent(new CustomEvent('navigate-folder', { detail: { folderId: fileId } }));
          } else if ((fileType === 'pdf' || fileType === 'epub') && fileItem) {
            window.dispatchEvent(new CustomEvent('open-file-action', { 
              detail: { fileId, title: name || fileItem?.name } 
            }));
          } else {
            if (fileItem) setShowViewer(true);
            else alert("O arquivo ainda está sendo carregado ou não foi encontrado.");
          }
        }}
      >
        <div className="flex items-center justify-center p-2 bg-dark-bg rounded-lg border border-white/5 mr-1">
          {getIcon()}
        </div>
        <span className="flex-1 break-words leading-tight group-hover:text-white transition-colors">
          {name || fileItem?.name || 'Arquivo'}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          className="p-1 ml-1 rounded-md text-dark-subtext hover:bg-black/20 hover:text-red-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" contentEditable={false}>
          <div className="bg-dark-card border border-red-500/20 rounded-xl p-5 w-[320px] shadow-2xl flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg text-center">Excluir Arquivo</h3>
            <p className="text-dark-subtext text-sm text-center">
              Deseja excluir este arquivo permanentemente do Caderno ou apenas desvincular desta pgina?
            </p>
            
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={() => deleteNode()}
                disabled={isDeleting}
                className="flex-1 py-2 bg-dark-bg border border-white/10 hover:bg-white/5 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Desvincular
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir de Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewer && fileItem && (
        <FileViewer 
          item={fileItem} 
          onClose={() => setShowViewer(false)} 
        />
      )}
      
      {showFloatingViewer && fileItem && fileType === 'pdf' && (
        <FloatingPdfViewer
          item={fileItem}
          onClose={() => setShowFloatingViewer(false)}
          onExpand={() => {
            setShowFloatingViewer(false);
            setShowViewer(true);
          }}
        />
      )}
    </NodeViewWrapper>
  );
}
