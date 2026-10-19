import { useState, useEffect } from 'react';
import { Portal } from '../ui/Portal';
import { useTranslation } from '../../i18n';

interface CreateDeckModalProps {
  parentId: string | null;
  onClose: () => void;
  onCreate: (name: string, description: string, parentId: string | null) => Promise<void>;
}

export default function CreateDeckModal({ parentId, onClose, onCreate }: CreateDeckModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
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

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate(name, description, parentId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-dark-card border border-white/[0.06] p-6 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4 text-white">
            {parentId ? t('anki.modal.newSubDeck', 'Novo Subbaralho') : t('anki.modal.newDeck', 'Novo Baralho')}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-dark-subtext mb-1">
                {t('anki.modal.deckName', 'Nome do Baralho')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder={t('anki.modal.deckNamePlaceholder', 'Ex: Inglês - Phrasal Verbs')}
                className="w-full bg-dark-bg border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-subtext mb-1">
                {t('anki.modal.description', 'Descrição (opcional)')}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('anki.modal.descriptionPlaceholder', 'Ex: Verbos úteis para conversação')}
                className="w-full bg-dark-bg border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              {t('anki.modal.cancel', 'Cancelar')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium transition-colors cursor-pointer shadow-sm"
            >
              {parentId ? t('anki.modal.createSubDeckBtn', 'Criar Subbaralho') : t('anki.modal.create', 'Criar')}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
