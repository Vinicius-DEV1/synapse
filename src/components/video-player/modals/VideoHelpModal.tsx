import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface VideoHelpModalProps {
  onClose: () => void;
}

export const VideoHelpModal: React.FC<VideoHelpModalProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm pointer-events-auto">
      <div className="relative bg-[#1E1E24] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/20 rounded-lg text-brand-400">
              <Keyboard size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Atalhos e Controles</h2>
              <p className="text-sm text-white/60">Domine o player com o teclado e o mouse</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          {/* Mouse Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-brand-400 font-semibold mb-4 text-base">
              <div className="w-1.5 h-4 bg-brand-500 rounded-full" />
              Controles de Mouse
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between">
                <span className="text-white/80">Pausar / Reproduzir</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">Clique</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Tela Cheia</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">Duplo Clique</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Ajustar Volume</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">Scroll (Roda)</span>
              </li>
            </ul>
          </div>

          {/* Playback Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-brand-400 font-semibold mb-4 text-base">
              <div className="w-1.5 h-4 bg-brand-500 rounded-full" />
              Reprodução
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between">
                <span className="text-white/80">Pausar / Reproduzir</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">Espaço</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Avançar 5s</span>
                <div className="flex gap-1">
                  <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">L</span>
                  <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">→</span>
                </div>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Voltar 5s</span>
                <div className="flex gap-1">
                  <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">J</span>
                  <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">←</span>
                </div>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Marcar Loop Início (A)</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">I</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Marcar Loop Fim (B)</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">O</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Remover Loop A-B</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">P</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Acelerar Vídeo</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">Shift + &gt;</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Desacelerar Vídeo</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">Shift + &lt;</span>
              </li>
            </ul>
          </div>

          {/* Tracks Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-brand-400 font-semibold mb-4 text-base">
              <div className="w-1.5 h-4 bg-brand-500 rounded-full" />
              Áudio e Legendas
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between">
                <span className="text-white/80">Alternar Idioma (Áudio)</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">A</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Alternar Legenda</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">S</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Adiantar Legenda (100ms)</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">]</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Atrasar Legenda (100ms)</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">[</span>
              </li>
            </ul>
          </div>

          {/* System Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-brand-400 font-semibold mb-4 text-base">
              <div className="w-1.5 h-4 bg-brand-500 rounded-full" />
              Sistema
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between">
                <span className="text-white/80">Tela Cheia</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">F</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-white/80">Sair da Tela Cheia</span>
                <span className="bg-white/10 text-white px-2 py-1 rounded text-xs font-mono">Esc</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
