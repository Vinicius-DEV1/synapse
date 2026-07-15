import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Pause, Play, AlertCircle } from 'lucide-react';
import type { TutorSession, TutorMessage } from '../../types';

// O modelo que suporta bidiGenerateContent (Áudio Nativo bidirecional)
const GEMINI_MODEL = 'models/gemini-2.0-flash-exp';
// Chave de API de teste fornecida pelo usuário
const API_KEY = 'REDACTED_GEMINI_API_KEY'; 
const HOST = 'generativelanguage.googleapis.com';

const SYSTEM_INSTRUCTION = `You are a close human friend of the user, not a robotic tutor.
Your language should be highly welcoming, proactive, and sentimental.
Start conversations with dynamic phrases, like: "[Name], how was your day today?".
Proactively recall facts from the past.
Correct their English naturally in the flow of the conversation, without breaking the mood or emotion of the interaction.`;

interface PracticeChatProps {
  session: TutorSession;
}

export default function PracticeChat({ session }: PracticeChatProps) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  
  // Fila para reproduzir áudio da IA sequencialmente
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

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

  const connectWebSocket = useCallback(async () => {
    try {
      const url = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
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
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    
    const ctx = playbackContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    const pcmData = audioQueueRef.current.shift()!;
    const buffer = ctx.createBuffer(1, pcmData.length, 24000);
    buffer.getChannelData(0).set(pcmData);
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
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
      
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (!isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Base64 encode
        const buffer = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < buffer.byteLength; i++) {
            binary += String.fromCharCode(buffer[i]);
        }
        const b64 = window.btoa(binary);
        
        // Send to Gemini
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm;rate=16000",
                data: b64
              }]
            }
          }));
        }
      };
      
      source.connect(processor);
      processor.connect(audioCtx.destination);
      processorRef.current = processor;
      
      setIsRecording(true);
    } catch (err: any) {
      console.error('Mic error:', err);
      setError('Erro ao acessar microfone.');
    }
  };

  const stopAudioCapture = () => {
    setIsRecording(false);
    
    // We send a clientContent turnComplete true when user finishes speaking to force a response
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        clientContent: {
          turnComplete: true
        }
      }));
    }
    
    // As per user request, we need to extract transcription.
    // In a real VAD/Live scenario, Gemini returns the transcription of user audio in serverContent.
    // So we don't save our own text here, we wait for Gemini to echo our transcript.
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' && !e.repeat && !isRecording && isConnected) {
        startAudioCapture();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' && isRecording) {
        stopAudioCapture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isConnected, isRecording]);

  useEffect(() => {
    connectWebSocket();
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
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
            <span className="text-xs text-dark-subtext font-medium uppercase tracking-wider">
              {isConnected ? 'Conectado à IA' : 'Desconectado'}
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
        {!isConnected && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/50 backdrop-blur-sm z-20">
            <div className="flex flex-col items-center text-dark-subtext gap-3">
              <Loader2 size={24} className="animate-spin text-brand-500" />
              <span className="text-sm font-medium tracking-wide">Conectando ao Gemini...</span>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
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

      {/* Footer Instructions */}
      <div className="p-4 flex flex-col items-center justify-center text-xs text-dark-subtext border-t border-white/5 bg-dark-card/30">
        Mantenha a tecla <kbd className="px-2 py-1 mx-1 bg-white/10 rounded font-mono border border-white/5 text-dark-text">P</kbd> pressionada para falar. Solte para enviar.
      </div>
    </div>
  );
}
