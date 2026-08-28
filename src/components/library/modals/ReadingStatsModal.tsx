import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookCheck,
  FileText,
  Clock,
  Flame,
  Trophy,
  Calendar,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Modal } from '../../ui/Modal';
import type { LibraryBook, GlobalReadingStats } from '../../../types';

export interface ReadingStatsModalProps {
  onClose: () => void;
}

export function ReadingStatsModal({ onClose }: ReadingStatsModalProps) {
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

  // Reading streak
  const streak = useMemo(() => {
    if (!stats || stats.readingDays.length === 0) return 0;

    const daySet = new Set(
      stats.readingDays.map((d) => new Date(d).toISOString().split('T')[0])
    );

    let currentStreak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // If read today, start with 1, otherwise check yesterday
    const startOffset = daySet.has(todayStr) ? 0 : 1;

    for (let i = startOffset; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (daySet.has(dateStr)) {
        currentStreak++;
      } else {
        break;
      }
    }

    return currentStreak;
  }, [stats]);

  const formatReadingTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const getProgress = (book: LibraryBook) => {
    if (!book.total_pages || book.total_pages <= 0) return 0;
    let page = (book as any).current_page || 1;
    if (typeof book.last_read_page === 'number') page = book.last_read_page;
    else if (
      typeof book.last_read_page === 'string' &&
      !book.last_read_page.includes('epubcfi')
    ) {
      const parsed = parseInt(book.last_read_page, 10);
      if (!isNaN(parsed) && parsed > 0) page = parsed;
    }
    if (!page || page <= 0) return 0;
    return Math.min(100, Math.round((page / book.total_pages) * 100));
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      zIndexClassName="z-50"
      containerClassName="w-full max-w-2xl max-h-[85vh] flex flex-col"
    >
      <div className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl w-full max-h-[85vh] overflow-hidden animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10">
              <TrendingUp size={20} className="text-brand-400" />
            </div>
            <h2 className="text-lg font-semibold text-dark-text">Estatísticas de Leitura</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors"
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
                  label="Tempo total"
                  value={formatReadingTime(stats.totalTimeSpent)}
                  color="text-purple-400"
                  bgColor="bg-purple-500/10"
                />
                <SummaryCard
                  icon={<Flame size={20} />}
                  label="Sequência atual"
                  value={`${streak} dias`}
                  color="text-amber-400"
                  bgColor="bg-amber-500/10"
                />
              </div>

              {/* Reading Heatmap */}
              <div className="bg-dark-bg rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-brand-400" />
                    <span className="text-xs font-semibold text-dark-text">
                      Atividade nos últimos 30 dias
                    </span>
                  </div>
                  <span className="text-[11px] text-dark-subtext">
                    {heatmapDays.filter((d) => d.active).length} dias ativos
                  </span>
                </div>

                <div className="grid grid-cols-10 sm:grid-cols-15 gap-1.5 justify-items-center">
                  {heatmapDays.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date}: ${day.active ? 'Leu' : 'Sem leitura'}`}
                      className={`w-4 h-4 rounded-sm transition-colors ${
                        day.active
                          ? 'bg-brand-500 shadow-sm shadow-brand-500/30'
                          : 'bg-white/5 border border-white/5'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Books in Progress */}
              {booksInProgress.length > 0 && (
                <div className="bg-dark-bg rounded-xl border border-white/5 p-4">
                  <h3 className="text-xs font-semibold text-dark-text mb-3">
                    Lendo atualmente ({booksInProgress.length})
                  </h3>
                  <div className="flex flex-col gap-3">
                    {booksInProgress.map((book) => {
                      const pct = getProgress(book);
                      return (
                        <div key={book.id} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-dark-text truncate max-w-[70%]">
                              {book.title}
                            </span>
                            <span className="text-dark-subtext">{pct}%</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-brand-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Highlights & Notes Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-dark-bg rounded-xl border border-white/5 p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-400">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] text-dark-subtext">Total de Destaques</p>
                    <p className="text-lg font-semibold text-dark-text">
                      {stats.totalHighlights}
                    </p>
                  </div>
                </div>

                <div className="bg-dark-bg rounded-xl border border-white/5 p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <BookCheck size={18} />
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
    </Modal>
  );
}

export default ReadingStatsModal;

// Helper component for summary statistic tiles
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
