import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Pause, Play, AlertCircle } from 'lucide-react';
import type { TutorSession, TutorMessage } from '../../types';

// O modelo que suporta bidiGenerateContent (Áudio Nativo bidirecional)
const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-latest';
// Chave de API de teste fornecida pelo usuário
const API_KEY = 'REDACTED_GEMINI_API_KEY'; 
const HOST = 'generativelanguage.googleapis.com';

const SYSTEM_INSTRUCTION = `Você é um amigo humano próximo do usuário.
Fale SEMPRE e APENAS em Português do Brasil (pt-BR).
Sua linguagem deve ser muito acolhedora e natural, com sotaque brasileiro.
Inicie a conversa perguntando de forma casual se o usuário está conseguindo te ouvir perfeitamente.`;

interface PracticeChatProps {
  session: TutorSession;
}

export default function PracticeChat({ session }: PracticeChatProps) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isInCall, setIsInCall] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  
  // Fila para reproduzir áudio da IA sequencialmente
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Analysers e refs para animação da UI
  const analyserRef = useRef<AnalyserNode | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const visualizerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const requestRef = useRef<number>();
  const [micLabel, setMicLabel] = useState<string>('');

  const loadMessages = useCallback(async () => {
    if (!window.api?.practice) return;
    try {
      const msgs = await window.api.practice.getMessages(session.id);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }, [session.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const saveMessage = async (role: string, text: string) => {
    if (!window.api?.practice || !text.trim()) return;
    try {
      const newMsg = await window.api.practice.createMessage({
        session_id: session.id,
        role,
        text_content: text
      });
      setMessages(prev => [...prev, newMsg]);
    } catch (err) {
      console.error('Failed to save message', err);
    }
  };

  const saveMemory = async (fact: string, category: string) => {
    if (!window.api?.practice) return;
    try {
      await window.api.practice.createMemory({ fact, category });
      console.log('Saved core memory:', { fact, category });
    } catch (err) {
      console.error('Failed to save memory', err);
    }
  };

  // Animação reativa do visualizador baseada no áudio real
  useEffect(() => {
    const updateVisualizer = () => {
      if (!isInCall) return;
      
      let dataArray: Uint8Array | null = null;
      let active = false;
      
      if (isPlayingRef.current && playbackAnalyserRef.current) {
        dataArray = new Uint8Array(playbackAnalyserRef.current.frequencyBinCount);
        playbackAnalyserRef.current.getByteFrequencyData(dataArray);
        active = true;
      } else if (isRecordingRef.current && analyserRef.current) {
        dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        active = true;
      }
      
      for (let i = 0; i < 6; i++) {
        const el = visualizerRefs.current[i];
        if (el) {
          if (active && dataArray) {
            // Pegamos algumas frequências intermediárias
            const binValue = dataArray[4 + i * 8] / 255.0 || 0;
            // Interpolação suave do CSS
            const targetHeight = 12 + (binValue * 48); // max 60px
            el.style.height = `${targetHeight}px`;
          } else {
            // Em repouso
            const t = Date.now() / 1000;
            const targetHeight = 12 + Math.sin(t * 2 + i) * 4;
            el.style.height = `${targetHeight}px`;
          }
        }
      }
      
      requestRef.current = requestAnimationFrame(updateVisualizer);
    };
    
    if (isInCall) {
      requestRef.current = requestAnimationFrame(updateVisualizer);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isInCall]);

  const connectWebSocket = useCallback(async () => {
    try {
      const url = `wss://${HOST}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      const ws = new WebSocket(url);
      
      ws.onopen = async () => {
        setIsConnected(true);
        setError(null);
        
        // Setup initial config and tools
        const setupMsg = {
          setup: {
            model: GEMINI_MODEL,
            generationConfig: {
              responseModalities: ["AUDIO"],
            },
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "extract_core_memories",
                    description: "Save an important fact about the user's life into long term memory.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        fact: { type: "STRING", description: "The important fact to remember" },
                        category: { type: "STRING", description: "Category of the fact (e.g. work, family, goal, problem)" }
                      },
                      required: ["fact", "category"]
                    }
                  }
                ]
              }
            ]
          }
        };
        ws.send(JSON.stringify(setupMsg));

        // The server will respond with setupComplete. We must wait for it.
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          // Gemni live may send blob, but usually JSON strings in V1alpha
          const text = await event.data.text();
          handleWsMessage(text, ws);
        } else {
          handleWsMessage(event.data, ws);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket closed');
      };

      ws.onerror = (e) => {
        console.error('WebSocket Error', e);
        setError('Erro na conexão com a IA.');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (err: any) {
      setError(err.message);
    }
  }, [session.id]);

  const handleWsMessage = async (dataStr: string, ws: WebSocket) => {
    try {
      const response = JSON.parse(dataStr);
      
      if (response.setupComplete) {
        // Inject history (hydrate) if not first time
        const past = await window.api?.practice?.getMessages(session.id);
        if (past && past.length > 0) {
          const contents = past.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text_content }]
          }));
          const clientContent = {
            clientContent: {
              turns: contents,
              turnComplete: true
            }
          };
          ws.send(JSON.stringify(clientContent));
        }
      }

      if (response.serverContent?.modelTurn) {
        const parts = response.serverContent.modelTurn.parts;
        for (const part of parts) {
          if (part.text) {
            // IA is speaking text (can happen even if modality is AUDIO, as transcript)
            saveMessage('model', part.text);
          }
          if (part.inlineData) {
            // Audio data
            const base64Audio = part.inlineData.data;
            playAudioData(base64Audio);
          }
        }
      }

      // Handle Tool Calls
      if (response.toolCall) {
        const calls = response.toolCall.functionCalls;
        const responses = [];
        for (const call of calls) {
          if (call.name === 'extract_core_memories') {
            const { fact, category } = call.args;
            saveMemory(fact, category);
            responses.push({
              id: call.id,
              name: call.name,
              response: { result: "Success: memory saved." }
            });
          }
        }
        if (responses.length > 0) {
          ws.send(JSON.stringify({
            toolResponse: {
              functionResponses: responses
            }
          }));
        }
      }
      
    } catch (e) {
      console.error('Failed to parse WS msg', e);
    }
  };

  const playAudioData = async (base64Str: string) => {
    // Decode base64 to binary
    const binaryStr = window.atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    
    // Gemini returns 24kHz PCM by default in some cases, or 16kHz. 
    // Usually Gemini Live returns 24000 Hz, 16-bit PCM.
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    
    audioQueueRef.current.push(float32);
    playNextAudio();
  };

  const playNextAudio = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      if (audioQueueRef.current.length === 0) setIsPlaying(false);
      return;
    }
    isPlayingRef.current = true;
    setIsPlaying(true);
    
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    
    const ctx = playbackContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    const pcmData = audioQueueRef.current.shift()!;
    const buffer = ctx.createBuffer(1, pcmData.length, 24000);
    buffer.getChannelData(0).set(pcmData);
    
    if (!playbackAnalyserRef.current) {
      playbackAnalyserRef.current = ctx.createAnalyser();
      playbackAnalyserRef.current.fftSize = 256;
      playbackAnalyserRef.current.connect(ctx.destination);
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(playbackAnalyserRef.current);
    source.onended = () => {
      isPlayingRef.current = false;
      playNextAudio();
    };
    source.start();
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      mediaStreamRef.current = stream;
      
      const track = stream.getAudioTracks()[0];
      if (track) setMicLabel(track.label);
      
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      await audioCtx.audioWorklet.addModule('/audio-worklet.js');
      const workletNode = new AudioWorkletNode(audioCtx, 'pcm-extractor');
      const source = audioCtx.createMediaStreamSource(stream);
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      let pcmBuffer: number[] = []; // Not needed anymore since worklet buffers
      workletNode.port.onmessage = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        
        const inputData = e.data; // Float32Array of 4096
        const pcm16 = new Int16Array(inputData.length);
        const recording = isRecordingRef.current;
        
        for (let i = 0; i < inputData.length; i++) {
          if (recording) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          } else {
            pcm16[i] = 0; // Send digital silence when P is not held
          }
        }
        
        const buffer = new Uint8Array(pcm16.buffer);
        const binary = String.fromCharCode.apply(null, Array.from(buffer));
        const b64 = window.btoa(binary);
        
        wsRef.current.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: "audio/pcm;rate=16000",
              data: b64
            }]
          }
        }));
      };
      
      source.connect(workletNode);
      workletNode.connect(audioCtx.destination);
      processorRef.current = workletNode as any;
      
      isRecordingRef.current = false;
      setIsRecording(false);
      console.log('🎤 Captura de áudio inicializada em modo mudo (Aguardando tecla P)');
    } catch (err: any) {
      console.error('Mic error:', err);
      setError('Erro ao acessar microfone.');
    }
  };

  const stopAudioCapture = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    console.log('🛑 Captura de áudio encerrada');
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Start capturing automatically when call starts, but it starts muted
  useEffect(() => {
    if (isConnected && isInCall && !mediaStreamRef.current) {
      startAudioCapture();
    }
  }, [isConnected, isInCall]);

  // Handle Push-To-Talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' && !e.repeat && isConnected && isInCall) {
        isRecordingRef.current = true;
        setIsRecording(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') {
        isRecordingRef.current = false;
        setIsRecording(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isConnected, isInCall]);

  const startCall = () => {
    setIsInCall(true);
    setCallStartTime(Date.now());
    connectWebSocket();
  };

  const endCall = () => {
    setIsInCall(false);
    stopAudioCapture();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    
    if (callStartTime) {
      const durationMs = Date.now() - callStartTime;
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      const durationStr = `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;
      saveMessage('user', `[SISTEMA] 📞 Ligação encerrada (${durationStr})`);
    }
    setCallStartTime(null);
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      if (playbackContextRef.current) playbackContextRef.current.close();
    };
  }, [connectWebSocket]);

  return (
    <div className="flex flex-col h-full bg-dark-bg/80 relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-dark-card/50 backdrop-blur-md z-10">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{session.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${isInCall ? (isConnected ? 'bg-emerald-400' : 'bg-yellow-400') : 'bg-dark-subtext'}`}></span>
            <span className="text-xs text-dark-subtext font-medium uppercase tracking-wider">
              {isInCall ? (isConnected ? 'Em chamada' : 'Conectando...') : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {error && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs px-3 py-1 bg-red-400/10 rounded-full">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isRecording ? 'border-brand-500 bg-brand-500/10 text-brand-400 animate-pulse' : 'border-white/10 text-dark-subtext'}`}>
            {isRecording ? <Mic size={14} /> : <MicOff size={14} />}
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isRecording ? 'Ouvindo...' : 'Segure "P"'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {messages.map((msg, i) => {
          const isSystem = msg.text_content.startsWith('[SISTEMA]');
          
          if (isSystem) {
            return (
              <div key={msg.id || i} className="flex justify-center my-2">
                <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-dark-subtext font-medium tracking-wide">
                  {msg.text_content.replace('[SISTEMA] ', '')}
                </div>
              </div>
            );
          }
          
          const isModel = msg.role === 'model';
          return (
            <div key={msg.id || i} className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
              <span className="text-[10px] text-dark-subtext uppercase tracking-widest font-bold mb-1 ml-1">
                {isModel ? 'IA' : 'Você'}
              </span>
              <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm text-sm ${
                isModel 
                  ? 'bg-dark-card border border-white/5 text-dark-text rounded-tl-sm' 
                  : 'bg-brand-600 text-white rounded-tr-sm'
              }`}>
                {msg.text_content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Call Footer when not in call */}
      {!isInCall && (
        <div className="p-4 flex justify-center border-t border-white/5 bg-dark-card/30">
          <button 
            onClick={startCall} 
            className="px-8 py-3 bg-brand-600 hover:bg-brand-500 rounded-full text-white font-medium shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Play size={18} fill="currentColor" /> Iniciar Ligação
          </button>
        </div>
      )}

      {/* Modal/Overlay Call UI */}
      {isInCall && (
        <div className="absolute inset-0 z-50 bg-dark-bg/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="absolute top-8 left-8">
            <h2 className="text-xl font-bold tracking-tight text-white/90">{session.title}</h2>
            <div className="text-brand-400 text-sm mt-1 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              Chamada Ativa
            </div>
          </div>
          
          {/* Visualizer Orb */}
          <div className="relative flex items-center justify-center w-64 h-64 mb-16">
            {/* Glow rings */}
            <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${isRecording ? 'bg-brand-500/30 scale-150 opacity-90' : isPlaying ? 'bg-sky-500/30 scale-125 opacity-80' : isConnected ? 'bg-brand-500/20 scale-110 opacity-40 animate-pulse' : 'bg-dark-card/50 scale-75 opacity-0'}`}></div>
            
            {/* Main Orb */}
            <div className={`relative z-10 w-32 h-32 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500 overflow-hidden ${
              isRecording ? 'bg-brand-500 shadow-[0_0_50px_rgba(168,85,247,0.6)] scale-110' : 
              isPlaying ? 'bg-sky-500 shadow-[0_0_50px_rgba(14,165,233,0.6)] scale-105' :
              isConnected ? 'bg-dark-card shadow-[0_0_30px_rgba(255,255,255,0.05)]' : 
              'bg-dark-card/50'
            }`}>
              {isRecording ? (
                <div className="flex gap-1 h-12 items-center">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <div 
                      key={i}
                      ref={el => visualizerRefs.current[i] = el}
                      className="w-2 bg-white rounded-full transition-all duration-[50ms]" 
                      style={{ height: '12px' }}
                    ></div>
                  ))}
                </div>
              ) : isPlaying ? (
                <div className="flex gap-1 h-12 items-center">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <div 
                      key={i}
                      ref={el => visualizerRefs.current[i] = el}
                      className="w-2 bg-white rounded-full transition-all duration-[50ms]" 
                      style={{ height: '12px' }}
                    ></div>
                  ))}
                </div>
              ) : !isConnected ? (
                <Loader2 size={40} className="text-brand-500 animate-spin" />
              ) : (
                <div className="flex gap-1 h-12 items-center">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <div 
                      key={i}
                      ref={el => visualizerRefs.current[i] = el}
                      className="w-2 bg-white rounded-full transition-all duration-[50ms]" 
                      style={{ height: '12px' }}
                    ></div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center mb-16 h-20">
            <h3 className="text-2xl font-semibold text-white tracking-tight mb-3">
              {!isConnected ? 'Conectando ao servidor...' : isRecording ? 'Ouvindo você...' : isPlaying ? 'IA Falando...' : 'Fale comigo'}
            </h3>
            <p className="text-sm text-dark-subtext max-w-[280px] mx-auto">
              {isConnected ? (
                <span className="flex flex-col items-center gap-1">
                  <span className="flex items-center gap-2">Mantenha pressionado <kbd className="px-2 py-1 bg-white/10 rounded font-mono border border-white/10 text-white shadow-sm">P</kbd> para falar</span>
                  {micLabel && <span className="text-xs text-white/40 truncate w-full" title={micLabel}>{micLabel}</span>}
                </span>
              ) : (
                'Estabelecendo comunicação segura de baixa latência.'
              )}
            </p>
          </div>
          
          {/* End Call Button */}
          <button 
            onClick={endCall} 
            className="w-16 h-16 rounded-full bg-red-500/20 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/10 group"
            title="Encerrar Ligação"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg] group-hover:rotate-0 transition-transform duration-300">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-7-7 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
            </svg>
          </button>
          
          {error && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-sm shadow-xl">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
