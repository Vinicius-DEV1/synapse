
const FILTER_TABS = [
  { id: 'all', label: 'Todos os Itens' },
  { id: 'notes', label: 'Notas' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'files', label: 'Arquivos' },
  { id: 'finance', label: 'Financeiro' },
  { id: 'vault', label: 'Cofre' },
  { id: 'lofi', label: 'Lofi' }
];

interface TrashFilterTabsProps {
  currentFilter: string;
  onSelectFilter: (filterId: string) => void;
}

export function TrashFilterTabs({ currentFilter, onSelectFilter }: TrashFilterTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
      {FILTER_TABS.map(f => (
        <button
          key={f.id}
          onClick={() => onSelectFilter(f.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            currentFilter === f.id ? 'bg-white/10 text-white' : 'text-dark-subtext hover:bg-white/5 hover:text-white'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
