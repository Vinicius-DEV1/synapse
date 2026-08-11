import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import type { FileFolder, FileItem } from '../../types';
import { Plus, Search, Folder, File, FileText, Image as ImageIcon, Film, FileArchive, MoreVertical, LayoutGrid, List, FolderPlus, X, FolderUp } from 'lucide-react';
import FileUploadModal from './FileUploadModal';
import FolderUploadModal from './FolderUploadModal';
import FolderModal from './FolderModal';
import DeleteModal from './DeleteModal';
import FileContextMenu from './FileContextMenu';
import FileInfoModal from './FileInfoModal';
import FileViewer from './FileViewer';
import RenameModal from './RenameModal';
import MoveModal from './MoveModal';
import { getValidAccessToken } from '../../services/drive';
import { getDecryptedFileUrl } from '../../utils/file-fetcher';
import DriveAuthModal from '../library/DriveAuthModal';

export default function FilesView() {
  const { state } = useStore();
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderUploadModal, setShowFolderUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FileFolder | undefined>(undefined);
  const [itemToDelete, setItemToDelete] = useState<{ item: FileItem | FileFolder, isFolder: boolean } | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<Array<{ item: FileItem | FileFolder, isFolder: boolean }> | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: FileItem | FileFolder, isFolder: boolean } | null>(null);
  const [itemToView, setItemToView] = useState<FileItem | null>(null);
  const [itemToInfo, setItemToInfo] = useState<FileItem | null>(null);
  const [itemToRename, setItemToRename] = useState<{ item: FileItem | FileFolder, isFolder: boolean } | null>(null);
  const [itemToMove, setItemToMove] = useState<{ item: FileItem | FileFolder, isFolder: boolean } | null>(null);
  const [itemsToMove, setItemsToMove] = useState<Array<{ item: FileItem | FileFolder, isFolder: boolean }> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [driveStatus, setDriveStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [showDriveAuth, setShowDriveAuth] = useState(false);
  
  const loadData = async () => {
    if (window.api && window.api.files) {
      const fs = await window.api.files.getAll();
      const fds = await window.api.files.folders.getAll();
      setFiles(fs);
      setFolders(fds);
    }
  };

  const handleDownload = async (item: FileItem) => {
    try {
      const url = await getDecryptedFileUrl(item, state.moduleKeys['files']);
      
      if (url && typeof url === 'string') {
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        alert("Arquivo não está disponível para download.");
      }
    } catch (err) {
      console.error("Failed to download", err);
      alert("Erro ao tentar baixar o arquivo.");
    }
  };

  useEffect(() => {
    loadData();
    getValidAccessToken()
      .then(token => setDriveStatus(token ? 'connected' : 'disconnected'))
      .catch(() => setDriveStatus('disconnected'));
    loadData();
    
    const handleNavigateFolder = (e: any) => {
      const folderId = e.detail;
      setSelectedFolderId(folderId);
    };
    
    window.addEventListener('navigate-folder', handleNavigateFolder);
    return () => window.removeEventListener('navigate-folder', handleNavigateFolder);
  }, []);

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    setShowFolderUploadModal(false);
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
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowDriveAuth(true)}
                className="hidden md:flex items-center gap-2 mr-2 text-xs text-white/50 hover:text-white transition-colors"
                title="Gerenciar conexão com o Google Drive"
              >
                <span className={`w-2 h-2 rounded-full ${driveStatus === 'connected' ? 'bg-emerald-500' : driveStatus === 'disconnected' ? 'bg-red-500' : 'bg-brand-500'}`}></span>
                <span>{driveStatus === 'connected' ? 'Drive Conectado' : driveStatus === 'disconnected' ? 'Conectar ao Drive' : 'Verificando...'}</span>
              </button>
              <button 
                onClick={() => setShowFolderUploadModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 rounded-lg text-sm transition-colors"
                title="Fazer upload de uma pasta inteira"
              >
                <FolderUp size={16} />
              </button>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm transition-colors"
                title="Fazer upload de arquivo"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white/5 rounded-lg border border-white/5 overflow-hidden">
             <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-white/5 text-dark-subtext text-xs uppercase">
                    <th className="px-4 py-3 font-medium w-10">
                      <input
                        type="checkbox"
                        checked={
                          files.filter(f => selectedFolderId === null || f.folder_id === selectedFolderId).length > 0 &&
                          selectedIds.size === files.filter(f => selectedFolderId === null || f.folder_id === selectedFolderId).length
                        }
                        onChange={() => {
                          const currentFiles = files.filter(f => selectedFolderId === null || f.folder_id === selectedFolderId);
                          if (selectedIds.size === currentFiles.length) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(currentFiles.map(f => f.id)));
                          }
                        }}
                        className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500 cursor-pointer"
                      />
                    </th>
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
                      <td colSpan={7} className="px-4 py-8 text-center text-dark-subtext">
                        Nenhum arquivo encontrado nesta pasta.
                      </td>
                    </tr>
                  ) : (
                    files.filter(f => selectedFolderId === null || f.folder_id === selectedFolderId).map(file => (
                      <tr 
                        key={file.id} 
                        className={`hover:bg-white/5 transition-colors group cursor-pointer ${
                          selectedIds.has(file.id) ? 'bg-brand-500/10' : ''
                        }`}
                        onDoubleClick={() => setItemToView(file)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, item: file, isFolder: false });
                        }}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(file.id)}
                            onChange={() => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(file.id)) next.delete(file.id);
                                else next.add(file.id);
                                return next;
                              });
                            }}
                            className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500 cursor-pointer"
                          />
                        </td>
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

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-dark-card border border-white/15 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-slide-up">
          <span className="text-sm font-semibold text-white">
            {selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-dark-subtext hover:text-white transition-colors"
          >
            Desmarcar
          </button>
          <div className="h-4 w-px bg-white/15" />
          <button
            onClick={() => {
              const items = Array.from(selectedIds)
                .map(id => {
                  const f = files.find(x => x.id === id);
                  return f ? { item: f, isFolder: false } : null;
                })
                .filter(Boolean) as Array<{ item: FileItem | FileFolder, isFolder: boolean }>;
              setItemsToMove(items);
            }}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <FolderUp size={13} />
            Mover ({selectedIds.size})
          </button>
          <button
            onClick={() => {
              const items = Array.from(selectedIds)
                .map(id => {
                  const f = files.find(x => x.id === id);
                  return f ? { item: f, isFolder: false } : null;
                })
                .filter(Boolean) as Array<{ item: FileItem | FileFolder, isFolder: boolean }>;
              setItemsToDelete(items);
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <X size={13} />
            Excluir ({selectedIds.size})
          </button>
        </div>
      )}

      {showUploadModal && (
        <FileUploadModal 
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
          currentFolderId={selectedFolderId}
        />
      )}
      
      {showFolderUploadModal && (
        <FolderUploadModal 
          onClose={() => setShowFolderUploadModal(false)}
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
      
      {(itemToDelete || itemsToDelete) && (
        <DeleteModal
          item={itemToDelete?.item}
          isFolder={itemToDelete?.isFolder}
          items={itemsToDelete || undefined}
          onClose={() => { setItemToDelete(null); setItemsToDelete(null); }}
          onDeleted={() => {
            setItemToDelete(null);
            setItemsToDelete(null);
            setSelectedIds(new Set());
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
          onDownload={(item) => handleDownload(item as FileItem)}
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
      {(itemToMove || itemsToMove) && (
        <MoveModal
          item={itemToMove?.item}
          isFolder={itemToMove?.isFolder}
          items={itemsToMove || undefined}
          folders={folders}
          onClose={() => { setItemToMove(null); setItemsToMove(null); }}
          onMove={async (id, targetFolderId, isFolder) => {
            if (window.api && window.api.files) {
              if (isFolder) {
                const folder = folders.find(f => f.id === id);
                if (folder) {
                  await window.api.files.folders.update({ ...folder, parent_id: targetFolderId });
                }
              } else {
                await window.api.files.move(id, targetFolderId);
              }
              setSelectedIds(new Set());
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

      {showDriveAuth && (
        <DriveAuthModal 
          onClose={() => setShowDriveAuth(false)}
          onSuccess={() => {
            setShowDriveAuth(false);
            setDriveStatus('connected');
          }}
        />
      )}
    </div>
  );
}
