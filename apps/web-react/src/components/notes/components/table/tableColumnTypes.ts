import {
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
} from 'lucide-react';
import type { ElementType } from 'react';

// ─── Column Type Definitions ──────────────────────────────────────────────

/** Supported column data types for typed table columns. */
export type TableColumnType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

/** Metadata stored on tableHeader ProseMirror nodes. */
export interface ColumnTypeConfig {
  columnType: TableColumnType;
  /** JSON-encoded string[] for 'select' column options (e.g. '["Sim","Não"]') */
  columnOptions: string | null;
  /** Number format: 'plain' | 'currency' | 'percent' */
  numberFormat: string | null;
  /** Date format: 'iso' | 'short' | 'long' */
  dateFormat: string | null;
}

/** Display metadata for each column type. */
export interface ColumnTypeEntry {
  type: TableColumnType;
  label: string;
  icon: ElementType;
  description: string;
}

/** Registry of all column types with UI metadata. */
export const COLUMN_TYPE_ENTRIES: readonly ColumnTypeEntry[] = [
  { type: 'text', label: 'Texto', icon: Type, description: 'Texto livre' },
  { type: 'number', label: 'Número', icon: Hash, description: 'Apenas números' },
  { type: 'date', label: 'Data', icon: Calendar, description: 'Seletor de data' },
  { type: 'select', label: 'Seleção', icon: List, description: 'Lista de opções' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Sim / Não' },
] as const;

/** Fast O(1) lookup for column type icons. */
export const COLUMN_TYPE_ICON_MAP: ReadonlyMap<TableColumnType, ElementType> = new Map(
  COLUMN_TYPE_ENTRIES.map((e) => [e.type, e.icon])
);

/** Fast O(1) lookup for column type labels. */
export const COLUMN_TYPE_LABEL_MAP: ReadonlyMap<TableColumnType, string> = new Map(
  COLUMN_TYPE_ENTRIES.map((e) => [e.type, e.label])
);

// ─── Filter Operator Definitions ──────────────────────────────────────────

/**
 * Filter condition operators. Each column type supports a subset of these.
 * - text: contains, not_contains, equals, not_equals, is_empty, is_not_empty
 * - number: equals, not_equals, gt, gte, lt, lte, is_empty, is_not_empty
 * - date: equals, before, after, between, is_empty, is_not_empty
 * - select: is, is_not, is_empty, is_not_empty
 * - checkbox: is (checked/unchecked)
 */
export type FilterOperator =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'is_empty'
  | 'is_not_empty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'before'
  | 'after'
  | 'between'
  | 'is'
  | 'is_not';

/** A single column filter condition. */
export interface ColumnFilter {
  columnIndex: number;
  operator: FilterOperator;
  value: string;
  /** End value for 'between' date filter */
  valueTo?: string;
}

/** Human-readable labels for filter operators (Portuguese). */
export const FILTER_OPERATOR_LABELS: ReadonlyMap<FilterOperator, string> = new Map<FilterOperator, string>([
  ['contains', 'Contém'],
  ['not_contains', 'Não contém'],
  ['equals', 'Igual a'],
  ['not_equals', 'Diferente de'],
  ['is_empty', 'Está vazio'],
  ['is_not_empty', 'Não está vazio'],
  ['gt', 'Maior que'],
  ['gte', 'Maior ou igual'],
  ['lt', 'Menor que'],
  ['lte', 'Menor ou igual'],
  ['before', 'Antes de'],
  ['after', 'Depois de'],
  ['between', 'Entre'],
  ['is', 'É'],
  ['is_not', 'Não é'],
]);

/** Operators that don't require a value input. */
export const VALUE_LESS_OPERATORS: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
  'is_empty',
  'is_not_empty',
]);

// ─── Operator Registry ────────────────────────────────────────────────────

const TEXT_OPERATORS: readonly FilterOperator[] = [
  'contains', 'not_contains', 'equals', 'not_equals', 'is_empty', 'is_not_empty',
];
const NUMBER_OPERATORS: readonly FilterOperator[] = [
  'equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'is_empty', 'is_not_empty',
];
const DATE_OPERATORS: readonly FilterOperator[] = [
  'equals', 'before', 'after', 'between', 'is_empty', 'is_not_empty',
];
const SELECT_OPERATORS: readonly FilterOperator[] = [
  'is', 'is_not', 'is_empty', 'is_not_empty',
];
const CHECKBOX_OPERATORS: readonly FilterOperator[] = [
  'is',
];

const OPERATORS_BY_TYPE: ReadonlyMap<TableColumnType, readonly FilterOperator[]> = new Map([
  ['text', TEXT_OPERATORS],
  ['number', NUMBER_OPERATORS],
  ['date', DATE_OPERATORS],
  ['select', SELECT_OPERATORS],
  ['checkbox', CHECKBOX_OPERATORS],
]);

/** Returns the available filter operators for a given column type. */
export function getAvailableOperators(type: TableColumnType): readonly FilterOperator[] {
  return OPERATORS_BY_TYPE.get(type) ?? TEXT_OPERATORS;
}

// ─── Validation ───────────────────────────────────────────────────────────

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SHORT_DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

/**
 * Validates whether a cell's text content is valid for the given column type.
 * Empty strings are always valid (cells can be blank).
 */
