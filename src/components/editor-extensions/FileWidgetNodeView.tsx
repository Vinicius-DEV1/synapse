import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { File, FileText, Image as ImageIcon, Film, Download, Trash2, X, Folder } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getValidAccessToken, deleteFromDrive } from '../../services/drive';
import FileViewer from '../files/FileViewer';
import FloatingPdfViewer from './FloatingPdfViewer';

export default function FileWidgetNodeView(props: any) {
  const { node, deleteNode, updateAttributes } = props;
  const { fileId, name, fileType, isLink } = node.attrs;
  
  // Backward compatibility for corrupted data where fileId was saved as an object {id, name, type}
  const actualFileId = typeof fileId === 'object' && fileId !== null ? fileId.id : fileId;
  const actualName = typeof fileId === 'object' && fileId !== null ? fileId.name : name;
  const actualFileType = typeof fileId === 'object' && fileId !== null ? fileId.type : fileType;
  
  const { dispatch } = useStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [keepInDrive, setKeepInDrive] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [fileItem, setFileItem] = useState<any>(null);

  useEffect(() => {
    // Fetch file data if needed for viewer
    if (window.api && window.api.files && actualFileId) {
      window.api.files.getById(actualFileId).then(setFileItem).catch(console.error);
    }
  }, [actualFileId]);

  const getIcon = () => {
    switch(actualFileType) {
      case 'pdf': return <FileText size={16} className="text-blue-400" />;
      case 'image': return <ImageIcon size={16} className="text-green-400" />;
      case 'video': return <Film size={16} className="text-purple-400" />;
      case 'folder': return <Folder size={16} className="text-yellow-400" />;
      default: return <File size={16} className="text-brand-400" />;
    }
  };

  const handleDelete = () => {
    if (isLink) {
      // If it's just a link, just remove the widget, file stays
      deleteNode();
      // Optionally tell backend to delete the FilePageLink
      if (window.api && window.api.files && window.api.files.links) {
        // Need the link ID, but we might just delete all links for this widget_id
        // We didn't save the link_id in the widget attrs, but backend can delete by widget_id if implemented.
        // For now, let it be.
      }
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (fileItem) {
        // Remove from DB
        await window.api.files.delete(fileItem.id);
        
        // Remove from Drive if requested
        if (!keepInDrive && fileItem.drive_file_id) {
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
    <NodeViewWrapper as="span" className="inline-block align-middle mx-1 my-1">
      <div 
        className={`inline-flex items-center gap-2 pr-2 pl-3 py-1.5 rounded-lg border cursor-pointer select-none transition-colors ${
          isLink 
            ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' 
            : 'bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/20'
        }`}
        onClick={() => {
          if (fileType === 'folder') {
            dispatch({ type: 'SET_CURRENT_MODULE', payload: 'files' });
            // Should probably emit an event to navigate to that folder inside the module
            window.dispatchEvent(new CustomEvent('navigate-folder', { detail: { folderId: actualFileId } }));
          } else if (actualFileType === 'pdf' && fileItem) {
            setShowFloatingViewer(true);
          } else {
            if (fileItem) setShowViewer(true);
            else alert("O arquivo ainda está sendo carregado ou não foi encontrado.");
          }
        }}
      >
        <div className="flex items-center justify-center p-2 bg-dark-bg rounded-lg border border-white/5 mr-1">
          {getIcon()}
        </div>
        <span className="flex-1 truncate group-hover:text-white transition-colors">
          {actualName || fileItem?.name || 'Arquivo'}
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
      
      {showFloatingViewer && fileItem && actualFileType === 'pdf' && (
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
