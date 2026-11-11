import { AlertTriangle } from 'lucide-react';
import { Portal } from '../../ui/Portal';
import type { CalendarEvent } from '../../../types/core';

interface CalendarEventDeleteModalProps {
  title: string;
  eventData: CalendarEvent | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CalendarEventDeleteModal({
  title,
  eventData,
  onConfirm,
  onCancel,
}: CalendarEventDeleteModalProps) {
  const dateStr = eventData?.end_date || eventData?.start_date;
  const isExpired =
    dateStr &&
    !isNaN(new Date(dateStr).getTime()) &&
    new Date(dateStr).getTime() < Date.now();

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
        <div
          className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-in overflow-hidden text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500/10 text-red-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Remover Widget de Evento
              </h3>
              <p className="text-sm text-dark-subtext leading-relaxed">
                Tem certeza que deseja remover o widget de evento{' '}
                <strong>"{eventData?.title || title}"</strong> do texto?
              </p>
              <p className="text-xs text-amber-400/90 leading-relaxed mt-2.5 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg">
                {isExpired
                  ? 'O evento já expirou (prazo encerrado), por isso ele será mantido na sua agenda.'
                  : 'O evento correspondente também será removido da sua Agenda.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-500/20"
            >
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
