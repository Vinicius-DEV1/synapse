import { useState, useCallback } from 'react';

export function useVideoUploadScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | undefined>();
  const [embeddedSubs, setEmbeddedSubs] = useState<{ index: string; language?: string; codec: string; title?: string; label?: string }[]>([]);
  const [embeddedAudios, setEmbeddedAudios] = useState<{ index: string; language?: string; codec: string; title?: string; label?: string }[]>([]);
  const [primaryAudioTrack, setPrimaryAudioTrack] = useState<string>('');
  const [extraAudioTracks, setExtraAudioTracks] = useState<Set<string>>(new Set());
  const [extraSubtitleTracks, setExtraSubtitleTracks] = useState<Set<string>>(new Set());

  const resetTracks = useCallback(() => {
    setEmbeddedSubs([]);
    setEmbeddedAudios([]);
    setPrimaryAudioTrack('');
    setExtraAudioTracks(new Set());
    setExtraSubtitleTracks(new Set());
    setVideoDuration(undefined);
  }, []);

  const scanFilePath = useCallback(async (filePath: string) => {
    if ((window.api?.video as any)?.scanTracks) {
      setIsScanning(true);
      try {
        const scanRes = await (window.api.video as any).scanTracks(filePath);
        if (scanRes?.error) {
          console.error('ffprobe error:', scanRes.error);
        }
        const streams = scanRes?.streams || [];
        const dur = Number(scanRes?.format?.duration || streams[0]?.duration);
        if (!isNaN(dur) && dur > 0) {
          setVideoDuration(dur);
        }
        const subs = streams
          .filter((s: any) => s.codec_type === 'subtitle')
          .map((s: any, i: number) => {
            const lang = s.tags?.language || s.tags?.LANGUAGE || 'und';
            const title = s.tags?.title || s.tags?.TITLE || '';
            const codec = (s.codec_name || s.codec_tag_string || 'SUB').toUpperCase();
            return {
              index: `0:s:${i}`,
              language: lang,
              title: title,
              codec: codec,
              label: title || (lang !== 'und' ? lang.toUpperCase() : `Legenda ${i + 1}`)
            };
          });
        const audios = streams
          .filter((s: any) => s.codec_type === 'audio')
          .map((s: any, i: number) => {
            const lang = s.tags?.language || s.tags?.LANGUAGE || 'und';
            const title = s.tags?.title || s.tags?.TITLE || '';
            const codec = (s.codec_name || s.codec_tag_string || 'AAC').toUpperCase();
            return {
              index: `0:a:${i}`,
              language: lang,
              title: title,
              codec: codec,
              label: title || (lang !== 'und' ? lang.toUpperCase() : `Áudio ${i + 1}`)
            };
          });
        setEmbeddedSubs(subs);
        setEmbeddedAudios(audios);
        
        if (audios.length > 0) {
          setPrimaryAudioTrack(audios[0].index);
        }
        setExtraSubtitleTracks(new Set(subs.map((s: any) => s.index)));
        if (audios.length > 1) {
          setExtraAudioTracks(new Set(audios.slice(1).map((a: any) => a.index)));
        }
      } catch (err: any) {
        console.warn('Falha ao rodar o escâner:', err.message);
      } finally {
        setIsScanning(false);
      }
    }
  }, []);

  const toggleExtraAudio = useCallback((index: string) => {
    setExtraAudioTracks(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleExtraSubtitle = useCallback((index: string) => {
    setExtraSubtitleTracks(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  return {
    isScanning,
    videoDuration,
    embeddedSubs,
    embeddedAudios,
    primaryAudioTrack,
    setPrimaryAudioTrack,
    extraAudioTracks,
    extraSubtitleTracks,
    toggleExtraAudio,
    toggleExtraSubtitle,
    resetTracks,
    scanFilePath
  };
}
