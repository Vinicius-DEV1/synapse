import React from 'react';
import { useStore } from '../../store/useStore';
import { useHomeDashboard } from './hooks/useHomeDashboard';
import { HomeQuickActions } from './ui/HomeQuickActions';
import { HomeAgendaSection } from './ui/HomeAgendaSection';
import { HomePagesSection } from './ui/HomePagesSection';

export default function HomeView({ tabId }: { tabId: string }) {
  const { state, dispatch } = useStore();
  const {
    greeting,
    todayEvents,
    tomorrowEvents,
    isEventLive
  } = useHomeDashboard();

  const pinnedPages = state.pages
    .filter((p) => p.is_pinned)
    .sort((a, b) => (a.pinned_order || 0) - (b.pinned_order || 0));

  const pinnedIds = new Set(pinnedPages.map((p) => p.id));
  const recentPages = [...state.pages]
    .filter((p) => !pinnedIds.has(p.id) && p.title && p.title !== 'Nova Página')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const handleOpenPage = (pageId: string) => {
    dispatch({ type: 'UPDATE_TAB_MODULE', tabId, module: 'notes' });
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId, tabId });
  };

  const handleNewPage = async () => {
    if (!window.api) return;
    try {
      const page = await window.api.createPage({ parentId: null });
      dispatch({ type: 'ADD_PAGE', page });
      dispatch({ type: 'UPDATE_TAB_MODULE', tabId, module: 'notes' });
      dispatch({ type: 'NAVIGATE_IN_TAB', pageId: page.id, tabId });
    } catch (e) {
      console.error('Erro ao criar página:', e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-dark-bg p-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{greeting}!</h1>
            <p className="text-dark-subtext">
              Hoje é{' '}
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <HomeQuickActions
          onNewPage={handleNewPage}
          onOpenCalendar={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId, module: 'calendar' })}
          onOpenAnki={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId, module: 'anki' })}
          onOpenFiles={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId, module: 'files' })}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column - Agenda */}
          <div className="lg:col-span-2">
            <HomeAgendaSection
              todayEvents={todayEvents}
              tomorrowEvents={tomorrowEvents}
              isEventLive={isEventLive}
              onOpenPage={handleOpenPage}
            />
          </div>

          {/* Side Column - Pages */}
          <div className="space-y-6">
            <HomePagesSection
              pinnedPages={pinnedPages}
              recentPages={recentPages}
              onOpenPage={handleOpenPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
