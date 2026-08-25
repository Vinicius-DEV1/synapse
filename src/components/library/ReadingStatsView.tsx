import { useState, useEffect, useMemo } from 'react';
import {
  X, BookCheck, FileText, Clock, Flame, Trophy, Calendar,
  TrendingUp, Loader2
} from 'lucide-react';
import { Portal } from '../ui/Portal';
import type { LibraryBook, GlobalReadingStats } from '../../types';

interface ReadingStatsViewProps {
  onClose: () => void;
}

function ReadingStatsViewContent({ onClose }: ReadingStatsViewProps) {
  const [stats, setStats] = useState<GlobalReadingStats | null>(null);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!window.api?.library) return;
    try {
      setLoading(true);
      const [statsData, booksData] = await Promise.all([
        window.api.library.getReadingStats(),
        window.api.library.getBooks(),
      ]);
      setStats(statsData.globalStats);
      setBooks(booksData);
    } catch (err) {
      console.error('Failed to load reading stats', err);
    } finally {
      setLoading(false);
    }
  };

  // Books in progress
  const booksInProgress = useMemo(
    () => books.filter((b) => b.reading_status === 'reading'),
    [books]
  );

  // Last 30 days heatmap data
  const heatmapDays = useMemo(() => {
    if (!stats) return [];

    const readingDaySet = new Set(
      stats.readingDays.map((d) => new Date(d).toISOString().split('T')[0])
    );

    const days: { date: string; active: boolean }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, active: readingDaySet.has(dateStr) });
    }
    return days;
  }, [stats]);

  // Format time
  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const getProgress = (book: LibraryBook): number => {
    if (!book.total_pages || book.total_pages === 0) return 0;
    let page = (book as any).current_page || 0;
    if (typeof book.last_read_page === 'number') {
      page = book.last_read_page;
    } else if (typeof book.last_read_page === 'string' && !(book.last_read_page as any).includes('epubcfi')) {
      const parsed = parseInt(book.last_read_page, 10);
      if (!isNaN(parsed)) page = parsed;
    }
    if (!page || page <= 0) return 0;
    return Math.min(100, Math.round((page / book.total_pages) * 100));
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-scale-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10">
              <TrendingUp size={20} className="text-brand-400" />
            </div>
            <h2 className="text-lg font-semibold text-dark-text">
              Estatísticas de Leitura
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="text-brand-400 animate-spin" />
            </div>
          ) : !stats ? (
            <div className="text-center text-dark-subtext py-20">
              Nenhum dado de leitura encontrado.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  icon={<BookCheck size={20} />}
                  label="Livros concluídos"
                  value={String(stats.totalBooksFinished)}
                  color="text-emerald-400"
                  bgColor="bg-emerald-500/10"
                />
                <SummaryCard
                  icon={<FileText size={20} />}
                  label="Páginas lidas"
                  value={stats.totalPagesRead.toLocaleString('pt-BR')}
                  color="text-blue-400"
                  bgColor="bg-blue-500/10"
                />
                <SummaryCard
                  icon={<Clock size={20} />}
                  label="Tempo de leitura"
                  value={formatTime(stats.totalTimeMinutes)}
                  color="text-amber-400"
                  bgColor="bg-amber-500/10"
                />
                <SummaryCard
                  icon={<Flame size={20} />}
                  label="Sequência atual"
                  value={`${stats.currentStreak} 🔥`}
                  color="text-orange-400"
                  bgColor="bg-orange-500/10"
                />
              </div>

              {/* Heatmap */}
              <div className="bg-dark-bg rounded-xl border border-white/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-dark-subtext" />
                  <h3 className="text-sm font-medium text-dark-text">
                    Últimos 30 dias
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {heatmapDays.map((day) => (
                    <div
                      key={day.date}
                      className="group relative"
                    >
                      <div
                        className={`w-6 h-6 rounded-md transition-all ${
                          day.active
                            ? 'bg-brand-500 shadow-sm shadow-brand-500/30'
                            : 'bg-white/5'
                        }`}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-dark-card border border-white/10 rounded text-[10px] text-dark-subtext whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                        {day.active ? ' — leu' : ' — não leu'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 mt-3">
                  <span className="text-[10px] text-dark-subtext">Menos</span>
                  <div className="w-4 h-4 rounded-sm bg-white/5" />
                  <div className="w-4 h-4 rounded-sm bg-brand-500/40" />
                  <div className="w-4 h-4 rounded-sm bg-brand-500" />
                  <span className="text-[10px] text-dark-subtext">Mais</span>
                </div>
              </div>

              {/* Books in Progress */}
              {booksInProgress.length > 0 && (
                <div className="bg-dark-bg rounded-xl border border-white/5 p-4">
                  <h3 className="text-sm font-medium text-dark-text mb-3 flex items-center gap-2">
                    <BookCheck size={16} className="text-brand-400" />
                    Lendo agora
                  </h3>
                  <div className="flex flex-col gap-3">
                    {booksInProgress.map((book) => {
                      const progress = getProgress(book);
                      return (
                        <div
                          key={book.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/3 transition-colors"
                        >
                          {/* Mini cover */}
                          <div className="w-8 h-11 rounded flex-shrink-0 overflow-hidden bg-brand-500/20">
                            {book.cover_image ? (
                              <img
                                src={book.cover_image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText size={14} className="text-brand-400/50" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-dark-text truncate font-medium">
                              {book.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-400 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-dark-subtext flex-shrink-0">
                                {progress}%
                              </span>
                            </div>
                          </div>

                          <span className="text-xs text-dark-subtext flex-shrink-0">
                            p.{book.last_read_page}/{book.total_pages}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Records */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-dark-bg rounded-xl border border-white/5 p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Trophy size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-dark-subtext">Maior sequência</p>
                    <p className="text-lg font-semibold text-dark-text">
                      {stats.longestStreak} {stats.longestStreak === 1 ? 'dia' : 'dias'}
                    </p>
                  </div>
                </div>
                <div className="bg-dark-bg rounded-xl border border-white/5 p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <TrendingUp size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-dark-subtext">Livros iniciados</p>
                    <p className="text-lg font-semibold text-dark-text">
                      {stats.totalBooksStarted}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReadingStatsView(props: ReadingStatsViewProps) {
  return (
    <Portal>
      <ReadingStatsViewContent {...props} />
    </Portal>
  );
}

// --- Helper Component ---
function SummaryCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-dark-bg rounded-xl border border-white/5 p-4 flex flex-col gap-2">
      <div className={`p-2 rounded-lg ${bgColor} w-fit`}>
        <span className={color}>{icon}</span>
      </div>
      <span className="text-xl font-bold text-dark-text">{value}</span>
      <span className="text-[11px] text-dark-subtext">{label}</span>
    </div>
  );
}
