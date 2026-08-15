import React from 'react';
import type { CalendarEvent } from '../../../types';

interface EventModalFooterProps {
  event: CalendarEvent | null;
  onDelete?: (deleteAll: boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function EventModalFooter({ event, onDelete, onClose, onSubmit }: EventModalFooterProps) {
  return (
    <div className="px-4 py-3 border-t border-dark-border flex justify-between bg-dark-bg/50 flex-shrink-0">
      {onDelete && event ? (
        event.recurrence_rule?.startsWith('group_') ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDelete(false)}
              className="px-2.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
            >
              Excluir Este
            </button>
            <button
              type="button"
              onClick={() => onDelete(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
            >
              Excluir Série
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onDelete(false)}
            className="px-4 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
          >
            Excluir
          </button>
        )
      ) : (
        <div></div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-sm font-medium text-dark-subtext hover:text-dark-text hover:bg-dark-hover rounded-md transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="px-4 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-sm"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
