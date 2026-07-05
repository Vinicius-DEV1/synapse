import React, { useMemo } from 'react';

interface InteractiveSubtitlesProps {
  currentSubtitle: string;
  onWordClick: (word: string, context: string) => void;
  savedWords?: Array<{ word: string, color: string }>;
}

export default function InteractiveSubtitles({ currentSubtitle, onWordClick, savedWords = [] }: InteractiveSubtitlesProps) {
  // Regex to split by spaces and punctuation, but keeping punctuation so it renders correctly
  const tokens = useMemo(() => {
    if (!currentSubtitle) return [];
    
    // Robust tokenization using native Intl.Segmenter (handles all languages, emojis, and punctuation correctly)
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
    const segments = Array.from(segmenter.segment(currentSubtitle));
    
    return segments.map(seg => {
      if (seg.isWordLike) {
        return { text: seg.segment, isWord: true };
      } else {
        // Force compress any sequence of whitespace (including HTML spaces, tabs, etc) into a single standard space
        let cleanSpace = seg.segment.replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ');
        
        // If it's pure whitespace, just return a single space. Otherwise, it might be punctuation like ". "
        if (cleanSpace.trim().length === 0 && cleanSpace.length > 0) {
          cleanSpace = ' ';
        }
        
        return { text: cleanSpace, isWord: false };
      }
    });
  }, [currentSubtitle]);

  if (!currentSubtitle) return null;

  return (
    <div className="absolute bottom-16 left-0 right-0 flex justify-center w-full pointer-events-none z-10">
      <div className="bg-black/70 backdrop-blur-sm px-6 py-3 rounded-xl max-w-[80%] text-center pointer-events-auto shadow-lg">
        <p className="text-white text-2xl sm:text-3xl font-medium leading-relaxed drop-shadow-md">
          {tokens.map((token, index) => {
            if (token.isWord) {
              const savedMatch = savedWords.find(w => w.word.toLowerCase() === token.text.toLowerCase());
              const highlightStyle = savedMatch 
                ? { backgroundColor: savedMatch.color === 'yellow' ? 'rgba(234, 179, 8, 0.3)' : savedMatch.color === 'green' ? 'rgba(34, 197, 94, 0.3)' : savedMatch.color === 'blue' ? 'rgba(59, 130, 246, 0.3)' : savedMatch.color === 'purple' ? 'rgba(168, 85, 247, 0.3)' : savedMatch.color === 'pink' ? 'rgba(236, 72, 153, 0.3)' : savedMatch.color === 'red' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)',
                    color: savedMatch.color === 'yellow' ? '#facc15' : savedMatch.color === 'green' ? '#4ade80' : savedMatch.color === 'blue' ? '#60a5fa' : savedMatch.color === 'purple' ? '#c084fc' : savedMatch.color === 'pink' ? '#f472b6' : savedMatch.color === 'red' ? '#f87171' : '#facc15' }
                : {};
                
              return (
                <span
                  key={index}
                  onClick={() => onWordClick(token.text, currentSubtitle)}
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
