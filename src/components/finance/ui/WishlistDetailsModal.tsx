import { X, Edit2, Trash2 } from 'lucide-react';
import { Portal } from '../../ui/Portal';
import { DescriptionRenderer } from '../../ui/RichTextRenderer';
import type { WishlistItem } from '../../../types';

interface WishlistDetailsModalProps {
  item: WishlistItem | null;
  onClose: () => void;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
}

export function WishlistDetailsModal({ item, onClose, onEdit, onDelete }: WishlistDetailsModalProps) {
  if (!item) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-dark-card border border-white/10 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold text-dark-text">Detalhes do Desejo</h2>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(item)}
                className="p-1.5 text-brand-400 hover:text-brand-300 rounded-lg hover:bg-white/5 transition-colors"
                title="Editar"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-white/5 transition-colors"
                title="Apagar"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5 transition-colors"
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
                  R$ {item.price?.toFixed(2) ?? '0.00'}
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
              {item.expected_date && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-dark-subtext uppercase tracking-wider mb-1">Data Esperada</span>
                  <span className="text-sm font-medium text-dark-text">
                    {new Date(item.expected_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
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
