import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Play, Square, Brain, Trash2, X, PhoneOff, AlertCircle, Settings, Volume2, FileText, Sliders } from 'lucide-react';
import { AudioMessagePlayer } from './chat/AudioMessagePlayer';
import { MicTestWidget } from './chat/MicTestWidget';
import { ChatSettingsModal } from './chat/ChatSettingsModal';
import { ChatSessionSettingsModal } from './chat/ChatSessionSettingsModal';
import { ChatTranscript } from './chat/ChatTranscript';
import { MemoryDrawer } from './chat/MemoryDrawer';
import { usePracticeData } from './hooks/usePracticeData';
import type { TutorSession } from '../../types';
import { encodeWAV } from '../../utils/audio';
import { arrayBufferToBase64 } from '../../utils/binary';

// Typings para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}


// O modelo que suporta bidiGenerateContent (Áudio Nativo bidirecional)
const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-latest';
// Chave de API de teste fornecida pelo usuário
const API_KEY = 'AIzaSyCDasLgSKUycf9-p4Ar9Wch3gq-E6-wGbw'; 
const HOST = 'generativelanguage.googleapis.com';

const DEFAULT_SYSTEM_INSTRUCTION = `Você é um amigo humano próximo do usuário.
Fale SEMPRE e APENAS em Português do Brasil (pt-BR).
Sua linguagem deve ser muito acolhedora e natural, com sotaque brasileiro.
Inicie a conversa perguntando de forma casual se o usuário está conseguindo te ouvir perfeitamente.`;

interface PracticeChatProps {
  session: TutorSession;
}

