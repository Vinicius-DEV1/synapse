import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import type { FileFolder, FileItem } from '../../types_files';
import { Plus, Search, Folder, File, FileText, Image as ImageIcon, Film, FileArchive, MoreVertical, LayoutGrid, List, FolderPlus, X } from 'lucide-react';
import FileUploadModal from './FileUploadModal';
import FolderModal from './FolderModal';
import DeleteModal from './DeleteModal';
import FileContextMenu from './FileContextMenu';
import FileInfoModal from './FileInfoModal';
import FileViewer from './FileViewer';
import RenameModal from './RenameModal';
import MoveModal from './MoveModal';
import { getValidAccessToken } from '../../services/drive';

export default function FilesView() {
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FileFolder | undefined>(undefined);
  const [itemToDelete, setItemToDelete] = useState<{ item: FileItem | FileFolder, isFolder: boolean } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: FileItem | FileFolder, isFolder: boolean } | null>(null);
  const [itemToView, setItemToView] = useState<FileItem | null>(null);
  const [itemToInfo, setItemToInfo] = useState<FileItem | null>(null);
  const [itemToRename, setItemToRename] = useState<{ item: FileItem | FileFolder, isFolder: boolean } | null>(null);
  const [itemToMove, setItemToMove] = useState<{ item: FileItem | FileFolder, isFolder: boolean } | null>(null);
  const [driveStatus, setDriveStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  const loadData = () => {
    if (window.api && window.api.files) {
      window.api.files.folders.getAll().then(setFolders).catch(console.error);
      window.api.files.getAll().then(setFiles).catch(console.error);
    }
    getValidAccessToken()
      .then(token => setDriveStatus(token ? 'connected' : 'disconnected'))
      .catch(() => setDriveStatus('disconnected'));
  };

  useEffect(() => {
    loadData();
    
    const handleNavigateFolder = (e: any) => {
      const folderId = e.detail;
      setSelectedFolderId(folderId);
    };
    
    window.addEventListener('navigate-folder', handleNavigateFolder);
    return () => window.removeEventListener('navigate-folder', handleNavigateFolder);
  }, []);

  const handleUploadComplete = (newFile: FileItem) => {
    setShowUploadModal(false);
    loadData();
  };

  return (
    <div className="flex h-full bg-dark-bg text-dark-text overflow-hidden relative">
      {/* Sidebar Pastas */}
      <div className="w-64 border-r border-white/5 bg-dark-card/30 flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Pastas</h2>
          <button 
            onClick={() => { setEditingFolder(undefined); setShowFolderModal(true); }}
            className="p-1 hover:bg-white/5 rounded-lg text-dark-subtext transition-colors group"
            title="Nova Pasta"
          >
            <FolderPlus size={16} className="group-hover:text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <button 
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedFolderId === null ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:bg-white/5'}`}
          >
            <Folder size={16} />
            <span>Todos os Arquivos</span>
          </button>
          
          {folders.map(folder => (
            <div key={folder.id} className="relative group/folder">
              <button
                onClick={() => setSelectedFolderId(folder.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, item: folder, isFolder: true });
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedFolderId === folder.id ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:bg-white/5'}`}
              >
                <Folder size={16} style={{ color: folder.color || '#6366f1' }} />
                <span className="flex-1 text-left truncate">{folder.name}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setItemToDelete({ item: folder, isFolder: true }); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dark-subtext hover:text-red-400 opacity-0 group-hover/folder:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-dark-card/30">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext" size={16} />
            <input 
              type="text" 
              placeholder="Buscar arquivos..." 
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-brand-500/50"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${driveStatus === 'connected' ? 'bg-green-500/10 text-green-400 border-green-500/20' : driveStatus === 'disconnected' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/5 text-dark-subtext border-white/10'}`} title="Status de Conexão com o Google Drive">
              <div className={`w-2 h-2 rounded-full ${driveStatus === 'connected' ? 'bg-green-400' : driveStatus === 'disconnected' ? 'bg-red-400' : 'bg-gray-400 animate-pulse'}`}></div>
              <span>{driveStatus === 'connected' ? 'Drive Conectado' : driveStatus === 'disconnected' ? 'Drive Desconectado' : 'Verificando...'}</span>
            </div>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm transition-colors"
            >
              <Plus size={16} />
              <span>Novo Arquivo</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white/5 rounded-lg border border-white/5 overflow-hidden">
             <table className="w-full text-sm text-left">
               <thead className="bg-white/5 text-dark-subtext text-xs uppercase">
                 <tr>
                   <th className="px-4 py-3 font-medium">Nome</th>
                   <th className="px-4 py-3 font-medium w-24">Tipo</th>
                   <th className="px-4 py-3 font-medium w-32">Tamanho</th>
                   <th className="px-4 py-3 font-medium w-40">Modificado</th>
                   <th className="px-4 py-3 font-medium w-32">Origem</th>
                   <th className="px-4 py-3 font-medium w-16 text-center">Ações</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {files.filter(f => selectedFolderId === null || f.folder_id === selectedFolderId).length === 0 ? (
                   <tr>
                     <td colSpan={6} className="px-4 py-8 text-center text-dark-subtext">
                       Nenhum arquivo encontrado nesta pasta.
                     </td>
                   </tr>
                 ) : (
                   files.filter(f => selectedFolderId === null || f.folder_id === selectedFolderId).map(file => (
                     <tr 
                       key={file.id} 
                       className="hover:bg-white/5 transition-colors group cursor-pointer"
                       onDoubleClick={() => setItemToView(file)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, item: file, isFolder: false });
                        }}
                     >
                       <td className="px-4 py-3 flex items-center gap-3">
                         <FileText size={18} className="text-blue-400" />
                         <span className="truncate max-w-[300px]" title={file.name}>{file.name}</span>
                       </td>
                       <td className="px-4 py-3 text-dark-subtext uppercase text-xs">{file.file_type}</td>
                       <td className="px-4 py-3 text-dark-subtext">{(file.file_size / 1024 / 1024).toFixed(2)} MB</td>
                       <td className="px-4 py-3 text-dark-subtext">{new Date(file.updated_at || Date.now()).toLocaleDateString()}</td>
                       <td className="px-4 py-3">
                         {/* Origin tag */}
                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-xs text-dark-subtext border border-white/5">
                           ☁️ Drive
                         </span>
                       </td>
                       <td className="px-4 py-3 text-center">
                         <button 
                           onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, item: file, isFolder: false }); }}
                           className="p-1 text-dark-subtext hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
                         >
                           <MoreVertical size={16} />
                         </button>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
          </div>
        </div>
      </div>

      {showUploadModal && (
        <FileUploadModal 
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
          currentFolderId={selectedFolderId}
        />
      )}
      
      {showFolderModal && (
        <FolderModal
          onClose={() => setShowFolderModal(false)}
          onSave={loadData}
          existingFolder={editingFolder}
        />
      )}
      
      {itemToDelete && (
        <DeleteModal
          item={itemToDelete.item}
          isFolder={itemToDelete.isFolder}
          onClose={() => setItemToDelete(null)}
          onDeleted={() => {
            setItemToDelete(null);
            loadData();
          }}
        />
      )}
      
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item as FileItem}
          onClose={() => setContextMenu(null)}
          onView={contextMenu.isFolder ? () => setSelectedFolderId(contextMenu.item.id) : (item) => setItemToView(item as FileItem)}
          onInfo={(item) => setItemToInfo(item as FileItem)}
          onDelete={(item) => setItemToDelete({ item, isFolder: contextMenu.isFolder })}
          onRename={(item) => setItemToRename({ item, isFolder: contextMenu.isFolder })}
          onMove={(item) => setItemToMove({ item, isFolder: contextMenu.isFolder })}
        />
      )}

      {itemToRename && (
        <RenameModal
          item={itemToRename.item}
          isFolder={itemToRename.isFolder}
          onClose={() => setItemToRename(null)}
          onRename={async (id, newName, isFolder) => {
            if (window.api && window.api.files) {
              if (isFolder) {
                const folder = itemToRename.item as FileFolder;
                await window.api.files.folders.update({ ...folder, name: newName });
              } else {
                const file = itemToRename.item as FileItem;
                await window.api.files.update({ ...file, name: newName });
              }
              loadData();
            }
          }}
        />
      )}

      {itemToMove && (
        <MoveModal
          item={itemToMove.item}
          isFolder={itemToMove.isFolder}
          folders={folders}
          onClose={() => setItemToMove(null)}
          onMove={async (id, targetFolderId, isFolder) => {
            if (window.api && window.api.files) {
              if (isFolder) {
                const folder = itemToMove.item as FileFolder;
                await window.api.files.folders.update({ ...folder, parent_id: targetFolderId });
              } else {
                await window.api.files.move(id, targetFolderId);
              }
              loadData();
            }
          }}
        />
      )}
      
      {itemToInfo && (
        <FileInfoModal
          item={itemToInfo}
          onClose={() => setItemToInfo(null)}
        />
      )}
      
      {itemToView && (
        <FileViewer
          item={itemToView}
          onClose={() => setItemToView(null)}
        />
      )}
    </div>
  );
}
