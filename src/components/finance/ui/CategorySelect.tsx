import React, { useState, useMemo } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../../../utils/constants';

export const DEFAULT_FINANCE_CATEGORIES = [
  'Geral',
  'Alimentação',
  'Transporte',
  'Moradia',
  'Lazer',
  'Saúde',
  'Educação',
  'Salário',
  'Investimentos',
  'Compras',
  'Contas',
  'Outros',
];

export interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
  label?: string;
  defaultCategories?: string[];
  selectClassName?: string;
}

export function CategorySelect({
  value,
  onChange,
  label = 'Categoria',
  defaultCategories = DEFAULT_FINANCE_CATEGORIES,
  selectClassName,
}: CategorySelectProps) {
  const [customCategories, setCustomCategories] = useLocalStorage<string[]>(
    STORAGE_KEYS.FINANCE_CUSTOM_CATEGORIES,
    []
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Merge default categories, saved custom categories, and current value into a unique list
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    defaultCategories.forEach((c) => c && set.add(c.trim()));
    customCategories.forEach((c) => c && set.add(c.trim()));
    if (value && value.trim()) {
      set.add(value.trim());
    }
    return Array.from(set);
  }, [defaultCategories, customCategories, value]);

  const handleSaveNewCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      setIsCreating(false);
      return;
    }

    if (!customCategories.includes(trimmed) && !defaultCategories.includes(trimmed)) {
      setCustomCategories((prev) => [...prev, trimmed]);
    }
    onChange(trimmed);
    setNewCategoryInput('');
    setIsCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveNewCategory();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCreating(false);
      setNewCategoryInput('');
    }
  };

  return (
    <div>
      <label className="block text-xs text-dark-subtext mb-1">{label}</label>

      {isCreating ? (
        <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
          <input
            type="text"
            autoFocus
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nova categoria..."
            className="flex-1 bg-dark-bg border border-brand-500/50 rounded-lg px-2.5 py-1.5 text-xs text-dark-text focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleSaveNewCategory()}
            className="p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs transition-colors flex items-center justify-center shadow-sm"
            title="Salvar Categoria"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setNewCategoryInput('');
            }}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-dark-text rounded-lg text-xs transition-colors flex items-center justify-center"
            title="Cancelar"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <select
            value={value}
            onChange={(e) => {
              if (e.target.value === '__NEW__') {
                setIsCreating(true);
              } else {
                onChange(e.target.value);
              }
            }}
            style={{ colorScheme: 'dark' }}
            className={
              selectClassName ||
              'flex-1 bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]'
            }
          >
            {allCategories.map((cat) => (
              <option key={cat} value={cat} className="bg-dark-bg text-dark-text">
                {cat}
              </option>
            ))}
            <option value="__NEW__" className="bg-dark-bg text-brand-400 font-medium">
              + Nova Categoria...
            </option>
          </select>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="p-1.5 bg-dark-bg hover:bg-white/10 border border-white/10 rounded-lg text-brand-400 hover:text-brand-300 transition-colors flex items-center justify-center flex-shrink-0"
            title="Adicionar nova categoria"
          >
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
