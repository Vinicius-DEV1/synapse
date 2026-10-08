import { useState, useRef, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { X } from 'lucide-react';
import {
  COLUMN_TYPE_ENTRIES,
  parseSelectOptions,
  type TableColumnType,
  type ColumnFilter,
} from './tableColumnTypes';
import TableColumnOptionsEditor from './TableColumnOptionsEditor';
import TableColumnFilterSection from './TableColumnFilterSection';

interface TableColumnTypePopoverProps {
  editor: Editor;
  columnIndex: number;
  currentType: TableColumnType;
  currentOptions: string | null;
  columnFilter: ColumnFilter | null;
  onTypeChange: (type: TableColumnType, options?: string) => void;
  onFilterChange: (filter: ColumnFilter | null) => void;
  onClose: () => void;
  anchorLeft: number;
  anchorTop: number;
}

export default function TableColumnTypePopover({
  editor: _editor,
  columnIndex,
  currentType,
  currentOptions,
  columnFilter,
  onTypeChange,
  onFilterChange,
  onClose,
  anchorLeft,
  anchorTop,
}: TableColumnTypePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Local state for select options
  const [selectOptions, setSelectOptions] = useState<string[]>(
    parseSelectOptions(currentOptions)
  );

  // Auto-close on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // Viewport bounds detection
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [clampedLeft, setClampedLeft] = useState(anchorLeft);

  const recheckPosition = useCallback(() => {
    if (!popoverRef.current) return;
    const rect = popoverRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Flip to top if bottom overflows viewport
    if (rect.bottom > vh - 20) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }

    // Clamp horizontally to stay on screen
    if (rect.right > vw - 16) {
      const overflow = rect.right - (vw - 16);
      setClampedLeft((prev) => Math.max(8, prev - overflow));
    }
  }, []);

  useEffect(() => {
    recheckPosition();
  }, [recheckPosition]);

  const handleTypeSelect = useCallback(
    (type: TableColumnType) => {
      if (type === 'select') {
        onTypeChange(type, JSON.stringify(selectOptions));
      } else {
        onTypeChange(type);
      }
      if (columnFilter) {
        onFilterChange(null);
      }
    },
    [onTypeChange, onFilterChange, columnFilter, selectOptions]
  );

  const handleOptionsChange = useCallback(
    (updated: string[]) => {
      setSelectOptions(updated);
      onTypeChange('select', JSON.stringify(updated));
    },
    [onTypeChange]
  );

  const positionStyle =
    placement === 'bottom'
      ? { left: `${clampedLeft}px`, top: `${anchorTop + 4}px` }
      : { left: `${clampedLeft}px`, bottom: `${-anchorTop + 4}px` };

  return (
    <div
      ref={popoverRef}
      className="pointer-events-auto absolute z-[200] bg-dark-card/98 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl animate-scale-in w-[240px] select-none"
      style={positionStyle}
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <span className="text-[11px] font-semibold text-dark-subtext uppercase tracking-wider">
          Tipo da Coluna
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded-md text-dark-subtext hover:text-white hover:bg-white/10 transition-all"
        >
          <X size={12} />
        </button>
      </div>

      {/* Column Type Selector Grid */}
      <div className="px-2.5 pb-2 grid grid-cols-3 gap-1">
        {COLUMN_TYPE_ENTRIES.map((entry) => {
          const isActive = currentType === entry.type;
          const Icon = entry.icon;
          return (
            <button
              key={entry.type}
              type="button"
              onClick={() => handleTypeSelect(entry.type)}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all text-[10px] font-medium active:scale-95 ${
                isActive
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                  : 'text-dark-subtext hover:text-white hover:bg-white/5 border border-transparent'
              }`}
              title={entry.description}
            >
              <Icon size={14} />
              <span>{entry.label}</span>
            </button>
          );
        })}
      </div>

      {/* Select Options Section */}
      {currentType === 'select' && (
        <>
          <div className="mx-2.5 border-t border-white/[0.04]" />
          <TableColumnOptionsEditor
            options={selectOptions}
            onOptionsChange={handleOptionsChange}
          />
        </>
      )}

      {/* Filter Section */}
      <div className="mx-2.5 border-t border-white/[0.04]" />
      <TableColumnFilterSection
        columnIndex={columnIndex}
        currentType={currentType}
        selectOptions={selectOptions}
        columnFilter={columnFilter}
        onFilterChange={onFilterChange}
        onExpandToggle={recheckPosition}
      />
    </div>
  );
}
