import React from 'react';
import { escapeRegex } from './search-utils';

export function HighlightedText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  if (!query || !query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegex);

  if (terms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${terms.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span
            key={i}
            className="text-brand-300 font-semibold bg-brand-500/20 px-0.5 rounded"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
}