export function validateCellInput(
  type: TableColumnType,
  value: string,
  options?: readonly string[]
): boolean {
  const trimmed = value.trim();

  // Empty is always valid
  if (trimmed === '') return true;

  switch (type) {
    case 'text':
      return true;

    case 'number':
      return !isNaN(Number(trimmed)) && trimmed !== '';

    case 'date':
      // Accept ISO (YYYY-MM-DD) or short (DD/MM/YYYY) formats
      if (ISO_DATE_REGEX.test(trimmed)) {
        return !isNaN(Date.parse(trimmed));
      }
      if (SHORT_DATE_REGEX.test(trimmed)) {
        const [d, m, y] = trimmed.split('/');
        return !isNaN(Date.parse(`${y}-${m}-${d}`));
      }
      return false;

    case 'select':
      if (!options || options.length === 0) return true;
      return options.includes(trimmed);

    case 'checkbox':
      return ['true', 'false', '1', '0', 'sim', 'não', 'yes', 'no', '✓', '✗', '☑', '☐'].includes(
        trimmed.toLowerCase()
      );

    default:
      return true;
  }
}

/**
 * Normalizes checkbox cell text to a boolean-like canonical value.
 * Returns 'true' or 'false'.
 */
export function normalizeCheckboxValue(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return ['true', '1', 'sim', 'yes', '✓', '☑'].includes(lower);
}

/**
 * Safely parses a JSON-encoded string[] of select options.
 * Returns empty array on invalid input.
 */
export function parseSelectOptions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item): item is string => typeof item === 'string')) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

// ─── Filter Evaluation ───────────────────────────────────────────────────

/**
 * Parses a date string from either ISO or DD/MM/YYYY format into a timestamp.
 * Returns NaN if invalid.
 */
function parseDateValue(raw: string): number {
  const trimmed = raw.trim();
  if (ISO_DATE_REGEX.test(trimmed)) {
    return Date.parse(trimmed);
  }
  if (SHORT_DATE_REGEX.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return Date.parse(`${y}-${m}-${d}`);
  }
  return NaN;
}

/**
 * Evaluates whether a cell's text content passes the given filter condition.
 * The column type is inferred from the filter's operator set.
 */
export function evaluateFilter(
  filter: ColumnFilter,
  cellText: string,
  columnType: TableColumnType
): boolean {
  const text = cellText.trim();
  const val = filter.value.trim();

  // Universal emptiness operators
  if (filter.operator === 'is_empty') return text === '';
  if (filter.operator === 'is_not_empty') return text !== '';

  switch (columnType) {
    case 'text':
      return evaluateTextFilter(filter.operator, text, val);

    case 'number':
      return evaluateNumberFilter(filter.operator, text, val);

    case 'date':
      return evaluateDateFilter(filter.operator, text, val, filter.valueTo);

    case 'select':
      return evaluateSelectFilter(filter.operator, text, val);

    case 'checkbox':
      return evaluateCheckboxFilter(filter.operator, text, val);

    default:
      return true;
  }
}

function evaluateTextFilter(op: FilterOperator, text: string, val: string): boolean {
  const lower = text.toLowerCase();
  const lowerVal = val.toLowerCase();

  switch (op) {
    case 'contains': return lower.includes(lowerVal);
    case 'not_contains': return !lower.includes(lowerVal);
    case 'equals': return lower === lowerVal;
    case 'not_equals': return lower !== lowerVal;
    default: return true;
  }
}

function evaluateNumberFilter(op: FilterOperator, text: string, val: string): boolean {
  const num = Number(text);
  const target = Number(val);
  if (isNaN(num) || isNaN(target)) return false;

  switch (op) {
    case 'equals': return num === target;
    case 'not_equals': return num !== target;
    case 'gt': return num > target;
    case 'gte': return num >= target;
    case 'lt': return num < target;
    case 'lte': return num <= target;
    default: return true;
  }
}

function evaluateDateFilter(
  op: FilterOperator,
  text: string,
  val: string,
  valueTo?: string
): boolean {
  const cellDate = parseDateValue(text);
  const targetDate = parseDateValue(val);
  if (isNaN(cellDate)) return false;
  if (isNaN(targetDate) && op !== 'is_empty' && op !== 'is_not_empty') return false;

  switch (op) {
    case 'equals': return cellDate === targetDate;
    case 'before': return cellDate < targetDate;
    case 'after': return cellDate > targetDate;
    case 'between': {
      const endDate = valueTo ? parseDateValue(valueTo) : NaN;
      if (isNaN(endDate)) return false;
      return cellDate >= targetDate && cellDate <= endDate;
    }
    default: return true;
  }
}

function evaluateSelectFilter(op: FilterOperator, text: string, val: string): boolean {
  const lower = text.toLowerCase();
  const lowerVal = val.toLowerCase();

  switch (op) {
    case 'is': return lower === lowerVal;
    case 'is_not': return lower !== lowerVal;
    default: return true;
  }
}

function evaluateCheckboxFilter(op: FilterOperator, text: string, val: string): boolean {
  if (op !== 'is') return true;
  const cellBool = normalizeCheckboxValue(text);
  const targetBool = normalizeCheckboxValue(val);
  return cellBool === targetBool;
}
