import React from 'react';
import { QuestionsDashboard } from './QuestionsDashboard';
import { QuestionsExplorer } from './QuestionsExplorer';
import { QuestionsPlaylists } from './QuestionsPlaylists';
import type { BatteryWithQuestions, QuizStats } from '../../types/quiz';
import type { GeneratedStudySession } from '../../services/quiz/quizSimulator';

interface QuestionsMainContentProps {
  isLoading: boolean;
  batteries: BatteryWithQuestions[];
  stats: QuizStats;
  activeTabSection: 'explorer' | 'dashboard' | 'playlists';
  allAvailableTags: string[];
  highlightedBatteryId?: string;
  onPlayBattery: (battery: BatteryWithQuestions) => void;
  onEditBattery: (battery: BatteryWithQuestions) => void;
  onDeleteBattery: (batteryId: string) => void;
  onNavigateToPage: (pageId: string) => void;
  getPageTitle: (pageId: string) => string | null;
  onCreateSubgroup: (parentBatteryId: string) => void;
  onMoveBattery: (batteryId: string, newParentId: string | null) => Promise<void>;
  onSelectTabSection: (section: 'explorer' | 'dashboard' | 'playlists') => void;
  onCreateBattery: () => void;
  onStartSession: (session: GeneratedStudySession) => void;
}

export const QuestionsMainContent = React.memo(function QuestionsMainContent({
  isLoading,
  batteries,
  stats,
  activeTabSection,
  allAvailableTags,
  highlightedBatteryId,
  onPlayBattery,
  onEditBattery,
  onDeleteBattery,
  onNavigateToPage,
  getPageTitle,
  onCreateSubgroup,
  onMoveBattery,
  onSelectTabSection,
  onCreateBattery,
  onStartSession,
}: QuestionsMainContentProps) {
  if (isLoading && batteries.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-500">
        <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin" />
        <p className="text-xs font-medium">Carregando questões...</p>
      </div>
    );
  }

  return (
    <>
      {activeTabSection === 'explorer' && (
        <QuestionsExplorer
          batteries={batteries}
          onPlayBattery={onPlayBattery}
          onEditBattery={onEditBattery}
          onDeleteBattery={onDeleteBattery}
          onNavigateToPage={onNavigateToPage}
          allAvailableTags={allAvailableTags}
          getPageTitle={getPageTitle}
          highlightedBatteryId={highlightedBatteryId}
          onCreateSubgroup={onCreateSubgroup}
          onMoveBattery={onMoveBattery}
        />
      )}

      {activeTabSection === 'dashboard' && (
        <QuestionsDashboard
          stats={stats}
          onLaunchErrorNotebook={() => onSelectTabSection('playlists')}
          onLaunchQuickSimulation={() => onSelectTabSection('playlists')}
          onCreateBattery={onCreateBattery}
        />
      )}

      {activeTabSection === 'playlists' && (
        <QuestionsPlaylists
          onStartSession={onStartSession}
          availableTags={allAvailableTags}
          errorCount={stats.incorrectAnswers}
        />
      )}
    </>
  );
});
