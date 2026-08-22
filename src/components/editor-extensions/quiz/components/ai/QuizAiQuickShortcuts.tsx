import React from 'react';
import { PlusCircle, FileText, Edit3, Tag } from 'lucide-react';

interface QuizAiQuickShortcutsProps {
  onSendMessage: (override?: string) => Promise<void>;
}

export function QuizAiQuickShortcuts({ onSendMessage }: QuizAiQuickShortcutsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2.5 max-w-xl pt-2">
      <button
        onClick={() =>
          onSendMessage(
            'Crie 3 questões de nível intermediário sobre este tema com explicações didáticas detalhadas.'
          )
        }
        className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
      >
        <PlusCircle size={13} className="text-purple-400" />
        <span>Gerar 3 questões intermediárias</span>
      </button>
      <button
        onClick={() =>
          onSendMessage(
            'Crie 2 questões discursivas (abertas) com gabarito de referência completo e detalhado.'
          )
        }
        className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
      >
        <FileText size={13} className="text-purple-400" />
        <span>Gerar 2 questões abertas com gabarito</span>
      </button>
      <button
        onClick={() =>
          onSendMessage(
            'Revise a didática das alternativas de todas as questões, eliminando ambiguidades e melhorando os distratores.'
          )
        }
        className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
      >
        <Edit3 size={13} className="text-purple-400" />
        <span>Revisar distratores e clareza</span>
      </button>
      <button
        onClick={() =>
          onSendMessage(
            'Adicione tags temáticas relevantes e aprofunde as explicações do gabarito das questões.'
          )
        }
        className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
      >
        <Tag size={13} className="text-purple-400" />
        <span>Adicionar tags e aprofundar gabarito</span>
      </button>
    </div>
  );
}
