import { useState, useEffect, useRef, type FormEvent } from 'react';
import { X, FolderPlus, Palette, Check } from 'lucide-react';
import type { LibraryCollection } from '../../../types';

const CURATED_COLORS = [
  { name: 'Índigo', hex: '#6366f1' },
  { name: 'Violeta', hex: '#8b5cf6' },
  { name: 'Púrpura', hex: '#a855f7' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Carmesim', hex: '#f43f5e' },
  { name: 'Âmbar', hex: '#f59e0b' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Ciano', hex: '#06b6d4' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Lima', hex: '#84cc16' },
];

interface LibraryCreateCollectionModalProps {
  initialCollection?: LibraryCollection | null;
  onSave: (data: { name: string; color: string }) => Promise<void>;
  onClose: () => void;
}

export function LibraryCreateCollectionModal({
  initialCollection,
  onSave,
  onClose,
}: LibraryCreateCollectionModalProps) {
  const [name, setName] = useState(initialCollection?.name || '');
  const [color, setColor] = useState(initialCollection?.color || CURATED_COLORS[0].hex);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleBackPress = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSave({ name: trimmed, color });
      onClose();
    } catch (err) {
      console.error('Failed to save collection:', err);
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(initialCollection);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-dark-card border border-white/[0.06] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl border"
              style={{
                backgroundColor: `${color}15`,
                borderColor: `${color}30`,
              }}
            >
              <FolderPlus size={20} style={{ color }} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {isEditing ? 'Editar Coleção' : 'Nova Coleção'}
              </h2>
              <p className="text-xs text-dark-subtext">
                {isEditing
                  ? 'Altere o nome e a cor temática da coleção'
                  : 'Crie uma coleção para agrupar e organizar seus livros'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/80">Nome da Coleção</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ficção Científica, Estudos, Clássicos..."
              maxLength={60}
              className="w-full px-3.5 py-2.5 bg-dark-bg border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 outline-none transition-all"
            />
          </div>

          {/* Color Palette */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
              <Palette size={14} className="text-white/50" />
              <span>Cor Temática</span>
            </div>
            <div className="grid grid-cols-5 gap-2.5">
              {CURATED_COLORS.map((c) => {
                const isSelected = color === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.name}
                    className={`relative h-9 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'ring-2 ring-white/60 scale-105 shadow-md'
                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && <Check size={16} className="text-white drop-shadow-md" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-xs text-white/50">Prévia visual:</span>
            <div
              className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm"
              style={{
                backgroundColor: `${color}25`,
                color,
                borderColor: `${color}40`,
                borderWidth: '1px',
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{name.trim() || 'Nome da Coleção'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-medium bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:pointer-events-none text-white shadow-lg shadow-brand-500/20 transition-all active:scale-95"
            >
              {isSubmitting
                ? 'Salvando...'
                : isEditing
                ? 'Salvar Alterações'
                : 'Criar Coleção'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
