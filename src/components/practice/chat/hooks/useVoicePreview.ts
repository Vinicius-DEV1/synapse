import { useState, useCallback, useRef, useEffect } from 'react';
import { getGeminiKeys, getRotatedActiveKeys } from '../../../../services/gemini/keys';

const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-latest';
const HOST = 'generativelanguage.googleapis.com';

export function useVoicePreview() {
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const cleanupVoicePreview = useCallback(() => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch (err: unknown) {
        console.debug('[useVoicePreview] AudioContext close error:', err);
      }
      audioContextRef.current = null;
    }
    setPreviewingVoice(null);
  }, []);

  useEffect(() => {
    return () => {
      cleanupVoicePreview();
    };
  }, [cleanupVoicePreview]);

  const previewVoice = useCallback(async (voiceName: string) => {
    if (previewingVoice) return;
    setPreviewingVoice(voiceName);

    try {
      const keys = await getGeminiKeys();
      const activeKey = getRotatedActiveKeys(keys)[0]?.key || (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
      if (!activeKey) {
        console.warn('Nenhuma chave da API Gemini ativa configurada para prévia de voz.');
        setPreviewingVoice(null);
        return;
      }

      const url = `wss://${HOST}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${activeKey}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      const audioCtx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;
      let nextTime = audioCtx.currentTime;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            setup: {
              model: GEMINI_MODEL,
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
              },
              systemInstruction: {
                parts: [{ text: `Diga apenas a seguinte frase: "Olá, eu sou a voz ${voiceName}."` }],
              },
            },
          })
        );
      };

      ws.onmessage = async (e) => {
        try {
          let textData = typeof e.data === 'string' ? e.data : '';
          if (e.data instanceof Blob) {
            textData = await e.data.text();
          }
          const res = JSON.parse(textData);
          if (res.setupComplete) {
            ws.send(
              JSON.stringify({
                clientContent: {
                  turns: [{ role: 'user', parts: [{ text: 'Apresente-se' }] }],
                  turnComplete: true,
                },
              })
            );
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
            cleanupVoicePreview();
          }
        } catch (err: unknown) {
          console.error('Preview WS msg error:', err);
        }
      };

      ws.onerror = () => cleanupVoicePreview();
      ws.onclose = () => cleanupVoicePreview();
    } catch (err: unknown) {
      console.error(err);
      cleanupVoicePreview();
    }
  }, [previewingVoice, cleanupVoicePreview]);

  return {
    previewingVoice,
    previewVoice,
  };
}
