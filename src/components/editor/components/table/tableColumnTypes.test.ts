import { describe, it, expect } from 'vitest';
import {
  validateCellInput,
  normalizeCheckboxValue,
  parseSelectOptions,
  evaluateFilter,
  getAvailableOperators,
  COLUMN_TYPE_ENTRIES,
  COLUMN_TYPE_ICON_MAP,
  COLUMN_TYPE_LABEL_MAP,
  FILTER_OPERATOR_LABELS,
  VALUE_LESS_OPERATORS,
  type TableColumnType,
  type ColumnFilter,
} from './tableColumnTypes';

// ─── Registry Tests ──────────────────────────────────────────────────────

describe('Column type registries', () => {
  it('should have 5 column types', () => {
    expect(COLUMN_TYPE_ENTRIES).toHaveLength(5);
  });

  it('should have icons for all types', () => {
    for (const entry of COLUMN_TYPE_ENTRIES) {
      expect(COLUMN_TYPE_ICON_MAP.get(entry.type)).toBeDefined();
    }
  });

  it('should have labels for all types', () => {
    for (const entry of COLUMN_TYPE_ENTRIES) {
      expect(COLUMN_TYPE_LABEL_MAP.get(entry.type)).toBe(entry.label);
    }
  });

  it('should have labels for all filter operators', () => {
    const allTypes: TableColumnType[] = ['text', 'number', 'date', 'select', 'checkbox'];
    for (const t of allTypes) {
      const ops = getAvailableOperators(t);
      for (const op of ops) {
        expect(FILTER_OPERATOR_LABELS.get(op)).toBeDefined();
      }
    }
  });

  it('should flag value-less operators correctly', () => {
    expect(VALUE_LESS_OPERATORS.has('is_empty')).toBe(true);
    expect(VALUE_LESS_OPERATORS.has('is_not_empty')).toBe(true);
    expect(VALUE_LESS_OPERATORS.has('contains')).toBe(false);
  });
});

// ─── getAvailableOperators ──────────────────────────────────────────────

describe('getAvailableOperators', () => {
  it('returns text operators for text type', () => {
    const ops = getAvailableOperators('text');
    expect(ops).toContain('contains');
    expect(ops).toContain('not_contains');
    expect(ops).not.toContain('gt');
  });

  it('returns number operators for number type', () => {
    const ops = getAvailableOperators('number');
    expect(ops).toContain('gt');
    expect(ops).toContain('lte');
    expect(ops).not.toContain('contains');
  });

  it('returns date operators for date type', () => {
    const ops = getAvailableOperators('date');
    expect(ops).toContain('before');
    expect(ops).toContain('after');
    expect(ops).toContain('between');
  });

  it('returns select operators for select type', () => {
    const ops = getAvailableOperators('select');
    expect(ops).toContain('is');
    expect(ops).toContain('is_not');
    expect(ops).not.toContain('contains');
  });

  it('returns checkbox operators for checkbox type', () => {
    const ops = getAvailableOperators('checkbox');
    expect(ops).toContain('is');
    expect(ops).toHaveLength(1);
  });

  it('falls back to text operators for unknown type', () => {
    const ops = getAvailableOperators('unknown' as TableColumnType);
    expect(ops).toContain('contains');
  });
});

// ─── validateCellInput ──────────────────────────────────────────────────

