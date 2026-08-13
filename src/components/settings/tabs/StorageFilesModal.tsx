import React, { useState, useMemo } from 'react';
import { X, Search, File as FileIcon, Calendar } from 'lucide-react';
import type { DriveFile } from '../../../services/drive';

interface StorageFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName: string;
  icon: any;
  color: string;
  bg: string;
  files: DriveFile[];
}

export default function StorageFilesModal({
  isOpen,
  onClose,
  moduleName,
  icon: Icon,
  color,
  bg,
  files
}: StorageFilesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return files;
    const term = searchTerm.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(term));
  }, [files, searchTerm]);

  // Sort files by size descending
  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      const sizeA = parseInt(a.size || '0', 10);
      const sizeB = parseInt(b.size || '0', 10);
      return sizeB - sizeA;
    });
  }, [filteredFiles]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-bg border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{moduleName}</h2>
              <p className="text-xs text-dark-subtext">{files.length} arquivo(s)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext" />
            <input 
              type="text"
              placeholder="Buscar arquivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-dark-subtext focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
          {sortedFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-dark-subtext py-12">
              <FileIcon size={32} className="opacity-20 mb-3" />
              <p className="text-sm">Nenhum arquivo encontrado.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedFiles.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                    <FileIcon size={16} className="text-dark-subtext shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-dark-subtext">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(file.createdTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-white/80 shrink-0">
                    {formatBytes(parseInt(file.size || '0', 10))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
