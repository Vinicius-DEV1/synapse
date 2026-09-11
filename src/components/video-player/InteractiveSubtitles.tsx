import { useState, useEffect, useMemo } from 'react';
import type { SubtitleCue } from '../../utils/vtt-parser';

const wordSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;

const HIGHLIGHT_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  yellow: { bg: 'rgba(234, 179, 8, 0.3)', text: '#facc15' },
  green: { bg: 'rgba(34, 197, 94, 0.3)', text: '#4ade80' },
  blue: { bg: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
  purple: { bg: 'rgba(168, 85, 247, 0.3)', text: '#c084fc' },
  pink: { bg: 'rgba(236, 72, 153, 0.3)', text: '#f472b6' },
  red: { bg: 'rgba(239, 68, 68, 0.3)', text: '#f87171' }
};

interface InteractiveSubtitlesProps {
  cues?: SubtitleCue[];
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  currentSubtitle?: string;
  onWordClick: (word: string, context: string) => void;
  savedWords?: Array<{ word: string, color: string }>;
  subtitleOffset?: number;
}

export default function InteractiveSubtitles({ 
  cues = [], 
  videoRef, 
  currentSubtitle: directSubtitle, 
  onWordClick, 
  savedWords = [],
  subtitleOffset = 0 
}: InteractiveSubtitlesProps) {
  const [internalSubtitle, setInternalSubtitle] = useState('');
  const currentSubtitle = directSubtitle !== undefined ? directSubtitle : internalSubtitle;

  useEffect(() => {
    if (directSubtitle !== undefined) return;
    const vid = videoRef?.current;
    if (!vid) return;

    const handleTimeUpdate = () => {
      const time = vid.currentTime - (subtitleOffset / 1000);
      if (cues.length > 0) {
        let left = 0;
        let right = cues.length - 1;
        let activeCue = undefined;
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          const cue = cues[mid];
          if (time >= cue.startTime && time <= cue.endTime) {
            activeCue = cue;
            break;
          } else if (time < cue.startTime) {
            right = mid - 1;
          } else {
            left = mid + 1;
          }
        }
        const newText = activeCue ? activeCue.text : '';
        setInternalSubtitle(prev => prev !== newText ? newText : prev);
      } else {
        setInternalSubtitle('');
      }
    };

    vid.addEventListener('timeupdate', handleTimeUpdate);
    return () => vid.removeEventListener('timeupdate', handleTimeUpdate);
  }, [cues, videoRef, directSubtitle, subtitleOffset]);
  // Regex to split by spaces and punctuation, but keeping punctuation so it renders correctly
  const tokens = useMemo(() => {
    if (!currentSubtitle) return [];
    
    // Nuclear cleanup: remove zero-width formatting characters and standardize ALL whitespace
    // This absolutely guarantees no weird "mega spaces" can exist in the string before tokenization
    const nuclearSubtitle = currentSubtitle
      .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!wordSegmenter) {
      return nuclearSubtitle.split(/(\s+)/).map(text => ({
        text,
        isWord: /\w+/.test(text)
      }));
    }

    // Robust tokenization using hoisted native Intl.Segmenter
    const segments = Array.from(wordSegmenter.segment(nuclearSubtitle));
    
    return segments.map(seg => {
      if (seg.isWordLike) {
        return { text: seg.segment, isWord: true };
      } else {
        // Force compress any sequence of whitespace into a single standard space
        let cleanSpace = seg.segment.replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ');
        if (cleanSpace.trim().length === 0 && cleanSpace.length > 0) {
          cleanSpace = ' ';
        }
        return { text: cleanSpace, isWord: false };
      }
    });
  }, [currentSubtitle]);

  const savedWordsMap = useMemo(() => {
    const map = new Map<string, { word: string, color: string }>();
    savedWords.forEach(w => map.set(w.word.toLowerCase(), w));
    return map;
  }, [savedWords]);

  if (!currentSubtitle) return null;

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const selectedText = sel.toString().trim();
    if (selectedText.length > 0) {
      // Clear selection so UI stays clean
      sel.removeAllRanges();
      onWordClick(selectedText, currentSubtitle);
    }
  };

  return (
    <div className="absolute bottom-16 left-0 right-0 flex justify-center w-full pointer-events-none z-10">
      <div 
        className="bg-black/70 backdrop-blur-sm px-6 py-3 rounded-xl max-w-[80%] text-center pointer-events-auto shadow-lg"
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
      >
        <p className="text-white text-2xl sm:text-3xl font-medium leading-relaxed drop-shadow-md">
          {tokens.map((token, index) => {
            if (token.isWord) {
              const savedMatch = savedWordsMap.get(token.text.toLowerCase());
              const colorInfo = savedMatch ? (HIGHLIGHT_COLOR_MAP[savedMatch.color] || HIGHLIGHT_COLOR_MAP.yellow) : undefined;
              const highlightStyle = colorInfo
                ? { backgroundColor: colorInfo.bg, color: colorInfo.text }
                : {};
                
              return (
                <span
                  key={index}
                  onClick={() => {
                    const sel = window.getSelection();
                    // Prevent single click firing if the user is selecting text
                    if (sel && !sel.isCollapsed) return;
                    onWordClick(token.text, currentSubtitle);
                  }}
                  style={highlightStyle}
                  className={`cursor-pointer hover:bg-brand-500/40 hover:text-brand-100 px-0.5 rounded transition-colors duration-150 ${savedMatch ? 'font-semibold' : ''}`}
                >
                  {token.text}
                </span>
              );
            } else {
              return <span key={index}>{token.text}</span>;
            }
          })}
        </p>
      </div>
    </div>
  );
}
