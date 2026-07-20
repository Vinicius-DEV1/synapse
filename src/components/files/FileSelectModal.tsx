import React, { useState, useEffect } from 'react';
import { X, Search, File, Image as ImageIcon, Film, FileText, FileArchive, Folder } from 'lucide-react';
import type { FileItem, FileFolder } from '../../types';

interface FileSelectModalProps {
  onClose: () => void;
  onSelect: (item: { id: string, name: string, type: string, isFolder: boolean }) => void;
}

export default function FileSelectModal({ onClose, onSelect }: FileSelectModalProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (window.api && window.api.files) {
          const fetchedFiles = await window.api.files.getAll();
          const fetchedFolders = await window.api.files.folders.getAll();
          setFiles(fetchedFiles);
          setFolders(fetchedFolders);
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon size={20} className="text-blue-400" />;
      case 'video': return <Film size={20} className="text-purple-400" />;
      case 'pdf': return <FileText size={20} className="text-red-400" />;
      case 'epub': return <FileText size={20} className="text-green-400" />;
      case 'slide': return <FileArchive size={20} className="text-yellow-400" />;
      default: return <File size={20} className="text-gray-400" />;
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  const hasResults = filteredFiles.length > 0 || filteredFolders.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[70vh] max-h-[600px]">
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-semibold text-white">Vincular Arquivo Existente</h2>
          <button onClick={onClose} className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b border-white/10 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext" size={18} />
            <input
              type="text"
              placeholder="Buscar arquivos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-dark-subtext focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center items-center h-full text-dark-subtext">Carregando...</div>
          ) : !hasResults ? (
            <div className="flex flex-col items-center justify-center h-full text-dark-subtext">
              <File size={48} className="mb-4 opacity-50" />
              <p>Nenhum item encontrado</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFolders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => onSelect({ id: folder.id, name: folder.name, type: 'folder', isFolder: true })}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="p-2 bg-dark-bg rounded-lg border border-white/5">
                    <Folder size={20} className="text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{folder.name}</p>
                    <p className="text-dark-subtext text-xs">Pasta</p>
                  </div>
                </button>
              ))}
              
              {filteredFiles.map(file => (
                <button
                  key={file.id}
                  onClick={() => onSelect({ id: file.id, name: file.name, type: file.file_type, isFolder: false })}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="p-2 bg-dark-bg rounded-lg border border-white/5">
                    {getFileIcon(file.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{file.name}</p>
                    <p className="text-dark-subtext text-xs">{(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
