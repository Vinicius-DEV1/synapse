import React from 'react';
import { useFocusContext } from '../../store/FocusContext';
import AlarmTriggerModal from './AlarmTriggerModal';
import SuccessModal from './SuccessModal';
import { GlobalLofiPlayer } from './GlobalLofiPlayer';

export default function GlobalFocusOverlays() {
  const { 
    triggeredAlarm, 
    setTriggeredAlarm, 
    view, 
    setView, 
    currentSession,
    setCurrentSession,
    handleSaveSuccess,
    handleAddTimeFromSuccess
  } = useFocusContext();

  return (
    <>
      {triggeredAlarm && (
        <AlarmTriggerModal
          alarm={triggeredAlarm}
          onDismiss={() => setTriggeredAlarm(null)}
        />
      )}

      {view === 'success' && currentSession && (
        <SuccessModal 
          session={currentSession as any} 
          onSave={handleSaveSuccess} 
          onAddMoreTime={handleAddTimeFromSuccess}
          onDiscard={() => {
            setView('dashboard');
            setCurrentSession(null);
          }}
        />
      )}
      
      <GlobalLofiPlayer />
    </>
  );
}
