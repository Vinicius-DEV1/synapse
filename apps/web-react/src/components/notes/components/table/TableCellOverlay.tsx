import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { Check, X, Calendar, ChevronDown } from 'lucide-react';
import {
  getCellColumnMeta,
  updateCellText,
  toggleCheckboxCell,
  type CellColumnMeta,
} from './tableColumnUtils';

interface ActiveCellState {
  cellEl: HTMLTableCellElement;
  meta: CellColumnMeta;
  rect: { left: number; top: number; width: number; height: number };
}

interface TableCellOverlayProps {
  editor: Editor | null;
  activeTable: HTMLTableElement | null;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

export default function TableCellOverlay({
  editor,
  activeTable,
  wrapperRef,
}: TableCellOverlayProps) {
  const [activeCell, setActiveCell] = useState<ActiveCellState | null>(null);
  const [dateInputValue, setDateInputValue] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!activeCell) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        // Also ensure target is not the active cell itself
        if (!activeCell.cellEl.contains(target)) {
          setActiveCell(null);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeCell]);

  // Handle Escape key to dismiss
  useEffect(() => {
    if (!activeCell) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveCell(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell]);

  // Listen to clicks on the active table
  useEffect(() => {
    if (!activeTable || !editor) return;

    const handleTableClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const td = target.closest('td');
      if (!td || !activeTable.contains(td)) return;

      const meta = getCellColumnMeta(td);
      if (!meta || meta.type === 'text') {
        setActiveCell(null);
        return;
      }

      // Checkbox column: direct toggle
      if (meta.type === 'checkbox') {
        e.preventDefault();
        e.stopPropagation();
        toggleCheckboxCell(editor, td);
        setActiveCell(null);
        return;
      }

      // Select and Date columns: open popover
      if (meta.type === 'select' || meta.type === 'date') {
        if (!wrapperRef.current) return;
        const wrapperRect = wrapperRef.current.getBoundingClientRect();
        const cellRect = td.getBoundingClientRect();

        const currentText = td.textContent?.trim() ?? '';
        setDateInputValue(currentText);

        setActiveCell({
          cellEl: td,
          meta,
          rect: {
            left: cellRect.left - wrapperRect.left,
            top: cellRect.bottom - wrapperRect.top,
            width: cellRect.width,
            height: cellRect.height,
          },
        });
      }
    };

    activeTable.addEventListener('click', handleTableClick);
    return () => {
      activeTable.removeEventListener('click', handleTableClick);
    };
  }, [activeTable, editor, wrapperRef]);

  const handleSelectOption = useCallback(
    (option: string) => {
      if (!editor || !activeCell) return;
      updateCellText(editor, activeCell.cellEl, option);
      setActiveCell(null);
    },
    [editor, activeCell]
  );

  const handleClearCell = useCallback(() => {
    if (!editor || !activeCell) return;
    updateCellText(editor, activeCell.cellEl, '');
    setActiveCell(null);
  }, [editor, activeCell]);

  const handleApplyDate = useCallback(() => {
    if (!editor || !activeCell) return;
    updateCellText(editor, activeCell.cellEl, dateInputValue);
    setActiveCell(null);
  }, [editor, activeCell, dateInputValue]);

  const handleQuickDate = useCallback(
    (daysOffset: number) => {
      if (!editor || !activeCell) return;
      const date = new Date();
      date.setDate(date.getDate() + daysOffset);
      const iso = date.toISOString().split('T')[0];
      updateCellText(editor, activeCell.cellEl, iso);
      setActiveCell(null);
    },
    [editor, activeCell]
  );

  if (!activeCell) return null;

  const currentCellText = activeCell.cellEl.textContent?.trim() ?? '';
  const popoverLeft = Math.max(8, activeCell.rect.left);
  const popoverTop = activeCell.rect.top + 2;

  return (
    <div
      ref={popoverRef}
      className="pointer-events-auto absolute z-[220] bg-dark-card/98 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl animate-scale-in p-1.5 select-none min-w-[160px] max-w-[280px]"
      style={{ left: `${popoverLeft}px`, top: `${popoverTop}px` }}
    >
      {/* Select Dropdown */}
      {activeCell.meta.type === 'select' && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between px-2 py-1 border-b border-white/[0.04] mb-0.5">
            <span className="text-[10px] font-semibold text-dark-subtext uppercase tracking-wider flex items-center gap-1">
              <ChevronDown size={10} />
              Selecione
            </span>
            {currentCellText && (
              <button
                type="button"
                onClick={handleClearCell}
                className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>

          {activeCell.meta.options.length > 0 ? (
            activeCell.meta.options.map((opt) => {
              const isSelected = currentCellText === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-left text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-brand-500/20 text-brand-300 font-semibold'
                      : 'text-dark-text hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <Check size={12} className="text-brand-400 ml-2" />}
                </button>
              );
            })
          ) : (
            <div className="px-2 py-2 text-[10px] text-dark-subtext/60 italic text-center">
              Nenhuma opção cadastrada no cabeçalho
            </div>
          )}
        </div>
      )}

      {/* Date Picker Popover */}
      {activeCell.meta.type === 'date' && (
        <div className="flex flex-col gap-1.5 p-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-dark-subtext uppercase tracking-wider mb-0.5">
            <Calendar size={11} />
            <span>Escolher Data</span>
          </div>

          <input
            type="date"
            value={dateInputValue}
            onChange={(e) => setDateInputValue(e.target.value)}
            className="h-7 px-2 rounded-md bg-dark-surface border border-white/10 text-[11px] text-dark-text focus:border-brand-500/50 focus:outline-none transition-all"
          />

          {/* Quick presets */}
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => handleQuickDate(0)}
              className="px-1.5 py-1 rounded bg-white/5 hover:bg-white/10 text-dark-text hover:text-white text-[10px] font-medium transition-all"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate(-1)}
              className="px-1.5 py-1 rounded bg-white/5 hover:bg-white/10 text-dark-text hover:text-white text-[10px] font-medium transition-all"
            >
              Ontem
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate(1)}
              className="px-1.5 py-1 rounded bg-white/5 hover:bg-white/10 text-dark-text hover:text-white text-[10px] font-medium transition-all"
            >
              Amanhã
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-1 pt-1 border-t border-white/[0.04]">
            <button
              type="button"
              onClick={handleApplyDate}
              className="flex-1 h-6 rounded-md bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-[10px] font-medium transition-all active:scale-95"
            >
              Aplicar
            </button>
            {currentCellText && (
              <button
                type="button"
                onClick={handleClearCell}
                className="px-2 h-6 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-medium transition-all active:scale-95"
                title="Limpar valor"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
