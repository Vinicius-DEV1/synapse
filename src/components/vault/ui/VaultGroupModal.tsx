import { useState, useEffect } from 'react';
import { Folder, Check, X } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import type { VaultGroup } from '../../../types';

export const VAULT_GROUP_PALETTE = [
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Esmeralda', value: '#10b981' },
  { label: 'Roxo', value: '#8b5cf6' },
  { label: 'Rosa', value: '#f43f5e' },
  { label: 'Âmbar', value: '#f59e0b' },
  { label: 'Ciano', value: '#06b6d4' },
  { label: 'Índigo', value: '#6366f1' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Neutro', value: '#71717a' },
];

interface VaultGroupModalProps {
  isOpen: boolean;
  group?: VaultGroup | null;
  onClose: () => void;
  onSave: (name: string, color: string) => Promise<void>;
}

export function VaultGroupModal({ isOpen, group, onClose, onSave }: VaultGroupModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(group?.name || '');
      setColor(group?.color || '#3b82f6');
      setIsSubmitting(false);
    }
  }, [isOpen, group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave(trimmed, color);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} containerClassName="w-full max-w-md">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: `${color}20` }}
            >
              <Folder size={18} style={{ color }} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {group ? 'Editar Grupo' : 'Novo Grupo'}
              </h3>
              <p className="text-xs text-zinc-400">
                {group ? 'Altere o nome e a cor do grupo' : 'Organize seus itens com um grupo personalizado'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nome do Grupo
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex: Trabalho, Finanças, Pessoal..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Seletor de Cor */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Cor do Grupo
            </label>
            <div className="grid grid-cols-5 gap-2.5">
              {VAULT_GROUP_PALETTE.map((p) => {
                const isSelected = color.toLowerCase() === p.value.toLowerCase();
                return (
                  <button
                    key={p.value}
                    type="button"
                    title={p.label}
                    onClick={() => setColor(p.value)}
                    className="relative h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border"
                    style={{
                      backgroundColor: `${p.value}25`,
                      borderColor: isSelected ? p.value : 'transparent',
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: p.value }}
                    />
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
                        <Check size={14} className="stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
              <label className="text-xs text-zinc-400">Cor personalizada:</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-zinc-300 uppercase">{color}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-5 py-2 text-xs font-semibold bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-95"
            >
              {group ? 'Salvar Alterações' : 'Criar Grupo'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
