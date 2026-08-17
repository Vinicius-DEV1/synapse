import {
  Trash2,
  RefreshCcw,
  FileText,
  Layers,
  Folder,
  DollarSign,
  Lock,
  PlayCircle,
  Loader2,
  Music
} from 'lucide-react';
import type { TrashItem } from '../hooks/useTrash';

interface TrashTableProps {
  loading: boolean;
  items: TrashItem[];
  processingId: string | null;
  isEmptying: boolean;
  onRestore: (item: TrashItem) => void;
  onHardDelete: (item: TrashItem) => void;
}

export function TrashTable({
  loading,
  items,
  processingId,
  isEmptying,
  onRestore,
  onHardDelete
}: TrashTableProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'page': return <FileText className="text-blue-400" />;
      case 'anki_deck': return <Layers className="text-indigo-400" />;
      case 'anki_card': return <Layers className="text-purple-400" />;
      case 'file': return <Folder className="text-yellow-400" />;
      case 'finance': return <DollarSign className="text-emerald-400" />;
      case 'vault': return <Lock className="text-orange-400" />;
      case 'video': return <PlayCircle className="text-rose-400" />;
      case 'lofi': return <Music className="text-purple-400" />;
      default: return <FileText className="text-dark-subtext" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'page': return 'Nota';
      case 'anki_deck': return 'Baralho';
      case 'anki_card': return 'Flashcard';
      case 'file': return 'Arquivo';
      case 'finance': return 'Transação';
      case 'vault': return 'Cofre';
      case 'video': return 'Vídeo';
      case 'lofi': return 'Lofi';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-dark-card border border-white/5 rounded-2xl shadow-xl">
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-dark-subtext">
          <Loader2 size={32} className="animate-spin mb-4 text-brand-500" />
          <p>Carregando itens apagados...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-dark-subtext">
          <Trash2 size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">Lixeira Vazia</p>
          <p className="text-sm mt-1">Nenhum item apagado encontrado aqui.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-dark-card/95 backdrop-blur-md z-10 border-b border-white/10">
              <tr>
                <th className="py-4 px-6 text-xs font-semibold text-dark-subtext uppercase tracking-wider">Item</th>
                <th className="py-4 px-6 text-xs font-semibold text-dark-subtext uppercase tracking-wider w-32">Tipo</th>
                <th className="py-4 px-6 text-xs font-semibold text-dark-subtext uppercase tracking-wider w-48">Data de Exclusão</th>
                <th className="py-4 px-6 text-xs font-semibold text-dark-subtext uppercase tracking-wider w-40 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        {getIcon(item.item_type)}
                      </div>
                      <span className="font-medium text-white/90 truncate max-w-[300px] md:max-w-md" title={item.title}>
                        {item.title || 'Sem título'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 bg-white/5 rounded-md text-xs text-dark-subtext font-medium">
                      {getTypeLabel(item.item_type)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-dark-subtext">
                    {new Date(item.deleted_at).toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onRestore(item)}
                        disabled={processingId === item.id || isEmptying}
                        className="p-2 hover:bg-white/10 text-dark-subtext hover:text-white rounded-lg transition-colors"
                        title="Restaurar"
                      >
                        {processingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                      </button>
                      <button
                        onClick={() => onHardDelete(item)}
                        disabled={processingId === item.id || isEmptying}
                        className="p-2 hover:bg-red-500/10 text-dark-subtext hover:text-red-400 rounded-lg transition-colors"
                        title="Excluir Definitivamente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
