import React, { useState } from 'react';
import { X, Folder, ChevronRight, LayoutGrid } from 'lucide-react';
import type { FileItem, FileFolder } from '../../types';
import { Portal } from '../ui/Portal';

interface MoveModalProps {
  item?: FileItem | FileFolder;
  isFolder?: boolean;
  items?: Array<{ item: FileItem | FileFolder; isFolder: boolean }>;
  folders: FileFolder[];
  onClose: () => void;
  onMove: (id: string, targetFolderId: string | null, isFolder: boolean) => Promise<void>;
}

export default function MoveModal({ item, isFolder, items, folders, onClose, onMove }: MoveModalProps) {
  const list = items || (item ? [{ item, isFolder: !!isFolder }] : []);
  const initialFolderId = list[0]
    ? (list[0].isFolder ? (list[0].item as FileFolder).parent_id || null : (list[0].item as FileItem).folder_id || null)
    : null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);

  // Filtramos as pastas válidas (uma pasta não pode ser movida para dentro dela mesma)
  const validFolders = folders.filter(f => {
    return !list.some(entry => entry.isFolder && entry.item.id === f.id);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      for (const entry of list) {
        const currentFolderId = entry.isFolder ? (entry.item as FileFolder).parent_id || null : (entry.item as FileItem).folder_id || null;
        if (selectedFolderId !== currentFolderId) {
          await onMove(entry.item.id, selectedFolderId, entry.isFolder);
        }
      }
      onClose();
    } catch (err) {
      console.error("Failed to move:", err);
      alert("Erro ao mover.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-semibold text-white">Mover para...</h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-2 overflow-y-auto flex-1">
            <div className="space-y-1">
              {/* Option to move to root */}
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
                  selectedFolderId === null 
                    ? 'bg-brand-500/20 border border-brand-500/30' 
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedFolderId === null ? 'bg-brand-500/20 text-brand-400' : 'bg-dark-bg text-dark-subtext'}`}>
                    <LayoutGrid size={20} />
                  </div>
                  <span className={`font-medium ${selectedFolderId === null ? 'text-brand-300' : 'text-white'}`}>
                    Raiz (Início)
                  </span>
                </div>
                {selectedFolderId === null && <ChevronRight size={18} className="text-brand-400" />}
              </button>

              {/* Options for folders */}
              {validFolders.map(folder => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
                    selectedFolderId === folder.id 
                      ? 'bg-brand-500/20 border border-brand-500/30' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedFolderId === folder.id ? 'bg-brand-500/20 text-brand-400' : 'bg-dark-bg text-yellow-400'}`}>
                      <Folder size={20} />
                    </div>
                    <span className={`font-medium ${selectedFolderId === folder.id ? 'text-brand-300' : 'text-white'}`}>
                      {folder.name}
                    </span>
                  </div>
                  {selectedFolderId === folder.id && <ChevronRight size={18} className="text-brand-400" />}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-white/10 flex gap-3 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl font-medium text-dark-subtext hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
            >
              {isSubmitting ? 'Movendo...' : 'Mover'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}
