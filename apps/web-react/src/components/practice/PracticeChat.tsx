import { useState, useEffect, lazy, Suspense } from 'react';
import { ChatTranscript } from './chat/ChatTranscript';
import { PracticeChatHeader } from './chat/PracticeChatHeader';
import { PracticeCallBar } from './chat/PracticeCallBar';
import { usePracticeData } from './hooks/usePracticeData';
import { useGeminiLiveSession } from './chat/hooks/useGeminiLiveSession';
import { useAudioVisualizer } from './chat/hooks/useAudioVisualizer';
import { usePushToTalk } from './chat/hooks/usePushToTalk';
import {
  usePracticePrompts,
  DEFAULT_SYSTEM_INSTRUCTION,
} from './chat/hooks/usePracticePrompts';
import type { TutorSession } from '../../types';
import { parseInterviewConfig } from '../../types';
import { isMobileScreen } from '../../services/platform';

const ChatSettingsModal = lazy(() =>
  import('./chat/ChatSettingsModal').then((m) => ({ default: m.ChatSettingsModal }))
);
const ChatSessionSettingsModal = lazy(() =>
  import('./chat/ChatSessionSettingsModal').then((m) => ({ default: m.ChatSessionSettingsModal }))
);
const MemoryDrawer = lazy(() =>
  import('./chat/MemoryDrawer').then((m) => ({ default: m.MemoryDrawer }))
);
const PracticeCallControls = lazy(() =>
  import('./chat/PracticeCallControls').then((m) => ({ default: m.PracticeCallControls }))
);
const InterviewFeedbackModal = lazy(() =>
  import('./chat/InterviewFeedbackModal').then((m) => ({ default: m.InterviewFeedbackModal }))
);

interface PracticeChatProps {
  session: TutorSession;
}

export default function PracticeChat({ session }: PracticeChatProps) {
  const { messages, memories, saveMessage, saveMemory, deleteMemory } = usePracticeData(session);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSessionSettingsOpen, setIsSessionSettingsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const interviewConfig = parseInterviewConfig(session);
  const isInterview = interviewConfig !== null;

  const {
    globalSystemPrompt,
    setGlobalSystemPrompt,
    customPrompt,
    setCustomPrompt,
    presets,
    saveGlobalPrompt,
    saveCustomPrompt,
    saveAsNewPreset,
  } = usePracticePrompts(session);

  const [aiVoice] = useState(localStorage.getItem('aiVoice') || 'Puck');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);

  // Detect mobile device capability
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileScreen());
    };

    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hook 1: Gemini Live Session (WebSocket, Audio playback, Tools)
  const {
    wsRef,
    playbackContextRef,
    playbackAnalyserRef,
    nextAudioTimeRef,
    isPlayingRef,
    isConnected,
    error,
    setError,
    connectWebSocket,
    disconnectWebSocket,
    previewingVoice,
    previewVoice,
    initPlayback,
  } = useGeminiLiveSession({
    session,
    globalSystemPrompt,
    aiVoice,
    memories,
    saveMessage,
    saveMemory,
    setLiveTranscript,
  });

  // Hook 2: Push to Talk & Mic capture (continuousMode in interview)
  const {
    isRecording,
    isRecordingRef,
    analyserRef,
    micLabel,
    micButtonRef,
    startAudioCapture,
    stopAudioCapture,
  } = usePushToTalk({
    isConnected,
    isInCall,
    isMobile,
    wsRef,
    saveMessage,
    setLiveTranscript,
    setError,
    continuousMode: isInterview,
    isPlayingRef,
  });

  // Hook 3: Audio Visualizer
  const { visualizerRefs, isPlaying } = useAudioVisualizer({
    isInCall,
    isPlayingRef,
    isRecordingRef,
    playbackAnalyserRef,
    analyserRef,
    playbackContextRef,
    nextAudioTimeRef,
  });

  const startCall = () => {
    setIsInCall(true);
    setCallStartTime(Date.now());
    // Trigger mic capture & playback context immediately on user gesture to avoid WebKit permission drop
    initPlayback?.();
    startAudioCapture();
    connectWebSocket();
  };

  const endCall = () => {
    setIsInCall(false);
    stopAudioCapture();
    disconnectWebSocket();

    if (callStartTime) {
      const durationMs = Date.now() - callStartTime;
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      const durationStr = `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;
      saveMessage('user', `[SISTEMA] 📞 Ligação encerrada (${durationStr})`);
    }
    setCallStartTime(null);
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg/80 relative">
      {/* Header */}
      <PracticeChatHeader
        session={session}
        isInCall={isInCall}
        isConnected={isConnected}
        memories={memories}
        onOpenSessionSettings={() => setIsSessionSettingsOpen(true)}
        onOpenVoiceSettings={() => setIsSettingsOpen(true)}
        onOpenMemoryDrawer={() => setIsMemoryOpen(true)}
        isInterview={isInterview}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
      />

      {/* Action Bar / Controls when not in active full modal */}
      <PracticeCallBar
        error={error}
        isInCall={isInCall}
        isMobile={isMobile}
        isRecording={isRecording}
        micButtonRef={micButtonRef as React.RefObject<HTMLButtonElement>}
        onStartCall={startCall}
        onEndCall={endCall}
        isInterview={isInterview}
      />

      {/* Messages Transcript */}
      <ChatTranscript messages={messages} />

      <Suspense fallback={null}>
        {/* Fullscreen Overlay Call UI */}
        {isInCall && (
          <PracticeCallControls
            session={session}
            isConnected={isConnected}
            isRecording={isRecording}
            isPlaying={isPlaying}
            micLabel={micLabel}
            error={error}
            liveTranscript={liveTranscript}
            visualizerRefs={visualizerRefs}
            onEndCall={endCall}
            interviewConfig={interviewConfig}
            playbackAnalyserRef={playbackAnalyserRef}
          />
        )}

        {/* Modal de Avaliação da Entrevista */}
        {isInterview && interviewConfig && isFeedbackOpen && (
          <InterviewFeedbackModal
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
            config={interviewConfig}
            messages={messages}
          />
        )}

        {/* Drawer de Memórias */}
        {isMemoryOpen && (
          <MemoryDrawer
            isOpen={isMemoryOpen}
            onClose={() => setIsMemoryOpen(false)}
            memories={memories}
            onDeleteMemory={deleteMemory}
          />
        )}

        {/* Modal de Configurações de Voz */}
        {isSettingsOpen && (
          <ChatSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            globalSystemPrompt={globalSystemPrompt}
            setGlobalSystemPrompt={setGlobalSystemPrompt}
            saveGlobalPrompt={saveGlobalPrompt}
            defaultSystemInstruction={DEFAULT_SYSTEM_INSTRUCTION}
            previewVoice={previewVoice}
            previewingVoice={previewingVoice}
          />
        )}

        {/* Modal de Configurações da Sessão Atual */}
        {isSessionSettingsOpen && (
          <ChatSessionSettingsModal
            isOpen={isSessionSettingsOpen}
            onClose={() => setIsSessionSettingsOpen(false)}
            session={session}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            saveCustomPrompt={saveCustomPrompt}
            presets={presets}
            saveAsNewPreset={saveAsNewPreset}
          />
        )}
      </Suspense>
    </div>
  );
}
