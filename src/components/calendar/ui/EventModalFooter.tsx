import { useState } from 'react';
import type { CalendarEvent } from '../../../types';
import { useTranslation } from '../../../i18n';

interface EventModalFooterProps {
  event: CalendarEvent | null;
  onDelete?: (deleteAll: boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function EventModalFooter({ event, onDelete, onClose, onSubmit }: EventModalFooterProps) {
  const { t } = useTranslation();
  const [confirmingDelete, setConfirmingDelete] = useState<'single' | 'series' | null>(null);

  return (
    <div className="px-4 py-3 border-t border-dark-border flex justify-between items-center bg-dark-bg/50 flex-shrink-0">
      {onDelete && event ? (
        confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-rose-300 font-medium">
              {confirmingDelete === 'series'
                ? t('calendar.confirmDeleteSeries', 'Excluir série inteira?')
                : t('calendar.confirmDelete', 'Confirmar Exclusão?')}
            </span>
            <button
              type="button"
              onClick={() => {
                const deleteAll = confirmingDelete === 'series';
                setConfirmingDelete(null);
                onDelete(deleteAll);
              }}
              className="px-2.5 py-1 text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-md transition-colors"
            >
              {confirmingDelete === 'series'
                ? t('calendar.confirmDeleteSeriesBtn', 'Sim, excluir série')
                : t('calendar.confirmDeleteBtn', 'Sim, excluir')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(null)}
              className="px-2 py-1 text-xs text-dark-subtext hover:text-white rounded-md transition-colors"
            >
              {t('calendar.cancel', 'Cancelar')}
            </button>
          </div>
        ) : event.recurrence_rule?.startsWith('group_') ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete('single')}
              className="px-2.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
            >
              {t('calendar.deleteThis', 'Excluir Este')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete('series')}
              className="px-2.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
            >
              {t('calendar.deleteSeries', 'Excluir Série')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete('single')}
            className="px-4 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
          >
            {t('calendar.delete', 'Excluir')}
          </button>
        )
      ) : (
        <div />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-sm font-medium text-dark-subtext hover:text-dark-text hover:bg-dark-hover rounded-md transition-colors"
        >
          {t('calendar.cancel', 'Cancelar')}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="px-4 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-sm"
        >
          {t('calendar.save', 'Salvar')}
        </button>
      </div>
    </div>
  );
}
