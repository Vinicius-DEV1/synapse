import { useEffect } from 'react';
import { X, Edit2, Trash2 } from 'lucide-react';
import { Portal } from '../../ui/Portal';
import { DescriptionRenderer } from '../../ui/RichTextRenderer';
import type { WishlistItem } from '../../../types';
import { formatDateSafe } from './TransactionList';
import { useTranslation } from '../../../i18n';

interface WishlistDetailsModalProps {
  item: WishlistItem | null;
  onClose: () => void;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
}

export function WishlistDetailsModal({ item, onClose, onEdit, onDelete }: WishlistDetailsModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!item) return;

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
  }, [item, onClose]);

  if (!item) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-dark-card border border-white/[0.06] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold text-dark-text">{t('finance.wishlistDetails', 'Detalhes do Desejo')}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(item)}
                className="p-1.5 text-brand-400 hover:text-brand-300 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title={t('common.edit', 'Editar')}
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title={t('common.delete', 'Apagar')}
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title={t('common.closeEsc', 'Fechar (Esc)')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-5 overflow-y-auto max-h-[70vh]">
            <h1 className="text-2xl font-bold text-dark-text mb-2">{item.title}</h1>
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] text-dark-subtext uppercase tracking-wider mb-1">Categoria</span>
                <span className="text-sm font-medium text-dark-text">{item.category || 'Geral'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-dark-subtext uppercase tracking-wider mb-1">Custo Estimado</span>
                <span className="text-xl font-semibold text-brand-400">
                  R$ {Number(item.price || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-dark-subtext uppercase tracking-wider mb-1">Prioridade</span>
                <span
                  className={`text-sm font-medium ${
                    item.priority === 'high'
                      ? 'text-red-400'
                      : item.priority === 'medium'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-dark-subtext uppercase tracking-wider mb-1">Data Esperada</span>
                <span className={`text-sm font-medium ${item.expected_date ? 'text-dark-text' : 'text-dark-subtext italic'}`}>
                  {item.expected_date ? formatDateSafe(item.expected_date) : 'Não definida'}
                </span>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h3 className="text-sm font-medium text-dark-text">Descrição</h3>
              {item.description ? (
                <DescriptionRenderer text={item.description} />
              ) : (
                <p className="text-sm text-dark-subtext mt-2 italic">Nenhuma descrição adicionada.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