describe('validateCellInput', () => {
  it('always accepts empty strings', () => {
    expect(validateCellInput('number', '')).toBe(true);
    expect(validateCellInput('date', '  ')).toBe(true);
    expect(validateCellInput('select', '', ['A'])).toBe(true);
  });

  describe('text', () => {
    it('accepts any non-empty string', () => {
      expect(validateCellInput('text', 'anything')).toBe(true);
      expect(validateCellInput('text', '123')).toBe(true);
    });
  });

  describe('number', () => {
    it('accepts valid numbers', () => {
      expect(validateCellInput('number', '42')).toBe(true);
      expect(validateCellInput('number', '-3.14')).toBe(true);
      expect(validateCellInput('number', '0')).toBe(true);
    });

    it('rejects non-numeric strings', () => {
      expect(validateCellInput('number', 'abc')).toBe(false);
      expect(validateCellInput('number', '12px')).toBe(false);
    });
  });

  describe('date', () => {
    it('accepts ISO dates', () => {
      expect(validateCellInput('date', '2026-01-15')).toBe(true);
    });

    it('accepts short DD/MM/YYYY dates', () => {
      expect(validateCellInput('date', '15/01/2026')).toBe(true);
    });

    it('rejects invalid date formats', () => {
      expect(validateCellInput('date', 'not-a-date')).toBe(false);
      expect(validateCellInput('date', '2026/01/15')).toBe(false);
    });

    it('rejects invalid dates in valid format', () => {
      expect(validateCellInput('date', '2026-13-01')).toBe(false);
    });
  });

  describe('select', () => {
    it('accepts options that are in the list', () => {
      expect(validateCellInput('select', 'Sim', ['Sim', 'Não'])).toBe(true);
    });

    it('rejects options not in the list', () => {
      expect(validateCellInput('select', 'Talvez', ['Sim', 'Não'])).toBe(false);
    });

    it('accepts anything when options list is empty', () => {
      expect(validateCellInput('select', 'anything', [])).toBe(true);
      expect(validateCellInput('select', 'anything')).toBe(true);
    });
  });

  describe('checkbox', () => {
    it('accepts truthy values', () => {
      expect(validateCellInput('checkbox', 'true')).toBe(true);
      expect(validateCellInput('checkbox', 'Sim')).toBe(true);
      expect(validateCellInput('checkbox', '✓')).toBe(true);
    });

    it('accepts falsy values', () => {
      expect(validateCellInput('checkbox', 'false')).toBe(true);
      expect(validateCellInput('checkbox', 'Não')).toBe(true);
      expect(validateCellInput('checkbox', '✗')).toBe(true);
    });

    it('rejects unknown values', () => {
      expect(validateCellInput('checkbox', 'maybe')).toBe(false);
    });
  });
});

// ─── normalizeCheckboxValue ─────────────────────────────────────────────

describe('normalizeCheckboxValue', () => {
  it('returns true for truthy values', () => {
    expect(normalizeCheckboxValue('true')).toBe(true);
    expect(normalizeCheckboxValue('1')).toBe(true);
    expect(normalizeCheckboxValue('Sim')).toBe(true);
    expect(normalizeCheckboxValue('yes')).toBe(true);
    expect(normalizeCheckboxValue('✓')).toBe(true);
    expect(normalizeCheckboxValue('☑')).toBe(true);
  });

  it('returns false for falsy values', () => {
    expect(normalizeCheckboxValue('false')).toBe(false);
    expect(normalizeCheckboxValue('0')).toBe(false);
    expect(normalizeCheckboxValue('Não')).toBe(false);
    expect(normalizeCheckboxValue('no')).toBe(false);
    expect(normalizeCheckboxValue('✗')).toBe(false);
  });
});

// ─── parseSelectOptions ─────────────────────────────────────────────────

describe('parseSelectOptions', () => {
  it('parses valid JSON array', () => {
    expect(parseSelectOptions('["A","B","C"]')).toEqual(['A', 'B', 'C']);
  });

  it('returns empty array for null/undefined', () => {
    expect(parseSelectOptions(null)).toEqual([]);
    expect(parseSelectOptions(undefined)).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseSelectOptions('not-json')).toEqual([]);
    expect(parseSelectOptions('{}')).toEqual([]);
    expect(parseSelectOptions('[1,2,3]')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseSelectOptions('')).toEqual([]);
  });
});

// ─── evaluateFilter ─────────────────────────────────────────────────────

