import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { FileItem, FileFolder } from '../../types';
import { getValidAccessToken, deleteFromDrive } from '../../services/drive';

interface DeleteModalProps {
  item: FileItem | FileFolder;
  isFolder: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteModal({ item, isFolder, onClose, onDeleted }: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [keepInDrive, setKeepInDrive] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (isFolder) {
        await window.api.files.folders.delete(item.id);
      } else {
        const fileItem = item as FileItem;
        
        // Remove do BD (e exclui localmente pelo rust backend)
        await window.api.files.delete(fileItem.id);
        
        // Exclui do Drive se solicitado
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
      onDeleted();
    } catch (e) {
      console.error("Delete failed", e);
      alert("Falha ao excluir: " + e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-dark-card border border-red-500/20 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        <div className="flex flex-col items-center justify-center p-6 gap-4">
          <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white mb-1">
              Excluir {isFolder ? 'Pasta' : 'Arquivo'}
            </h2>
            <p className="text-dark-subtext text-sm">
              Tem certeza que deseja excluir <strong>{item.name}</strong>?
              {isFolder && " Todos os arquivos desta pasta ficarão órfãos e irão para 'Todos os Arquivos'."}
            </p>
          </div>

          {!isFolder && (item as FileItem).drive_file_id && (
            <div className="w-full mt-2 flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <input 
                type="checkbox" 
                id="keepInDrive" 
                checked={keepInDrive} 
                onChange={e => setKeepInDrive(e.target.checked)}
                className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="keepInDrive" className="text-sm text-dark-subtext cursor-pointer">
                Manter cópia no Google Drive
              </label>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-white/10 bg-dark-bg/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
