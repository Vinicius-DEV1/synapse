import { FilePlus } from 'lucide-react';

interface EmptyStateProps {
  onCreatePage: () => void;
}

export default function EmptyState({ onCreatePage }: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center animate-fade-in px-4">
      <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mb-6">
        <FilePlus size={32} className="text-brand-400" />
      </div>
      <h2 className="text-xl font-semibold text-dark-text mb-2 text-center">
        Seu caderno está vazio
      </h2>
      <p className="text-dark-subtext text-center max-w-sm mb-8">
        Crie uma nova página para começar a fazer suas anotações e organizar suas ideias.
      </p>
      <button
        onClick={onCreatePage}
        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors active:scale-95 shadow-lg shadow-brand-500/20"
      >
        <PlusIcon /> Nova Página
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
