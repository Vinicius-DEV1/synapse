import React from 'react';
import { Tag } from 'lucide-react';
import type { QuestionItem } from '../types';

interface QuizTagsFilterProps {
  tags: string[];
  questions: QuestionItem[];
  selectedTagFilter: string | null;
  onSelectTag: (tag: string | null) => void;
}

export default function QuizTagsFilter({
  tags,
  questions,
  selectedTagFilter,
  onSelectTag,
}: QuizTagsFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-purple-500/10">
      <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1 mr-1">
        <Tag size={11} />
        <span>Filtrar:</span>
      </span>
      <button
        onClick={() => onSelectTag(null)}
        className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-colors ${
          selectedTagFilter === null
            ? 'bg-purple-600 border-purple-500 text-white font-semibold'
            : 'bg-black/30 border-white/10 text-dark-subtext hover:text-white'
        }`}
      >
        Todas ({questions.length})
      </button>
      {tags.map((tag) => {
        const count = questions.filter((q) => q.tags?.includes(tag)).length;
        const isSelected = selectedTagFilter === tag;
        return (
          <button
            key={tag}
            onClick={() => onSelectTag(isSelected ? null : tag)}
            className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-colors ${
              isSelected
                ? 'bg-purple-600 border-purple-500 text-white font-semibold'
                : 'bg-black/30 border-white/10 text-purple-300 hover:text-white'
            }`}
          >
            #{tag} ({count})
          </button>
        );
      })}
    </div>
  );
}
