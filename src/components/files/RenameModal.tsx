import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { FileItem, FileFolder } from '../../types';
import { Portal } from '../ui/Portal';

interface RenameModalProps {
  item: FileItem | FileFolder;
  isFolder: boolean;
  onClose: () => void;
  onRename: (id: string, newName: string, isFolder: boolean) => Promise<void>;
}

export default function RenameModal({ item, isFolder, onClose, onRename }: RenameModalProps) {
  const [name, setName] = useState(item.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input and select the text (excluding extension if it's a file)
    if (inputRef.current) {
      inputRef.current.focus();
      if (!isFolder) {
        const lastDot = name.lastIndexOf('.');
        if (lastDot > 0) {
          inputRef.current.setSelectionRange(0, lastDot);
        } else {
          inputRef.current.select();
        }
      } else {
        inputRef.current.select();
      }
    }
  }, [isFolder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === item.name) {
      onClose();
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onRename(item.id, name.trim(), isFolder);
      onClose();
    } catch (err) {
      console.error("Failed to rename:", err);
      // Depending on global error handling, we might want to show an alert here
      alert("Erro ao renomear.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Renomear {isFolder ? 'Pasta' : 'Arquivo'}
          </h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-dark-subtext mb-1 uppercase tracking-wider">
              Novo Nome
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-dark-subtext focus:outline-none focus:border-brand-primary"
              placeholder="Digite o novo nome..."
              required
            />
          </div>
          
          <div className="flex gap-3 pt-2">
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
              disabled={isSubmitting || !name.trim()}
              className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}