describe('evaluateFilter', () => {
  const makeFilter = (
    op: ColumnFilter['operator'],
    value = '',
    valueTo?: string,
    columnIndex = 0
  ): ColumnFilter => ({ columnIndex, operator: op, value, valueTo });

  describe('universal operators', () => {
    it('is_empty matches empty cells', () => {
      expect(evaluateFilter(makeFilter('is_empty'), '', 'text')).toBe(true);
      expect(evaluateFilter(makeFilter('is_empty'), 'something', 'text')).toBe(false);
    });

    it('is_not_empty matches non-empty cells', () => {
      expect(evaluateFilter(makeFilter('is_not_empty'), 'x', 'text')).toBe(true);
      expect(evaluateFilter(makeFilter('is_not_empty'), '', 'text')).toBe(false);
    });
  });

  describe('text filters', () => {
    it('contains', () => {
      expect(evaluateFilter(makeFilter('contains', 'hello'), 'Hello World', 'text')).toBe(true);
      expect(evaluateFilter(makeFilter('contains', 'xyz'), 'Hello World', 'text')).toBe(false);
    });

    it('not_contains', () => {
      expect(evaluateFilter(makeFilter('not_contains', 'xyz'), 'Hello World', 'text')).toBe(true);
      expect(evaluateFilter(makeFilter('not_contains', 'hello'), 'Hello World', 'text')).toBe(false);
    });

    it('equals (case-insensitive)', () => {
      expect(evaluateFilter(makeFilter('equals', 'hello'), 'Hello', 'text')).toBe(true);
      expect(evaluateFilter(makeFilter('equals', 'hello'), 'Hello World', 'text')).toBe(false);
    });
  });

  describe('number filters', () => {
    it('gt / lt', () => {
      expect(evaluateFilter(makeFilter('gt', '10'), '15', 'number')).toBe(true);
      expect(evaluateFilter(makeFilter('gt', '10'), '5', 'number')).toBe(false);
      expect(evaluateFilter(makeFilter('lt', '10'), '5', 'number')).toBe(true);
    });

    it('equals', () => {
      expect(evaluateFilter(makeFilter('equals', '42'), '42', 'number')).toBe(true);
      expect(evaluateFilter(makeFilter('equals', '42'), '43', 'number')).toBe(false);
    });

    it('returns false for non-numeric cell text', () => {
      expect(evaluateFilter(makeFilter('gt', '10'), 'abc', 'number')).toBe(false);
    });
  });

  describe('date filters', () => {
    it('before', () => {
      expect(evaluateFilter(makeFilter('before', '2026-06-01'), '2026-01-15', 'date')).toBe(true);
      expect(evaluateFilter(makeFilter('before', '2026-06-01'), '2026-09-15', 'date')).toBe(false);
    });

    it('after', () => {
      expect(evaluateFilter(makeFilter('after', '2026-01-01'), '2026-06-15', 'date')).toBe(true);
    });

    it('between', () => {
      const f = makeFilter('between', '2026-01-01', '2026-12-31');
      expect(evaluateFilter(f, '2026-06-15', 'date')).toBe(true);
      expect(evaluateFilter(f, '2025-06-15', 'date')).toBe(false);
    });

    it('handles DD/MM/YYYY format', () => {
      expect(evaluateFilter(makeFilter('after', '2026-01-01'), '15/06/2026', 'date')).toBe(true);
    });
  });

  describe('select filters', () => {
    it('is', () => {
      expect(evaluateFilter(makeFilter('is', 'Sim'), 'Sim', 'select')).toBe(true);
      expect(evaluateFilter(makeFilter('is', 'Sim'), 'Não', 'select')).toBe(false);
    });

    it('is_not', () => {
      expect(evaluateFilter(makeFilter('is_not', 'Sim'), 'Não', 'select')).toBe(true);
    });
  });

  describe('checkbox filters', () => {
    it('is checked', () => {
      expect(evaluateFilter(makeFilter('is', 'true'), 'Sim', 'checkbox')).toBe(true);
      expect(evaluateFilter(makeFilter('is', 'true'), 'Não', 'checkbox')).toBe(false);
    });

    it('is unchecked', () => {
      expect(evaluateFilter(makeFilter('is', 'false'), 'Não', 'checkbox')).toBe(true);
    });
  });
});
