import { useState, useRef, useCallback, useEffect } from 'react';
import type { TutorSession, TutorMemory } from '../../../../types';
import { parseInterviewConfig } from '../../../../types';
import { buildInterviewSystemPrompt } from '../services/interviewPromptBuilder';
import { encodeWAV } from '../../../../utils/audio';
import { arrayBufferToBase64 } from '../../../../utils/binary';
import { useAudioStreamPlayer } from './useAudioStreamPlayer';
import { useVoicePreview } from './useVoicePreview';

const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-latest';
const API_KEY = 'AIzaSyCDasLgSKUycf9-p4Ar9Wch3gq-E6-wGbw';
const HOST = 'generativelanguage.googleapis.com';

interface UseGeminiLiveSessionProps {
  session: TutorSession;
  globalSystemPrompt: string;
  aiVoice: string;
  memories: TutorMemory[];
  saveMessage: (role: 'user' | 'model', text: string) => void;
  saveMemory: (fact: string, category: string) => void;
  setLiveTranscript: (text: string) => void;
}

export function useGeminiLiveSession({
  session,
  globalSystemPrompt,
  aiVoice,
  memories,
  saveMessage,
  saveMemory,
  setLiveTranscript,
}: UseGeminiLiveSessionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const aiTurnTextRef = useRef<string>('');
  const aiTurnAudioChunksRef = useRef<Float32Array[]>([]);

  const {
    playbackContextRef,
    playbackAnalyserRef,
    nextAudioTimeRef,
    isPlayingRef,
    playAudioData,
    closePlayback,
  } = useAudioStreamPlayer();

  const { previewingVoice, previewVoice } = useVoicePreview();

  const handleWsMessage = useCallback(
    async (dataStr: string, ws: WebSocket) => {
      try {
        const response = JSON.parse(dataStr);

        if (response.setupComplete) {
          const past = await window.api?.practice?.getMessages(session.id);
          if (past && past.length > 0) {
            const contents = past.map((m) => {
              const cleanText = m.text_content
                .replace(/\[audio:data:audio\/wav;base64,.+?\]/g, '')
                .trim();
              return {
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: cleanText || '(mensagem sem texto)' }],
              };
            });
            const clientContent = {
              clientContent: {
                turns: contents,
                turnComplete: true,
              },
            };
            ws.send(JSON.stringify(clientContent));
          }
        }

        if (response.serverContent?.modelTurn) {
          setLiveTranscript('');
          const parts = response.serverContent.modelTurn.parts;
          for (const part of parts) {
            if (part.text) {
              aiTurnTextRef.current += part.text;
            }
            if (part.inlineData) {
              const base64Audio = part.inlineData.data;
              const binaryStr = window.atob(base64Audio);
              const len = binaryStr.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);

              const int16 = new Int16Array(bytes.buffer);
              const float32 = new Float32Array(int16.length);
              for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
              aiTurnAudioChunksRef.current.push(float32);

              playAudioData(base64Audio);
            }
          }
        }

        if (response.serverContent?.turnComplete) {
          if (aiTurnTextRef.current || aiTurnAudioChunksRef.current.length > 0) {
            let text = aiTurnTextRef.current;
            if (aiTurnAudioChunksRef.current.length > 0) {
              const totalLen = aiTurnAudioChunksRef.current.reduce(
                (acc, curr) => acc + curr.length,
                0
              );
              const combined = new Float32Array(totalLen);
              let offset = 0;
              for (const chunk of aiTurnAudioChunksRef.current) {
                combined.set(chunk, offset);
                offset += chunk.length;
              }
              const wavBuffer = encodeWAV(combined, 24000);
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
                response: { result: 'Success: memory saved.' },
              });
            }
          }
          if (responses.length > 0) {
            ws.send(
              JSON.stringify({
                toolResponse: {
                  functionResponses: responses,
                },
              })
            );
          }
        }
      } catch (e) {
        console.error('Failed to parse WS msg', e);
      }
    },
    [session.id, playAudioData, saveMessage, saveMemory, setLiveTranscript]
  );

  const connectWebSocket = useCallback(
    async (_overrideVoice?: string) => {
      try {
        const url = `wss://${HOST}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
        const ws = new WebSocket(url);

        ws.onopen = async () => {
          setIsConnected(true);
          setError(null);

          let systemPrompt = globalSystemPrompt;
          const interviewConfig = parseInterviewConfig(session);
          if (interviewConfig) {
            systemPrompt = buildInterviewSystemPrompt(interviewConfig);
          } else if (session.custom_prompt && session.custom_prompt.trim().length > 0) {
            systemPrompt = session.custom_prompt.trim();
          }

          if (memories.length > 0) {
            systemPrompt +=
              '\n\nVocê tem as seguintes memórias globais de longo prazo sobre o usuário, extraídas de conversas anteriores. Use-as de forma sutil para personalizar a conversa quando for apropriado e relevante:\n';
            memories.forEach((m) => {
              systemPrompt += `- [${m.category}]: ${m.fact}\n`;
            });
          }

          const setupMsg = {
            setup: {
              model: GEMINI_MODEL,
              generationConfig: {
                responseModalities: ['AUDIO'],
              },
              realtimeInputConfig: {},
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              tools: [
                {
                  functionDeclarations: [
                    {
                      name: 'extract_core_memories',
                      description:
                        "Save an important fact about the user's life into long term memory.",
                      parameters: {
                        type: 'OBJECT',
                        properties: {
                          fact: { type: 'STRING', description: 'The important fact to remember' },
                          category: {
                            type: 'STRING',
                            description: 'Category of the fact (e.g. work, family, goal, problem)',
                          },
                        },
                        required: ['fact', 'category'],
                      },
                    },
                  ],
                },
              ],
            },
          };
          ws.send(JSON.stringify(setupMsg));
        };

        ws.onmessage = async (event) => {
          if (event.data instanceof Blob) {
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
    },
    [session.custom_prompt, memories, globalSystemPrompt, handleWsMessage]
  );

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      closePlayback();
    };
  }, [closePlayback]);

  return {
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
    previewVoice,
    aiVoice,
  };
}
