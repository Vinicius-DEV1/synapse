import { useState, useEffect } from 'react';
import type { VideoItem } from '../../../types';
import type { SubtitleCue } from '../../../utils/vtt-parser';

export function useVideoVocabulary(
  video: VideoItem,
  cues: SubtitleCue[],
  activeCueText: string
) {
  const [videoWords, setVideoWords] = useState<any[]>([]);
  const [showVocabDrawer, setShowVocabDrawer] = useState(false);

  const loadVideoWords = async () => {
    if (window.api?.sync) {
      try {
        const words = await window.api.sync.getTable('video_words');
        const currentVideoWords = words.filter((w: any) => w.video_id === video.id && !w.deleted_at);
        setVideoWords(currentVideoWords);
      } catch(e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadVideoWords();
  }, [video.id]);

  const activeSavedWords = videoWords.filter(vw => {
    const activeCue = cues.find(c => vw.timestamp >= c.startTime && vw.timestamp <= c.endTime);
    return activeCue && activeCue.text === activeCueText;
  });

  return {
    videoWords,
    showVocabDrawer,
    setShowVocabDrawer,
    activeSavedWords,
    loadVideoWords
  };
}
