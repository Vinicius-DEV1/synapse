import React from 'react';
import { Search, FolderUp, Plus } from 'lucide-react';

interface FilesHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  driveStatus: 'checking' | 'connected' | 'disconnected';
  onOpenDriveAuth: () => void;
  onOpenFolderUpload: () => void;
  onOpenFileUpload: () => void;
}

export function FilesHeader({
  searchQuery,
  onSearchChange,
  driveStatus,
  onOpenDriveAuth,
  onOpenFolderUpload,
  onOpenFileUpload
}: FilesHeaderProps) {
  return (
    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-dark-card/30">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext" size={16} />
        <input 
          type="text" 
          placeholder="Buscar arquivos..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-brand-500/50"
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenDriveAuth}
            className="hidden md:flex items-center gap-2 mr-2 text-xs text-white/50 hover:text-white transition-colors"
            title="Gerenciar conexão com o Google Drive"
          >
            <span className={`w-2 h-2 rounded-full ${
              driveStatus === 'connected' ? 'bg-emerald-500' : driveStatus === 'disconnected' ? 'bg-red-500' : 'bg-brand-500'
            }`} />
            <span>
              {driveStatus === 'connected' ? 'Drive Conectado' : driveStatus === 'disconnected' ? 'Conectar ao Drive' : 'Verificando...'}
            </span>
          </button>
          <button 
            onClick={onOpenFolderUpload}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 rounded-lg text-sm transition-colors"
            title="Fazer upload de uma pasta inteira"
          >
            <FolderUp size={16} />
          </button>
          <button 
            onClick={onOpenFileUpload}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm transition-colors"
            title="Fazer upload de arquivo"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
