import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, PhoneOff, AlertCircle } from 'lucide-react';
import { MicTestWidget } from './chat/MicTestWidget';
import { ChatSettingsModal } from './chat/ChatSettingsModal';
import { ChatSessionSettingsModal } from './chat/ChatSessionSettingsModal';
import { ChatTranscript } from './chat/ChatTranscript';
import { MemoryDrawer } from './chat/MemoryDrawer';
import { PracticeChatHeader } from './chat/PracticeChatHeader';
import { PracticeCallControls } from './chat/PracticeCallControls';
import { usePracticeData } from './hooks/usePracticeData';
import { useGeminiLiveSession } from './chat/hooks/useGeminiLiveSession';
import { useAudioVisualizer } from './chat/hooks/useAudioVisualizer';
import { usePushToTalk } from './chat/hooks/usePushToTalk';
import type { TutorSession } from '../../types';

const DEFAULT_SYSTEM_INSTRUCTION = `Você é um amigo humano próximo do usuário.
Fale SEMPRE e APENAS em Português do Brasil (pt-BR).
Sua linguagem deve ser muito acolhedora e natural, com sotaque brasileiro.
Inicie a conversa perguntando de forma casual se o usuário está conseguindo te ouvir perfeitamente.`;

interface PracticeChatProps {
  session: TutorSession;
}

export default function PracticeChat({ session }: PracticeChatProps) {
  const { messages, memories, saveMessage, saveMemory, deleteMemory } = usePracticeData(session);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSessionSettingsOpen, setIsSessionSettingsOpen] = useState(false);
  
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState(() => localStorage.getItem('globalSystemPrompt') || DEFAULT_SYSTEM_INSTRUCTION);
  const [customPrompt, setCustomPrompt] = useState(session.custom_prompt || '');
  const [presets, setPresets] = useState<{id: string, name: string, prompt: string}[]>([]);
  const [aiVoice, setAiVoice] = useState(() => localStorage.getItem('aiVoice') || 'Puck');
  
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);

  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                            window.innerWidth < 768;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
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
    setIsConnected,
    error,
    setError,
    connectWebSocket,
    disconnectWebSocket,
    previewingVoice,
    previewVoice
  } = useGeminiLiveSession({
    session,
    globalSystemPrompt,
    aiVoice,
    memories,
    saveMessage,
    saveMemory,
    setLiveTranscript
  });

  // Hook 2: Push to Talk & Mic capture
  const {
    isRecording,
    isRecordingRef,
    analyserRef,
    micLabel,
    micButtonRef,
    stopAudioCapture
  } = usePushToTalk({
    isConnected,
    isInCall,
    isMobile,
    wsRef,
    saveMessage,
    setLiveTranscript,
    setError
  });

  // Hook 3: Audio Visualizer
  const {
    visualizerRefs,
    isPlaying
  } = useAudioVisualizer({
    isInCall,
    isPlayingRef,
    isRecordingRef,
    playbackAnalyserRef,
    analyserRef,
    playbackContextRef,
    nextAudioTimeRef
  });

  const changeVoiceAndReconnect = (newVoice: string) => {
    setAiVoice(newVoice);
    localStorage.setItem('aiVoice', newVoice);
    
    if (isInCall) {
      disconnectWebSocket();
      setTimeout(() => {
        connectWebSocket(newVoice);
      }, 500);
    }
  };

  const startCall = () => {
    setIsInCall(true);
    setCallStartTime(Date.now());
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

  const saveGlobalPrompt = (newPrompt: string) => {
    setGlobalSystemPrompt(newPrompt);
    localStorage.setItem('globalSystemPrompt', newPrompt);
  };

  const saveCustomPrompt = async () => {
    try {
      const val = customPrompt.trim() === '' ? null : customPrompt;
      await window.api.practice.updateSession({
        ...session,
        custom_prompt: val
      });
      session.custom_prompt = val;
      setIsSessionSettingsOpen(false);
    } catch (err) {
      console.error('Failed to update session prompt', err);
    }
  };

  useEffect(() => {
    const loadPresets = async () => {
      if (!window.api?.config) return;
      try {
        const stored = await window.api.config.get('practice_presets');
        if (stored && Array.isArray(stored)) {
          setPresets(stored);
        }
      } catch (err) {
        console.error('Failed to load presets', err);
      }
    };
    loadPresets();
  }, []);

  const saveAsNewPreset = async () => {
    if (!window.api?.config) return;
    const name = prompt('Nome para este novo Preset de Instruções:');
    if (!name || name.trim() === '') return;
    
    const newPreset = { id: Date.now().toString(), name, prompt: customPrompt };
    const newPresets = [...presets, newPreset];
    try {
      await window.api.config.set('practice_presets', newPresets);
      setPresets(newPresets);
    } catch (err) {
      console.error('Failed to save preset', err);
    }
  };

  const deletePreset = async (id: string) => {
    if (!window.api?.config) return;
    const newPresets = presets.filter(p => p.id !== id);
    try {
      await window.api.config.set('practice_presets', newPresets);
      setPresets(newPresets);
    } catch (err) {
      console.error('Failed to delete preset', err);
    }
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
      />

      {/* Action Bar / Controls when not in active full modal */}
      <div className="flex items-center justify-end px-4 py-2 bg-dark-card/30 border-b border-white/5 gap-3">
        {error && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs px-3 py-1 bg-red-400/10 rounded-full">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        
        {!isInCall && <MicTestWidget />}
        
        {!isInCall && (
          <button 
            onClick={startCall} 
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 rounded-full text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Play size={14} fill="currentColor" /> INICIAR LIGAÇÃO
          </button>
        )}

        {isInCall && (
          <>
            {isMobile ? (
              <button
                ref={micButtonRef}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95 ${
                  isRecording 
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400 animate-pulse' 
                    : 'border-white/10 text-dark-subtext'
                }`}
              >
                {isRecording ? <Mic size={16} /> : <MicOff size={16} />}
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {isRecording ? 'Ouvindo...' : 'Toque e segure'}
                </span>
              </button>
            ) : (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isRecording ? 'border-brand-500 bg-brand-500/10 text-brand-400 animate-pulse' : 'border-white/10 text-dark-subtext'}`}>
                {isRecording ? <Mic size={14} /> : <MicOff size={14} />}
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {isRecording ? 'Ouvindo...' : 'Segure "P"'}
                </span>
              </div>
            )}
            
            <button onClick={endCall} className="px-4 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full text-sm font-medium transition-colors flex items-center gap-2">
              <PhoneOff size={16} /> Encerrar
            </button>
          </>
        )}
      </div>

      {/* Messages Transcript */}
      <ChatTranscript messages={messages} />

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
        />
      )}

      {/* Drawer de Memórias */}
      <MemoryDrawer 
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memories={memories}
        onDeleteMemory={deleteMemory}
      />

      {/* Modal de Configurações de Voz */}
      <ChatSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        aiVoice={aiVoice}
        onChangeVoice={changeVoiceAndReconnect}
        previewVoice={previewVoice}
        previewingVoice={previewingVoice}
        globalSystemPrompt={globalSystemPrompt}
        onSaveGlobalPrompt={saveGlobalPrompt}
      />

      {/* Modal de Configurações da Sessão Atual */}
      <ChatSessionSettingsModal
        isOpen={isSessionSettingsOpen}
        onClose={() => setIsSessionSettingsOpen(false)}
        session={session}
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
        onSaveCustomPrompt={saveCustomPrompt}
        presets={presets}
        onSaveAsNewPreset={saveAsNewPreset}
        onDeletePreset={deletePreset}
      />
    </div>
  );
}
