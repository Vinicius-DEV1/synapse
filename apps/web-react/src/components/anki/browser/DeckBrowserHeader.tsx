import { X, Settings, HardDrive } from 'lucide-react';
import type { Deck } from '../types';

interface DeckBrowserHeaderProps {
  deck: Deck;
  showSettings: boolean;
  onToggleSettings: () => void;
  onClose: () => void;
}

export function DeckBrowserHeader({
  deck,
  showSettings,
  onToggleSettings,
  onClose,
}: DeckBrowserHeaderProps) {
  return (
    <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-bg shrink-0">
      <div>
        <h2 className="text-2xl font-bold text-dark-text flex items-center gap-2">
          <HardDrive className="text-indigo-400" />
          {deck.name}
        </h2>
        <p className="text-sm text-dark-subtext mt-1">{deck.description}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onToggleSettings}
          className={`p-2 rounded hover:bg-white/10 transition-colors ${
            showSettings ? 'bg-white/10 text-indigo-400' : 'text-dark-subtext'
          }`}
          title="Configurações do Baralho"
        >
          <Settings size={20} />
        </button>
        <button
          onClick={onClose}
          className="p-2 text-dark-subtext hover:text-white rounded hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
