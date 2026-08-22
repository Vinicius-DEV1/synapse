import { useState, useCallback } from 'react';

const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-latest';
const API_KEY = 'REDACTED_GEMINI_API_KEY';
const HOST = 'generativelanguage.googleapis.com';

export function useVoicePreview() {
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const previewVoice = useCallback((voiceName: string) => {
    if (previewingVoice) return;
    setPreviewingVoice(voiceName);

    try {
      const url = `wss://${HOST}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      const ws = new WebSocket(url);

      const audioCtx = new AudioContext({ sampleRate: 24000 });
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
            ws.close();
            setPreviewingVoice(null);
          }
        } catch (err) {
          console.error('Preview WS msg error:', err);
        }
      };

      ws.onerror = () => setPreviewingVoice(null);
      ws.onclose = () => setPreviewingVoice(null);
    } catch (err) {
      console.error(err);
      setPreviewingVoice(null);
    }
  }, [previewingVoice]);

  return {
    previewingVoice,
    previewVoice,
  };
}
