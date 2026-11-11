import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
}

export function TagInput({ tags, setTags }: TagInputProps) {
  const [tagInput, setTagInput] = useState('');

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-dark-subtext mb-1">Tags</label>
      <div className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 flex flex-wrap gap-2 items-center focus-within:border-indigo-500 transition-colors">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md text-xs font-medium">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-indigo-100 focus:outline-none ml-1">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input 
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          className="flex-1 bg-transparent border-none text-sm text-dark-text focus:outline-none min-w-[100px]"
          placeholder={tags.length === 0 ? "Ex: dificil, phrasal_verbs (Pressione Enter)" : ""}
        />
      </div>
    </div>
  );
}
