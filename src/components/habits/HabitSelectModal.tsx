import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Flame, Plus, Search, X, Check } from 'lucide-react';
import type { Habit } from '../../types/habits';
import { playUiClickSound } from '../../utils/uiSounds';

export interface HabitSelectModalProps {
  isOpen: boolean;
  initialQuery?: string;
  onSelect: (habit: Habit) => void;
  onClose: () => void;
}

export const HabitSelectModal: React.FC<HabitSelectModalProps> = ({
  isOpen,
  initialQuery = '',
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setQuery(initialQuery);
    const loadHabits = async () => {
      if (!window.api?.habits) return;
      try {
        setLoading(true);
        const list = await window.api.habits.getHabits();
        setHabits(list);
      } catch (err) {
        console.error('Failed to load habits in select modal:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHabits();
  }, [isOpen, initialQuery]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredHabits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return habits;
    return habits.filter((h) => h.title.toLowerCase().includes(q));
  }, [habits, query]);

  const canCreate = useMemo(() => {
    const q = query.trim();
    if (!q) return false;
    return !habits.some((h) => h.title.toLowerCase() === q.toLowerCase());
  }, [habits, query]);

  // Options list: filtered existing habits + optional create action
  const options = useMemo(() => {
    const list: { type: 'existing' | 'create'; habit?: Habit; title: string }[] = [];
    filteredHabits.forEach((h) => {
      list.push({ type: 'existing', habit: h, title: h.title });
    });
    if (canCreate) {
      list.push({ type: 'create', title: query.trim() });
    }
    return list;
  }, [filteredHabits, canCreate, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [options.length]);

  const handleConfirmSelect = async (index: number) => {
    const option = options[index];
    if (!option) return;

    playUiClickSound();

    if (option.type === 'existing' && option.habit) {
      onSelect(option.habit);
      onClose();
      return;
    }

    if (option.type === 'create') {
      if (!window.api?.habits || creating) return;
      try {
        setCreating(true);
        const newHabit = await window.api.habits.createHabit({
          title: option.title,
          color: 'emerald',
        });
        onSelect(newHabit);
        onClose();
      } catch (err) {
        console.error('Failed to create new habit:', err);
      } finally {
        setCreating(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, options.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + options.length) % Math.max(1, options.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmSelect(selectedIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (!e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '9') {
      const idx = Number(e.key) - 1;
      if (options[idx]) {
        e.preventDefault();
        handleConfirmSelect(idx);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vincular ou Criar Hábito"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search size={18} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pesquisar ou criar hábito..."
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Carregando hábitos...
            </div>
          ) : options.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Nenhum hábito cadastrado. Digite um nome para criar.
            </div>
          ) : (
            options.map((opt, idx) => {
              const isSelected = idx === selectedIndex;
              const isExisting = opt.type === 'existing';

              return (
                <button
                  key={isExisting && opt.habit ? opt.habit.id : `create-${opt.title}`}
                  type="button"
                  onClick={() => handleConfirmSelect(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
                      : 'hover:bg-white/[0.04] text-zinc-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {isExisting ? (
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                        <Flame size={14} />
                      </span>
                    ) : (
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                        <Plus size={14} />
                      </span>
                    )}

                    <div className="flex flex-col truncate">
                      <span className="text-sm font-medium truncate">
                        {isExisting ? opt.title : `Criar novo hábito: "${opt.title}"`}
                      </span>
                      {isExisting && (
                        <span className="text-[11px] text-zinc-500">
                          Hábito vinculado existente
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {idx < 9 && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-800 rounded border border-white/[0.08]">
                        {idx + 1}
                      </kbd>
                    )}
                    {isSelected && (
                      <Check size={14} className="text-emerald-400" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/60 border-t border-white/[0.04] text-[11px] text-zinc-500">
          <span>
            Navegue com <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">↑</kbd>{' '}
            <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">↓</kbd> e pressione{' '}
            <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">Enter</kbd>
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">Esc</kbd> para fechar
          </span>
        </div>
      </div>
    </div>
  );
};

export default HabitSelectModal;
