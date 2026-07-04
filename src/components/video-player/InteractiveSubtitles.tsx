import React, { useMemo } from 'react';

interface InteractiveSubtitlesProps {
  currentSubtitle: string;
  onWordClick: (word: string, context: string) => void;
}

export default function InteractiveSubtitles({ currentSubtitle, onWordClick }: InteractiveSubtitlesProps) {
  // Regex to split by spaces and punctuation, but keeping punctuation so it renders correctly
  const tokens = useMemo(() => {
    if (!currentSubtitle) return [];
    // Split by word boundaries or specific punctuation, mapping to object { text, isWord }
    // A simple approach is to match words and non-words
    const regex = /([\wÀ-ÿ'-]+)|([^\wÀ-ÿ'-]+)/g;
    const result = [];
    let match;
    while ((match = regex.exec(currentSubtitle)) !== null) {
      if (match[1]) {
        result.push({ text: match[1], isWord: true });
      } else if (match[2]) {
        result.push({ text: match[2], isWord: false });
      }
    }
    return result;
  }, [currentSubtitle]);

  if (!currentSubtitle) return null;

  return (
    <div className="absolute bottom-16 left-0 right-0 flex justify-center w-full pointer-events-none z-10">
      <div className="bg-black/70 backdrop-blur-sm px-6 py-3 rounded-xl max-w-[80%] text-center pointer-events-auto shadow-lg">
        <p className="text-white text-2xl sm:text-3xl font-medium leading-relaxed drop-shadow-md">
          {tokens.map((token, index) => (
            token.isWord ? (
              <span
                key={index}
                onClick={() => onWordClick(token.text, currentSubtitle)}
                className="cursor-pointer hover:bg-brand-500/40 hover:text-brand-100 px-0.5 rounded transition-colors duration-150"
              >
                {token.text}
              </span>
            ) : (
              <span key={index}>{token.text}</span>
            )
          ))}
        </p>
      </div>
    </div>
  );
}
