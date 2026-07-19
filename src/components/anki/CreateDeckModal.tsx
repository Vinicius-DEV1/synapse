import React, { useState } from 'react';

interface CreateDeckModalProps {
  parentId: string | null;
  onClose: () => void;
  onCreate: (name: string, description: string, parentId: string | null) => Promise<void>;
}

export default function CreateDeckModal({ parentId, onClose, onCreate }: CreateDeckModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    await onCreate(name, description, parentId);
    setIsSubmitting(false);
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-dark-card border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4">{parentId ? 'Novo Subbaralho' : 'Novo Baralho'}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-subtext mb-1">Nome do Baralho</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              placeholder="Ex: Inglês - Phrasal Verbs"
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-subtext mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Verbos úteis para conversação"
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium transition-colors"
          >
            {parentId ? 'Criar Subbaralho' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}
