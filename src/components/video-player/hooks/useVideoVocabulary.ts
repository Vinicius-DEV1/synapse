import { useState, useEffect, useCallback } from 'react';
import type { VideoItem, VideoWord } from '../../../types';
import type { SubtitleCue } from '../../../utils/vtt-parser';

export function useVideoVocabulary(
  video: VideoItem,
  cues: SubtitleCue[],
  activeCueText: string
) {
  const [videoWords, setVideoWords] = useState<VideoWord[]>([]);
  const [showVocabDrawer, setShowVocabDrawer] = useState(false);

  const loadVideoWords = useCallback(async () => {
    if (window.api?.sync) {
      try {
        const words = (await window.api.sync.getTable('video_words')) as VideoWord[];
        const currentVideoWords = words.filter((w: VideoWord) => w.video_id === video.id && !w.deleted_at);
        setVideoWords(currentVideoWords);
      } catch (e) {
        console.error('Failed to load video words:', e);
      }
    }
  }, [video.id]);

  useEffect(() => {
    let isMounted = true;
    const fetchWords = async () => {
      if (window.api?.sync) {
        try {
          const words = (await window.api.sync.getTable('video_words')) as VideoWord[];
          const currentVideoWords = words.filter((w: VideoWord) => w.video_id === video.id && !w.deleted_at);
          if (isMounted) {
            setVideoWords(currentVideoWords);
          }
        } catch (e) {
          console.error('Failed to fetch video words in effect:', e);
        }
      }
    };
    fetchWords();
    return () => {
      isMounted = false;
    };
  }, [video.id]);

  const saveVideoWord = useCallback(async (wordData: {
    word: string;
    context: string;
    timestamp: number;
    color: string;
    note?: string;
  }) => {
    if (window.api?.sync) {
      const newWord: VideoWord = {
        id: crypto.randomUUID(),
        video_id: video.id,
        word: wordData.word,
        context: wordData.context,
        timestamp: wordData.timestamp,
        color: wordData.color,
        note: wordData.note,
      };
      await window.api.sync.upsertRow('video_words', newWord);
      await loadVideoWords();
    }
  }, [video.id, loadVideoWords]);

  const activeSavedWords = videoWords.filter(vw => {
    const activeCue = cues.find(c => vw.timestamp >= c.startTime && vw.timestamp <= c.endTime);
    return activeCue && activeCue.text === activeCueText;
  });

  return {
    videoWords,
    showVocabDrawer,
    setShowVocabDrawer,
    activeSavedWords,
    loadVideoWords,
    saveVideoWord
  };
}
