import React from 'react';
import Dashboard from './Dashboard';
import SetupModal from './SetupModal';
import ActiveTimer from './ActiveTimer';
import CancelModal from './CancelModal';
import SettingsModal from './SettingsModal';
import AlarmsList from './AlarmsList';
import AlarmSetupModal from './AlarmSetupModal';
import { LofiView } from './LofiView';
import { useFocusContext } from '../../store/FocusContext';

export default function FocusApp() {
  const {
    view, setView, sessions, alarms, currentSession, setCurrentSession, resumeMinutes,
    triggeredAlarm, setTriggeredAlarm, showAlarmSetup, setShowAlarmSetup,
    toastMessage, loadData, handleStartSetup, handleStartTimer,
    handleAddTimeFromSuccess, handleDeleteSession, handleSaveAlarm,
    handleToggleAlarm, handleDeleteAlarm, handleSaveSuccess,
    handleSaveCancel, handleAbortSetup
  } = useFocusContext();

  const uniqueTags = Array.from(new Set(sessions.map(s => s.tag)));

  return (
    <div className="w-full h-full flex flex-col bg-dark-bg text-dark-text overflow-y-auto overflow-x-hidden relative">
      {view === 'dashboard' && (
        <Dashboard 
          sessions={sessions} 
          onStart={handleStartSetup} 
          onOpenSettings={() => setView('settings')} 
          onOpenAlarms={() => setView('alarms')} 
          onOpenLofi={() => setView('lofi')}
          onDeleteSession={handleDeleteSession} 
        />
      )}
      {view === 'lofi' && (
        <LofiView />
      )}
      {view === 'alarms' && (
        <AlarmsList 
          alarms={alarms} 
          onBack={() => setView('dashboard')} 
          onNew={() => setShowAlarmSetup(true)}
          onToggle={handleToggleAlarm}
          onDelete={handleDeleteAlarm}
        />
      )}
      {view === 'settings' && (
        <SettingsModal onClose={() => setView('dashboard')} onRefresh={loadData} />
      )}
      {view === 'setup' && (
        <SetupModal onStart={handleStartTimer} onCancel={handleAbortSetup} existingTags={uniqueTags} />
      )}
      {view === 'timer' && currentSession && (
        <ActiveTimer />
      )}
      {view === 'cancel' && (
        <CancelModal 
          onSave={handleSaveCancel} 
          onDiscard={() => {
            setView('dashboard');
            setCurrentSession(null);
          }}
          onBack={() => setView('timer')} 
        />
      )}

      {showAlarmSetup && (
        <AlarmSetupModal
          onClose={() => setShowAlarmSetup(false)}
          onSave={handleSaveAlarm}
        />
      )}

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-500 text-dark-bg px-6 py-3 rounded-full font-bold shadow-xl shadow-brand-500/20 z-50 animate-in fade-in slide-in-from-bottom-5 pointer-events-none text-sm sm:text-base">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