export default function PracticeChat({ session }: PracticeChatProps) {
  const { messages, setMessages, memories, saveMessage, saveMemory, deleteMemory } = usePracticeData(session);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSessionSettingsOpen, setIsSessionSettingsOpen] = useState(false);
  
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState(() => localStorage.getItem('globalSystemPrompt') || DEFAULT_SYSTEM_INSTRUCTION);
  const [customPrompt, setCustomPrompt] = useState(session.custom_prompt || '');
  const [presets, setPresets] = useState<{id: string, name: string, prompt: string}[]>([]);
  
  const [aiVoice, setAiVoice] = useState(() => localStorage.getItem('aiVoice') || 'Puck');
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [isInCall, setIsInCall] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);

  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false);
  const micButtonRef = useRef<HTMLButtonElement>(null);

  // Detect mobile on mount and resize
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

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  
  // Fila para reproduzir áudio da IA sequencialmente
  const nextAudioTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Analysers e refs para animação da UI
  const analyserRef = useRef<AnalyserNode | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const visualizerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const requestRef = useRef<number>();
  const [micLabel, setMicLabel] = useState<string>('');

  // Transcrição e Salvamento
  const recognitionRef = useRef<any>(null);
  const userTranscriptRef = useRef<string>('');
  const finalTranscriptRef = useRef<string>('');
  const userAudioChunksRef = useRef<Float32Array[]>([]);
  
  const aiTurnTextRef = useRef<string>('');
  const aiTurnAudioChunksRef = useRef<Float32Array[]>([]);


  const previewVoice = (voiceName: string) => {
    if (previewingVoice) return; // Wait until current preview is done
    setPreviewingVoice(voiceName);
    
    try {
      const url = `wss://${HOST}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      const ws = new WebSocket(url);
      
      const audioCtx = new AudioContext({ sampleRate: 24000 });
      let nextTime = audioCtx.currentTime;
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          setup: {
            model: GEMINI_MODEL,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
            },
            systemInstruction: { parts: [{ text: `Diga apenas a seguinte frase: "Olá, eu sou a voz ${voiceName}."` }] }
          }
        }));
      };
      
      ws.onmessage = async (e) => {
        try {
          let textData = typeof e.data === 'string' ? e.data : '';
          if (e.data instanceof Blob) {
            textData = await e.data.text();
          }
          const res = JSON.parse(textData);
          if (res.setupComplete) {
            ws.send(JSON.stringify({
              clientContent: { turns: [{ role: 'user', parts: [{ text: "Apresente-se" }] }], turnComplete: true }
            }));
          } else if (res.serverContent?.modelTurn) {
            const parts = res.serverContent.modelTurn.parts;
            for (const part of parts) {
              if (part.inlineData) {
                const base64Audio = part.inlineData.data;
                const binaryStr = window.atob(base64Audio);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
                
                const int16 = new Int16Array(bytes.buffer);
                const float32 = new Float32Array(int16.length);
                for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
                
                if (audioCtx.state === 'suspended') await audioCtx.resume();
                if (nextTime < audioCtx.currentTime) nextTime = audioCtx.currentTime;
                
                const buffer = audioCtx.createBuffer(1, float32.length, 24000);
                buffer.getChannelData(0).set(float32);
                
                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(audioCtx.destination);
                source.start(nextTime);
                nextTime += buffer.duration;
              }
            }
          } else if (res.serverContent?.turnComplete) {
            ws.close();
            setPreviewingVoice(null);
          }
        } catch(err) {
          console.error("Preview WS msg error:", err);
        }
      };
      
      ws.onerror = () => setPreviewingVoice(null);
      ws.onclose = () => setPreviewingVoice(null);
      
    } catch (err) {
      console.error(err);
      setPreviewingVoice(null);
    }
  };

  const changeVoiceAndReconnect = (newVoice: string) => {
    setAiVoice(newVoice);
    localStorage.setItem('aiVoice', newVoice);
    
    if (isInCall) {
      // Disconnect and reconnect to apply new voice setup
      if (wsRef.current) wsRef.current.close();
      setIsConnected(false);
      setTimeout(() => {
        connectWebSocket(newVoice);
      }, 500);
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
      
      // Update isPlaying React state based on accurate audio scheduling
      if (playbackContextRef.current && nextAudioTimeRef.current > playbackContextRef.current.currentTime) {
        if (!isPlayingRef.current) {
          isPlayingRef.current = true;
          setIsPlaying(true);
        }
      } else {
        if (isPlayingRef.current) {
          isPlayingRef.current = false;
          setIsPlaying(false);
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

  const connectWebSocket = useCallback(async (overrideVoice?: string) => {
    try {
      const url = `wss://${HOST}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      const ws = new WebSocket(url);
      
      ws.onopen = async () => {
        setIsConnected(true);
        setError(null);
        
        let systemPrompt = globalSystemPrompt;
        if (session.custom_prompt && session.custom_prompt.trim().length > 0) {
          systemPrompt = session.custom_prompt.trim();
        }
        
        if (memories.length > 0) {
          systemPrompt += "\n\nVocê tem as seguintes memórias globais de longo prazo sobre o usuário, extraídas de conversas anteriores. Use-as de forma sutil para personalizar a conversa quando for apropriado e relevante:\n";
          memories.forEach(m => {
            systemPrompt += `- [${m.category}]: ${m.fact}\n`;
          });
        }
        
        // Setup initial config and tools
        const setupMsg = {
          setup: {
            model: GEMINI_MODEL,
            generationConfig: {
              responseModalities: ["AUDIO"],
            },
            realtimeInputConfig: {
              // Enable VAD so the API handles turn completion naturally
              // We will manually trigger it by sending a burst of silence on keyup
            },
            systemInstruction: {
              parts: [{ text: systemPrompt }]
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

      ws.onclose = (ev) => {
        setIsConnected(false);
        console.log('WebSocket closed:', ev.code, ev.reason);
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
  }, [session.id, memories, aiVoice, globalSystemPrompt, session.custom_prompt]);

  const handleWsMessage = async (dataStr: string, ws: WebSocket) => {
    try {
      const response = JSON.parse(dataStr);
      
      if (response.setupComplete) {
        // Inject history (hydrate) if not first time
        const past = await window.api?.practice?.getMessages(session.id);
        if (past && past.length > 0) {
          const contents = past.map(m => {
            // Limpa as tags de áudio gigantes para economizar tokens na memória local
            const cleanText = m.text_content.replace(/\[audio:data:audio\/wav;base64,.+?\]/g, '').trim();
            return {
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: cleanText || '(mensagem sem texto)' }]
            };
          });
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
        setLiveTranscript(''); // Apaga o texto do usuário quando a IA começa a responder
        const parts = response.serverContent.modelTurn.parts;
        for (const part of parts) {
          if (part.text) {
            aiTurnTextRef.current += part.text;
          }
          if (part.inlineData) {
            const base64Audio = part.inlineData.data;
            
            // Decodificar base64 e acumular Float32
            const binaryStr = window.atob(base64Audio);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
              float32[i] = int16[i] / 32768.0;
            }
            aiTurnAudioChunksRef.current.push(float32);
            
            playAudioData(base64Audio);
          }
        }
      }
      
      if (response.serverContent?.turnComplete) {
        if (aiTurnTextRef.current || aiTurnAudioChunksRef.current.length > 0) {
          // Gerar WAV e salvar
          let text = aiTurnTextRef.current;
          if (aiTurnAudioChunksRef.current.length > 0) {
            const totalLen = aiTurnAudioChunksRef.current.reduce((acc, curr) => acc + curr.length, 0);
            const combined = new Float32Array(totalLen);
            let offset = 0;
            for (const chunk of aiTurnAudioChunksRef.current) {
              combined.set(chunk, offset);
              offset += chunk.length;
            }
            const wavBuffer = encodeWAV(combined, 24000); // Gemini returns 24kHz
            const b64 = arrayBufferToBase64(wavBuffer);
            text += ` [audio:data:audio/wav;base64,${b64}]`;
          }
          saveMessage('model', text);
          
          aiTurnTextRef.current = '';
          aiTurnAudioChunksRef.current = [];
          setLiveTranscript('');
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
    
    if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextAudioTimeRef.current = playbackContextRef.current.currentTime;
    }
    
    const ctx = playbackContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    // If the queue fell behind the current time (i.e. we ran out of audio or it's the first chunk), reset the timer
    if (nextAudioTimeRef.current < ctx.currentTime) {
      nextAudioTimeRef.current = ctx.currentTime;
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    
    if (!playbackAnalyserRef.current) {
      playbackAnalyserRef.current = ctx.createAnalyser();
      playbackAnalyserRef.current.fftSize = 256;
      playbackAnalyserRef.current.connect(ctx.destination);
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(playbackAnalyserRef.current);
    
    // Schedule exactly at the end of the previous chunk for gapless playback
    source.start(nextAudioTimeRef.current);
    
    // Increment the next start time by the duration of this chunk
    nextAudioTimeRef.current += buffer.duration;
  };

  const startAudioCapture = async () => {
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      } catch (err) {
        console.warn('Overconstrained audio request failed, falling back to basic audio', err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
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
      
      // Initialize STT
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'pt-BR';
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += chunk + ' ';
            } else {
              interimTranscript += chunk;
            }
          }
          const fullTranscript = finalTranscriptRef.current + interimTranscript;
          userTranscriptRef.current = fullTranscript;
          setLiveTranscript(fullTranscript);
        };
      }
      
      let pcmBuffer: number[] = []; // Not needed anymore since worklet buffers
      workletNode.port.onmessage = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        
        const inputData = e.data; // Float32Array of 4096
        const recording = isRecordingRef.current;
        
        if (!recording) return; // Não envia/grava áudio se não estiver segurando o P
        
        userAudioChunksRef.current.push(inputData.slice());
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

  // Handle Push-To-Talk (Desktop: P key, Mobile: Touch-and-hold)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && !isRecordingRef.current && isConnected && isInCall && !isMobile) {
        isRecordingRef.current = true;
        setIsRecording(true);
        
        userAudioChunksRef.current = [];
        userTranscriptRef.current = '';
        finalTranscriptRef.current = '';
        setLiveTranscript('');
        
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Already started? Ignore
          }
        }
      }
    };
    const handleKeyUp = async (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && !isMobile) {
        await stopRecordingAndSend();
      }
    };

    // Mobile touch handlers
    const handleTouchStart = (e: TouchEvent) => {
      if (isMobile && isConnected && isInCall && !isRecordingRef.current) {
        e.preventDefault();
        isRecordingRef.current = true;
        setIsRecording(true);
        
        userAudioChunksRef.current = [];
        userTranscriptRef.current = '';
        finalTranscriptRef.current = '';
        setLiveTranscript('');
        
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Already started? Ignore
          }
        }
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (isMobile) {
        e.preventDefault();
        await stopRecordingAndSend();
      }
    };

    const stopRecordingAndSend = async () => {
      isRecordingRef.current = false;
      setIsRecording(false);
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Burst-send all accumulated audio as realtimeInput, then send 2 seconds of silence to trigger VAD
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (userAudioChunksRef.current.length > 0) {
          const totalLen = userAudioChunksRef.current.reduce((acc, curr) => acc + curr.length, 0);
          const combined = new Float32Array(totalLen);
          let offset = 0;
          for (const chunk of userAudioChunksRef.current) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          
          const pcm16 = new Int16Array(combined.length);
          for (let i = 0; i < combined.length; i++) {
            let s = Math.max(-1, Math.min(1, combined[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          const buffer = new Uint8Array(pcm16.buffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < buffer.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(buffer.slice(i, i + chunkSize)));
          }
          const b64 = window.btoa(binary);
          
          // 1. Send the user's actual audio burst
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: b64 }]
            }
          }));
          
          // 2. Send 2 seconds of pure silence to force Google's VAD to end the turn
          const silenceBuffer = new Uint8Array(16000 * 2 * 2); // 16kHz * 2 bytes * 2 seconds
          let silenceBinary = '';
          for (let i = 0; i < silenceBuffer.length; i += chunkSize) {
            silenceBinary += String.fromCharCode.apply(null, Array.from(silenceBuffer.slice(i, i + chunkSize)));
          }
          const silenceB64 = window.btoa(silenceBinary);
          
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: silenceB64 }]
            }
          }));
        }
      }
      
      // Save user turn after a delay for STT to finalize
      setTimeout(async () => {
        let text = userTranscriptRef.current.trim();
        if (!text) return; // Ignore if nothing heard
        
        if (userAudioChunksRef.current.length > 0) {
          try {
            const totalLen = userAudioChunksRef.current.reduce((acc, curr) => acc + curr.length, 0);
            const combined = new Float32Array(totalLen);
            let offset = 0;
            for (const chunk of userAudioChunksRef.current) {
              combined.set(chunk, offset);
              offset += chunk.length;
            }
            const wavBuffer = encodeWAV(combined, 16000); // Mic is 16kHz
            const b64 = arrayBufferToBase64(wavBuffer);
            text += ` [audio:data:audio/wav;base64,${b64}]`;
          } catch (err) {
            console.error('Falha ao gerar audio do usuario:', err);
          }
        }
        
        saveMessage('user', text);
        userTranscriptRef.current = '';
        userAudioChunksRef.current = [];
      }, 800); // Wait 800ms to allow STT to finalize
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Add touch handlers to mic button on mobile
    if (micButtonRef.current && isMobile) {
      micButtonRef.current.addEventListener('touchstart', handleTouchStart);
      micButtonRef.current.addEventListener('touchend', handleTouchEnd);
      micButtonRef.current.addEventListener('touchcancel', handleTouchEnd);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      if (micButtonRef.current && isMobile) {
        micButtonRef.current.removeEventListener('touchstart', handleTouchStart);
        micButtonRef.current.removeEventListener('touchend', handleTouchEnd);
        micButtonRef.current.removeEventListener('touchcancel', handleTouchEnd);
      }
    };
  }, [isConnected, isInCall, isMobile]);

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
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch(e) {}
      }
      audioContextRef.current = null;
      if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
        try { playbackContextRef.current.close(); } catch(e) {}
      }
      playbackContextRef.current = null;
    };
  }, []);

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
      session.custom_prompt = val; // update local ref
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
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-dark-card/50 backdrop-blur-md z-10">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{session.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${isInCall ? (isConnected ? 'bg-emerald-400' : 'bg-yellow-400') : 'bg-dark-subtext'}`}></span>
            <span className="text-xs text-dark-subtext font-medium uppercase tracking-wider">
              {isInCall ? (isConnected ? 'Em chamada' : 'Conectando...') : 'Offline'}
            </span>
            {session.custom_prompt && (
              <>
                <span className="text-dark-subtext mx-1">•</span>
                <span className="text-xs text-brand-400 font-medium tracking-wider">Instruções Customizadas Ativas</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSessionSettingsOpen(true)}
            className={`p-1.5 rounded-md transition-colors ${session.custom_prompt ? 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30' : 'bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white'}`}
            title="Instruções desta Sessão"
          >
            <FileText size={16} />
          </button>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-brand-400 hover:text-brand-300 transition-colors"
            title="Configurações de Voz"
          >
            <Sliders size={16} />
          </button>
          
          <button 
            onClick={() => setIsMemoryOpen(true)}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-brand-400 hover:text-brand-300 transition-colors mr-2"
            title="Ver Memórias da IA"
          >
            <Brain size={16} />
          </button>
          
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
            </>
          )}

          {isInCall && (
            <button onClick={endCall} className="px-4 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full text-sm font-medium transition-colors flex items-center gap-2">
              <PhoneOff size={16} /> Encerrar
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ChatTranscript messages={messages} />



      {/* Modal/Overlay Call UI */}
      {isInCall && (
        <div className="absolute inset-0 z-50 overflow-hidden bg-dark-bg/95 flex flex-col items-center justify-center animate-in fade-in duration-300">
          
          {/* Fundo dinâmico */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-500/10 via-dark-bg/90 to-dark-bg/95 pointer-events-none"></div>

          <div className="absolute top-8 left-8 z-10">
            <h2 className="text-xl font-bold tracking-tight text-white/90">{session.title}</h2>
            <div className="text-brand-400 text-sm mt-1 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              Chamada Ativa
            </div>
          </div>
          
          {/* Centro da Tela: Aura e Transcrição */}
          <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl px-8 pb-40">
            
            {/* Status Text */}
            <div className={`mb-12 transition-opacity duration-500 ${liveTranscript ? 'opacity-0' : 'opacity-100'}`}>
              <h3 className="text-xl font-medium text-white/50 tracking-widest uppercase">
                {!isConnected ? 'Conectando ao servidor...' : isRecording ? 'Ouvindo...' : isPlaying ? 'IA Falando...' : 'Fale comigo'}
              </h3>
            </div>

            {/* Visualizer Orb (Glassmorphism) */}
            <div className="relative flex items-center justify-center w-48 h-48 mb-8">
              {/* Glow rings */}
              <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${isRecording ? 'bg-brand-500/40 scale-150 opacity-100' : isPlaying ? 'bg-sky-500/40 scale-125 opacity-90' : isConnected ? 'bg-white/10 scale-110 opacity-50 animate-pulse' : 'bg-transparent scale-75 opacity-0'}`}></div>
              
              {/* Main Orb */}
              <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 overflow-hidden backdrop-blur-xl border border-white/20 ${
                isRecording ? 'bg-white/10 shadow-[0_0_80px_rgba(168,85,247,0.5)] scale-110' : 
                isPlaying ? 'bg-white/10 shadow-[0_0_80px_rgba(14,165,233,0.5)] scale-105' :
                isConnected ? 'bg-white/5 shadow-[0_0_40px_rgba(255,255,255,0.05)]' : 
                'bg-transparent border-white/5'
              }`}>
                {isRecording ? (
                  <div className="flex gap-1.5 h-12 items-center">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div 
                        key={i}
                        ref={el => visualizerRefs.current[i] = el}
                        className="w-1.5 bg-gradient-to-t from-brand-300 to-brand-100 rounded-full transition-all duration-[50ms]" 
                        style={{ height: '12px' }}
                      ></div>
                    ))}
                  </div>
                ) : isPlaying ? (
                  <div className="flex gap-1.5 h-12 items-center">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div 
                        key={i}
                        ref={el => visualizerRefs.current[i] = el}
                        className="w-1.5 bg-gradient-to-t from-sky-300 to-sky-100 rounded-full transition-all duration-[50ms]" 
                        style={{ height: '12px' }}
                      ></div>
                    ))}
                  </div>
                ) : !isConnected ? (
                  <Loader2 size={32} className="text-white/50 animate-spin" />
                ) : (
                  <div className="flex gap-1.5 h-12 items-center">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div 
                        key={i}
                        ref={el => visualizerRefs.current[i] = el}
                        className="w-1.5 bg-white/40 rounded-full transition-all duration-[50ms]" 
                        style={{ height: '12px' }}
                      ></div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Live Transcript (Huge & Immersive) */}
            <div className="min-h-[120px] flex items-center justify-center w-full">
              {liveTranscript && (
                <p className="text-3xl md:text-4xl font-bold text-center leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/50 animate-in fade-in slide-in-from-bottom-4 drop-shadow-lg max-w-3xl">
                  {liveTranscript}
                </p>
              )}
            </div>
          </div>
          
          {/* Bottom Dock (Controles Glassmorphism) */}
          <div className="absolute bottom-10 z-20 flex flex-col items-center w-full max-w-sm px-4">
            
            {!isConnected && (
              <p className="text-sm text-dark-subtext mb-4">Estabelecendo comunicação segura de baixa latência...</p>
            )}

            <div className="flex flex-col items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl w-full">
              
              {isConnected && (
                <>
                  {/* Instruções P to Talk */}
                  <div className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${isRecording ? 'opacity-20' : 'opacity-100'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/60">Mantenha pressionado</span>
                      <kbd className="px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-sm shadow-inner">P</kbd>
                      <span className="text-sm font-medium text-white/60">para falar</span>
                    </div>
                    {micLabel && <span className="text-[11px] font-semibold tracking-wider uppercase text-white/30">{micLabel}</span>}
                  </div>
                  
                  {/* Divisor */}
                  <div className="w-full h-px bg-white/5"></div>
                </>
              )}
              
              {/* End Call Button ALWAYS VISIBLE */}
              <button 
                onClick={endCall} 
                className="w-full py-3 px-8 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Encerrar Ligação"
              >
                <PhoneOff size={18} />
                <span className="font-semibold text-sm tracking-wide">Encerrar Chamada</span>
              </button>
            </div>
          </div>
          
          {error && (
            <div className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-sm shadow-xl z-50">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Memory Panel UI */}
      <MemoryDrawer
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memories={memories}
        onDeleteMemory={deleteMemory}
      />
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

      <ChatSessionSettingsModal
        isOpen={isSessionSettingsOpen}
        onClose={() => setIsSessionSettingsOpen(false)}
        session={session}
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
        presets={presets}
        saveCustomPrompt={saveCustomPrompt}
        saveAsNewPreset={saveAsNewPreset}
      />
    </div>
  );
};
