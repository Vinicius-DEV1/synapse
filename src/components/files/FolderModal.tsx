import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { FileFolder } from '../../types';
import { Portal } from '../ui/Portal';
import { triggerToast } from '../ui/ToastContext';

interface FolderModalProps {
  onClose: () => void;
  onSave: (folder: FileFolder) => void;
  existingFolder?: FileFolder;
  parentId?: string | null;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
  '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#71717a'
];

export default function FolderModal({ onClose, onSave, existingFolder, parentId = null }: FolderModalProps) {
  const [name, setName] = useState(existingFolder?.name || '');
  const [color, setColor] = useState(existingFolder?.color || COLORS[7]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!window.api.files) {
      triggerToast('Módulo de arquivos indisponível', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingFolder) {
        const updatedFolder: FileFolder = { ...existingFolder, name: name.trim(), color };
        await window.api.files.folders.update(updatedFolder);
        triggerToast('Pasta atualizada com sucesso!', 'success');
        onSave(updatedFolder);
      } else {
        const newFolder = {
          id: crypto.randomUUID(),
          name: name.trim(),
          parent_id: parentId,
          color
        };
        const created = await window.api.files.folders.create(newFolder);
        triggerToast('Pasta criada com sucesso!', 'success');
        onSave(created);
      }
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save folder', err);
      const msg = err instanceof Error ? err.message : 'Falha ao salvar pasta';
      triggerToast(msg, 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            {existingFolder ? 'Editar Pasta' : 'Nova Pasta'}
          </h2>
          <button onClick={onClose} className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-subtext mb-1">Nome da Pasta</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              placeholder="Ex: Documentos Pessoais"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-subtext mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          
          <div className="pt-2 flex justify-end gap-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
