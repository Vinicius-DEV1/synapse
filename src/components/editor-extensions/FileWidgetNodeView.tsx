import { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { File, FileText, Image as ImageIcon, Film, X, Folder, ArrowUp, ArrowDown, Palette } from 'lucide-react';
import { getStoreState, getStoreDispatch } from '../../store/useStore';
import { getValidAccessToken, deleteFromDrive } from '../../services/drive';
import { moveBlockUp, moveBlockDown } from './moveBlockCommands';
import FileViewer from '../files/FileViewer';
import FloatingPdfViewer from './FloatingPdfViewer';
import ColorPalettePicker from './ColorPalettePicker';
import { triggerToast } from '../ui/ToastContext';

export default function FileWidgetNodeView(props: any) {
  const { node, deleteNode, updateAttributes } = props;
  const { fileId, name, fileType, isLink, color: rawColor } = node.attrs;
  const color = rawColor || 'default';
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [fileItem, setFileItem] = useState<any>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  const pos = typeof props.getPos === 'function' ? props.getPos() : null;
  const isNodeSelected = !!(
    props.selected &&
    props.editor?.state?.selection instanceof NodeSelection &&
    typeof pos === 'number' &&
    props.editor.state.selection.from === pos
  );

  useEffect(() => {
    // Fetch file data if needed for viewer
    if (window.api && window.api.files && fileId) {
      window.api.files.getById(fileId).then(setFileItem).catch(console.error);
    }
  }, [fileId]);

  // Listen for keyboard delete event (Backspace/Delete) to show confirmation modal
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
        
        // No 'keep in Drive' option in UI - the 'Delete All' button
        // always removes from Drive as well when drive_file_id exists.
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
      triggerToast('Arquivo excluído com sucesso.', 'info');
    } catch (e: any) {
      console.error("Delete failed", e);
      triggerToast(e.message || "Falha ao excluir arquivo do sistema.", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isCustomColor = Boolean(color && color !== 'default');
  const customWidgetStyle: React.CSSProperties = isCustomColor
    ? {
        backgroundColor: `${color}14`,
        borderColor: isNodeSelected ? color : `${color}40`,
        boxShadow: isNodeSelected
          ? `0 0 0 2px ${color}80, 0 0 12px ${color}30`
          : undefined,
      }
    : {};

  return (
    <NodeViewWrapper as="span" className="inline-block relative group align-middle mx-1 my-1">
      <div 
        onMouseDown={() => {
          if (typeof props.getPos === 'function') {
            const pos = props.getPos();
            if (typeof pos === 'number' && props.editor) {
              props.editor.commands.setNodeSelection(pos);
            }
          }
        }}
        style={customWidgetStyle}
        className={`inline-flex items-center gap-2 pr-2 pl-3 py-1.5 rounded-lg border cursor-pointer select-none transition-colors ${
          isCustomColor
            ? ''
            : isNodeSelected
            ? 'ring-2 ring-brand-400 border-brand-400 '
            : isLink 
            ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' 
            : 'bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/20'
        }`}
        onClick={() => {
          if (fileType === 'folder') {
            const storeState = getStoreState();
            const dispatch = getStoreDispatch();
            dispatch({ type: 'UPDATE_TAB_MODULE', tabId: storeState.activeTabId, module: 'files' });
            window.dispatchEvent(new CustomEvent('navigate-folder', { detail: { folderId: fileId } }));
          } else if ((fileType === 'pdf' || fileType === 'epub') && fileItem) {
            window.dispatchEvent(new CustomEvent('open-file-action', { 
              detail: { fileId, title: name || fileItem?.name } 
            }));
          } else {
            if (fileItem) setShowViewer(true);
            else triggerToast("O arquivo ainda está sendo carregado ou não foi encontrado.", "error");
          }
        }}
      >
        <div className="flex items-center justify-center p-2 bg-dark-bg rounded-lg border border-white/5 mr-1">
          {getIcon()}
        </div>
        <span className="flex-1 break-words leading-tight group-hover:text-white transition-colors">
          {name || fileItem?.name || 'Arquivo'}
        </span>
        <div className={`flex items-center gap-0.5 ml-1 transition-opacity ${showColorPicker ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="p-1 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
              title="Personalizar cor do widget"
            >
              <Palette size={12} />
            </button>
            {showColorPicker && (
              <div ref={colorPickerRef} onClick={(e) => e.stopPropagation()} className="absolute top-full right-0 z-50">
                <ColorPalettePicker
                  currentColor={color}
                  onSelectColor={(c) => {
                    updateAttributes?.({ color: c });
                    setShowColorPicker(false);
                  }}
                  onClearColor={() => {
                    updateAttributes?.({ color: 'default' });
                    setShowColorPicker(false);
                  }}
                />
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof pos === 'number' && props.editor) {
                moveBlockUp(props.editor.view, pos);
              }
            }}
            className="p-1 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
            title="Subir bloco (Mover para cima)"
          >
            <ArrowUp size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof pos === 'number' && props.editor) {
                moveBlockDown(props.editor.view, pos);
              }
            }}
            className="p-1 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
            title="Descer bloco (Mover para baixo)"
          >
            <ArrowDown size={12} />
          </button>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          className="p-1 ml-0.5 rounded-md text-dark-subtext hover:bg-black/20 hover:text-red-400 transition-colors"
          title="Remover anexo"
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
