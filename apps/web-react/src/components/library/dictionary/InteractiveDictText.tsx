import React from 'react';

interface InteractiveDictTextProps {
  text: string;
  onWordClick?: (word: string) => void;
  className?: string;
}

export function InteractiveDictText({ text, onWordClick, className = '' }: InteractiveDictTextProps) {
  if (!text) return null;

  // Split by unicode words (letters, marks/accents, hyphens, apostrophes)
  const parts = text.split(/([\p{L}\p{M}'-]+)/u);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Even indices are separators, odd indices are words
        if (index % 2 === 0) {
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }
        
        return (
          <span
            key={index}
            onClick={(e) => {
              if (onWordClick) {
                e.preventDefault();
                e.stopPropagation();
                onWordClick(part);
              }
            }}
            className={
              onWordClick
                ? 'hover:bg-brand-500/15 hover:text-brand-300 rounded cursor-pointer transition-colors duration-150 inline-block px-[1px]'
                : ''
            }
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}
