import { useState, useCallback, useEffect } from 'react';
import { Filter } from 'lucide-react';
import {
  getAvailableOperators,
  FILTER_OPERATOR_LABELS,
  VALUE_LESS_OPERATORS,
  type TableColumnType,
  type ColumnFilter,
  type FilterOperator,
} from './tableColumnTypes';

interface TableColumnFilterSectionProps {
  columnIndex: number;
  currentType: TableColumnType;
  selectOptions: readonly string[];
  columnFilter: ColumnFilter | null;
  onFilterChange: (filter: ColumnFilter | null) => void;
  onExpandToggle?: () => void;
}

export default function TableColumnFilterSection({
  columnIndex,
  currentType,
  selectOptions,
  columnFilter,
  onFilterChange,
  onExpandToggle,
}: TableColumnFilterSectionProps) {
  const [showFilter, setShowFilter] = useState(columnFilter !== null);
  const [filterOp, setFilterOp] = useState<FilterOperator>(
    columnFilter?.operator ?? getAvailableOperators(currentType)[0]
  );
  const [filterValue, setFilterValue] = useState(columnFilter?.value ?? '');
  const [filterValueTo, setFilterValueTo] = useState(columnFilter?.valueTo ?? '');

  // Keep operator valid when column type changes
  useEffect(() => {
    const available = getAvailableOperators(currentType);
    if (!available.includes(filterOp)) {
      setFilterOp(available[0]);
    }
  }, [currentType, filterOp]);

  const handleApply = useCallback(() => {
    if (VALUE_LESS_OPERATORS.has(filterOp)) {
      onFilterChange({
        columnIndex,
        operator: filterOp,
        value: '',
      });
    } else {
      onFilterChange({
        columnIndex,
        operator: filterOp,
        value: filterValue,
        valueTo: filterOp === 'between' ? filterValueTo : undefined,
      });
    }
  }, [columnIndex, filterOp, filterValue, filterValueTo, onFilterChange]);

  const handleClear = useCallback(() => {
    setFilterValue('');
    setFilterValueTo('');
    setFilterOp(getAvailableOperators(currentType)[0]);
    onFilterChange(null);
  }, [currentType, onFilterChange]);

  const toggleExpand = () => {
    setShowFilter((prev) => !prev);
    onExpandToggle?.();
  };

  const availableOperators = getAvailableOperators(currentType);
  const needsValue = !VALUE_LESS_OPERATORS.has(filterOp);

  return (
    <div className="px-2.5 py-2">
      <button
        type="button"
        onClick={toggleExpand}
        className={`flex items-center gap-1.5 w-full text-left text-[10px] font-semibold uppercase tracking-wider transition-all ${
          showFilter || columnFilter ? 'text-brand-400' : 'text-dark-subtext hover:text-white'
        }`}
      >
        <Filter size={11} />
        <span>Filtrar Coluna</span>
        {columnFilter && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
        )}
      </button>

      {showFilter && (
        <div className="mt-2 flex flex-col gap-1.5">
          {/* Operator selector */}
          <select
            value={filterOp}
            onChange={(e) => setFilterOp(e.target.value as FilterOperator)}
            className="h-6 px-1.5 rounded-md bg-dark-surface border border-white/10 text-[11px] text-dark-text focus:border-brand-500/50 focus:outline-none transition-all appearance-none cursor-pointer"
          >
            {availableOperators.map((op) => (
              <option key={op} value={op}>
                {FILTER_OPERATOR_LABELS.get(op) ?? op}
              </option>
            ))}
          </select>

          {/* Value inputs per column type */}
          {needsValue && (
            <>
              {currentType === 'select' ? (
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="h-6 px-1.5 rounded-md bg-dark-surface border border-white/10 text-[11px] text-dark-text focus:border-brand-500/50 focus:outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Selecione…</option>
                  {selectOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : currentType === 'checkbox' ? (
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="h-6 px-1.5 rounded-md bg-dark-surface border border-white/10 text-[11px] text-dark-text focus:border-brand-500/50 focus:outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="true">Marcado (Sim)</option>
                  <option value="false">Desmarcado (Não)</option>
                </select>
              ) : currentType === 'date' ? (
                <>
                  <input
                    type="date"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="h-6 px-1.5 rounded-md bg-dark-surface border border-white/10 text-[11px] text-dark-text focus:border-brand-500/50 focus:outline-none transition-all"
                  />
                  {filterOp === 'between' && (
                    <input
                      type="date"
                      value={filterValueTo}
                      onChange={(e) => setFilterValueTo(e.target.value)}
                      placeholder="Até"
                      className="h-6 px-1.5 rounded-md bg-dark-surface border border-white/10 text-[11px] text-dark-text focus:border-brand-500/50 focus:outline-none transition-all"
                    />
                  )}
                </>
              ) : (
                <input
                  type={currentType === 'number' ? 'number' : 'text'}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Valor…"
                  className="h-6 px-1.5 rounded-md bg-dark-surface border border-white/10 text-[11px] text-dark-text placeholder:text-dark-subtext/40 focus:border-brand-500/50 focus:outline-none transition-all"
                />
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-1 mt-0.5">
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 h-6 rounded-md bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50 text-[10px] font-medium transition-all active:scale-95"
            >
              Aplicar
            </button>
            {columnFilter && (
              <button
                type="button"
                onClick={handleClear}
                className="h-6 px-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 text-[10px] font-medium transition-all active:scale-95"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
