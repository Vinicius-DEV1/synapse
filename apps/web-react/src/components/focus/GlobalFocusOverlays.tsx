import { useFocusContext } from '../../store/FocusContext';
import AlarmTriggerModal from './AlarmTriggerModal';
import SuccessModal from './SuccessModal';
import CancelModal from './CancelModal';
import { GlobalLofiPlayer } from './GlobalLofiPlayer';
import type { Session } from './types';

export default function GlobalFocusOverlays() {
  const { 
    triggeredAlarm, 
    setTriggeredAlarm, 
    view, 
    setView, 
    currentSession,
    setCurrentSession,
    handleSaveSuccess,
    handleAddTimeFromSuccess,
    handleSaveCancel
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
          session={currentSession as Session}
          onSave={handleSaveSuccess}
          onAddMoreTime={handleAddTimeFromSuccess}
          onCancel={() => {
            if (currentSession && window.api) {
              window.dispatchEvent(new CustomEvent('caderno-focus-ended', { detail: { id: currentSession.id, status: 'cancelled' } }));
            }
            setView('dashboard');
            setCurrentSession(null);
          }}
        />
      )}

      {view === 'cancel' && (
        <CancelModal
          onSave={handleSaveCancel}
        />
      )}
      
      <GlobalLofiPlayer />
    </>
  );
}
