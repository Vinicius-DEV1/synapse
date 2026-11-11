
interface ChatSuggestionsReviewProps {
  suggestions: any[];
  setSuggestions: (s: any[]) => void;
  setActiveReviewAction: (a: any) => void;
}

export function ChatSuggestionsReview({ suggestions, setSuggestions, setActiveReviewAction }: ChatSuggestionsReviewProps) {
  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">{suggestions.length} Cartões Sugeridos</h3>
        <button 
          onClick={() => { setSuggestions([]); setActiveReviewAction(null); }}
          className="text-sm text-dark-subtext hover:text-white transition-colors"
        >
          Voltar ao Chat
        </button>
      </div>
      <div className="space-y-3">
        {suggestions.map((card, idx) => (
            <div key={idx} className="bg-dark-bg border border-white/5 rounded-xl p-4 flex flex-col gap-2">
              <p className="text-sm font-semibold text-indigo-300">Frente ({card.type})</p>
              <p className="text-dark-text">{card.front}</p>
              {card.type !== 'cloze' && card.back && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-green-300 mb-1">Verso</p>
                  <p className="text-dark-subtext whitespace-pre-wrap">{card.back}</p>
                </div>
              )}
              {card.tags && card.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {card.tags.map((tag: string, tagIdx: number) => (
                    <span key={tagIdx} className="px-2 py-0.5 bg-black/20 text-dark-subtext border border-white/5 rounded-full text-[10px] font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
        ))}
      </div>
    </div>
  );
}
