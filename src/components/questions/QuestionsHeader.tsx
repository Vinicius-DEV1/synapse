import React, { useState } from 'react';
import { CheckSquare, LayoutDashboard, Compass, Sparkles, Plus, HelpCircle } from 'lucide-react';
import { QuestionsHelpModal } from './QuestionsHelpModal';
import { useI18n } from '../../i18n';

interface QuestionsHeaderProps {
  totalQuestions: number;
  activeTabSection: 'explorer' | 'dashboard' | 'playlists';
  onSelectTabSection: (section: 'explorer' | 'dashboard' | 'playlists') => void;
  onNewBattery: () => void;
}

export const QuestionsHeader = React.memo(function QuestionsHeader({
  totalQuestions,
  activeTabSection,
  onSelectTabSection,
  onNewBattery,
}: QuestionsHeaderProps) {
  const { t } = useI18n();
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <>
      {/* Top Header (Scrolls away) */}
      <header className="px-5 md:px-8 pt-8 pb-6 flex flex-wrap items-end justify-between gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-xs">
            <CheckSquare size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">{t('questions.header.title')}</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-400">
                {totalQuestions === 1 ? t('questions.header.count', { count: 1 }) : t('questions.header.countPlural', { count: totalQuestions })}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              {t('questions.header.subtitle')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          title={t('questions.header.guideTitle')}
          aria-label={t('questions.header.guideTitle')}
        >
          <HelpCircle size={15} />
          <span>{t('questions.header.guide')}</span>
        </button>
      </header>

      {/* Action Controls (Sticky) */}
      <div className="sticky top-0 z-20 px-5 md:px-8 py-3 bg-dark-bg/95 backdrop-blur-md border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
        {/* Section Switcher Tabs */}
        <div className="flex items-center bg-dark-card/50 p-1 rounded-xl border border-white/5 text-xs">
          <button
            onClick={() => onSelectTabSection('explorer')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTabSection === 'explorer'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-medium shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass size={14} />
            <span>{t('questions.header.tabs.explorer')}</span>
          </button>

          <button
            onClick={() => onSelectTabSection('dashboard')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTabSection === 'dashboard'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-medium shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>{t('questions.header.tabs.dashboard')}</span>
          </button>

          <button
            onClick={() => onSelectTabSection('playlists')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTabSection === 'playlists'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-medium shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>{t('questions.header.tabs.playlists')}</span>
          </button>
        </div>

        {/* New Battery Button */}
        <button
          onClick={onNewBattery}
          className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Plus size={15} />
          <span>{t('questions.header.newBattery')}</span>
        </button>
      </div>

      {showHelpModal && (
        <QuestionsHelpModal onClose={() => setShowHelpModal(false)} />
      )}
    </>
  );
});
