import { Trash2, AlertTriangle } from 'lucide-react';

interface TrashHeaderProps {
  totalItems: number;
  onOpenEmptyConfirm: () => void;
}

export function TrashHeader({ totalItems, onOpenEmptyConfirm }: TrashHeaderProps) {
  return (
    <header className="flex justify-between items-center pb-6 border-b border-white/5 shrink-0">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trash2 className="w-8 h-8 text-red-500" />
          Lixeira Universal
        </h1>
        <p className="text-dark-subtext mt-2">
          Gerencie arquivos apagados de todos os módulos. Itens na lixeira podem ser restaurados ou excluídos permanentemente.
        </p>
      </div>
      <button 
        onClick={onOpenEmptyConfirm}
        disabled={totalItems === 0}
        className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        <AlertTriangle size={18} />
        Esvaziar Lixeira
      </button>
    </header>
  );
}
