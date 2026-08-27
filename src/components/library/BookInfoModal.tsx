import { X, Cloud, HardDrive, BookOpen, Clock, FileText, Info, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { LibraryBook } from '../../types';
import { Portal } from '../ui/Portal';

interface BookInfoModalProps {
  book: LibraryBook;
  onClose: () => void;
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const formatStatus = (status: string) => {
  switch (status) {
    case 'not_started': return 'Não Iniciado';
    case 'reading': return 'Lendo';
    case 'finished': return 'Concluído';
    default: return 'Desconhecido';
  }
};

export default function BookInfoModal({ book, onClose }: BookInfoModalProps) {
  const isCloudSynced = !!book.drive_file_id;
  
  return (
    <Portal>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-2xl bg-dark-bg border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-500/10 rounded-xl">
                <Info size={20} className="text-brand-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Informações do Livro</h2>
                <p className="text-xs text-dark-subtext truncate max-w-sm">{book.title}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-dark-subtext hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
            
            {/* Sync & Storage Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-dark-card border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white mb-1">
                  <Cloud size={16} className="text-blue-400" />
                  Status na Nuvem
                </div>
                {isCloudSynced ? (
                  <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-3 py-2 rounded-lg text-sm">
                    <CheckCircle2 size={16} />
                    <span>Sincronizado no Drive</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg text-sm">
                    <AlertCircle size={16} />
                    <span>Pendente de Upload (Apenas Local)</span>
                  </div>
                )}
                {book.drive_file_id && (
                  <div className="text-xs text-dark-subtext font-mono truncate" title={book.drive_file_id}>
                    ID: {book.drive_file_id}
                  </div>
                )}
              </div>

              <div className="bg-dark-card border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white mb-1">
                  <HardDrive size={16} className="text-emerald-400" />
                  Arquivo Local
                </div>
                <div className="flex items-center gap-2 text-dark-subtext px-3 py-2 bg-black/20 rounded-lg text-sm">
                  <FileText size={16} />
                  <span className="truncate" title={book.original_name || book.title}>{book.original_name || 'Desconhecido'}</span>
                </div>
                {book.file_path && (
                  <div className="text-xs text-dark-subtext font-mono truncate" title={book.file_path}>
                    Path: {book.file_path}
                  </div>
                )}
              </div>
            </div>

            {/* Reading Stats */}
            <div className="bg-dark-card border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-white mb-4">
                <BookOpen size={16} className="text-purple-400" />
                Progresso de Leitura
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark-subtext">Status</span>
                  <span className="text-sm text-white font-medium">{formatStatus(book.reading_status)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark-subtext">Página Atual</span>
                  <span className="text-sm text-white font-medium">{book.last_read_page || 1} / {book.total_pages || '?'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark-subtext">Última Leitura</span>
                  <span className="text-sm text-white font-medium">{formatDate(book.last_read_at)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark-subtext">Progresso</span>
                  <span className="text-sm text-white font-medium">
                    {book.total_pages ? Math.round(((book.last_read_page || 1) / book.total_pages) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-dark-card border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-white mb-4">
                <Tag size={16} className="text-brand-400" />
                Metadados
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark-subtext">Autor</span>
                  <span className="text-sm text-white">{book.author || 'Desconhecido'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark-subtext">Editora</span>
                  <span className="text-sm text-white">{book.publisher || 'Não informada'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark-subtext">Ano de Publicação</span>
                  <span className="text-sm text-white">{book.published_year || 'Não informado'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark-subtext">Idioma</span>
                  <span className="text-sm text-white">{book.language || 'Não informado'}</span>
                </div>
                {book.collections && book.collections.length > 0 && (
                  <div className="flex flex-col gap-1 col-span-2 mt-2">
                    <span className="text-xs text-dark-subtext">Coleções</span>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {book.collections.map(col => (
                        <span key={col.id} className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: `${col.color}20`, color: col.color }}>
                          {col.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* System Info */}
            <div className="bg-dark-card border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-white mb-4">
                <Clock size={16} className="text-gray-400" />
                Sistema
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark-subtext">Adicionado em</span>
                  <span className="text-sm text-white">{formatDate(book.created_at)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark-subtext">Última modificação</span>
                  <span className="text-sm text-white">{formatDate(book.updated_at)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark-subtext">ID Interno</span>
                  <span className="text-xs text-dark-subtext font-mono truncate" title={book.id}>{book.id}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Portal>
  );
}
