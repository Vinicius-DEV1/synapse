import React from 'react';
import { Pin, Clock, ChevronRight } from 'lucide-react';
import type { Page } from '../../../types/core';

interface HomePagesSectionProps {
  pinnedPages: Page[];
  recentPages: Page[];
  onOpenPage: (pageId: string) => void;
}

export function HomePagesSection({
  pinnedPages,
  recentPages,
  onOpenPage
}: HomePagesSectionProps) {
  const formatRelativeDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  return (
    <>
      {/* Recent Pages */}
      {recentPages.length > 0 && (
        <div className="bg-dark-card border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400">
              <Clock size={20} />
            </div>
            <h2 className="text-lg font-semibold text-white">Recentes</h2>
          </div>
          <div className="space-y-2">
            {recentPages.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpenPage(p.id)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-colors group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-lg">{p.icon || '📄'}</span>
                  <span className="text-sm font-medium text-white/90 truncate group-hover:text-brand-300 transition-colors">
                    {p.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-dark-subtext opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatRelativeDate(p.updated_at)}
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-dark-subtext opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pinned Pages */}
      <div className="bg-dark-card border border-white/5 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
            <Pin size={20} />
          </div>
          <h2 className="text-lg font-semibold text-white">Fixados</h2>
        </div>

        {pinnedPages.length === 0 ? (
          <div className="py-6 text-center text-dark-subtext text-sm">
            <p>Nenhuma página fixada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pinnedPages.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpenPage(p.id)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-colors group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-lg">{p.icon || '📄'}</span>
                  <span className="text-sm font-medium text-white/90 truncate group-hover:text-brand-300 transition-colors">
                    {p.title}
                  </span>
                </div>
                <ChevronRight
                  size={16}
                  className="text-dark-subtext opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
