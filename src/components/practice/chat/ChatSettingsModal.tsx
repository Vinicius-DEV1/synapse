import React from 'react';
import { X, Sliders, Play, Loader2 } from 'lucide-react';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  globalSystemPrompt: string;
  setGlobalSystemPrompt: (val: string) => void;
  saveGlobalPrompt: (val: string) => void;
  defaultSystemInstruction: string;
  previewVoice: (voiceName: string) => void;
  previewingVoice: string | null;
}

export function ChatSettingsModal({
  isOpen, onClose, globalSystemPrompt, setGlobalSystemPrompt, saveGlobalPrompt, defaultSystemInstruction, previewVoice, previewingVoice
}: ChatSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[60] bg-dark-bg/80 backdrop-blur-sm flex justify-end">
      <div className="w-[400px] h-full bg-dark-card border-l border-white/5 flex flex-col shadow-2xl animate-in slide-in-from-right-8 duration-300">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-400">
            <Sliders size={20} />
            <h3 className="font-semibold text-white">Configurações de Voz</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-dark-subtext"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          
          {/* Global Prompt Config */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Prompt Base da IA (Global)</h4>
            <p className="text-xs text-dark-subtext mb-3">Essa é a instrução padrão que a IA recebe em todas as conversas. Ela dita a personalidade, o idioma principal e o tom geral do seu professor.</p>
            <textarea 
              value={globalSystemPrompt}
              onChange={(e) => setGlobalSystemPrompt(e.target.value)}
              onBlur={(e) => saveGlobalPrompt(e.target.value)}
              placeholder="Escreva como a IA deve agir globalmente..."
              className="w-full h-40 p-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white/90 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-brand-500/50 resize-none"
            />
            <button 
              onClick={() => {
                setGlobalSystemPrompt(defaultSystemInstruction);
                saveGlobalPrompt(defaultSystemInstruction);
              }}
              className="mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              Restaurar padrão
            </button>
          </div>
          
          {/* Voice Config */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Voz da IA</h4>
            <p className="text-xs text-dark-subtext mb-4">Configuração do modelo de áudio bidirecional.</p>
            
            <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-brand-400">Áudio Nativo (Latência Zero)</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed mb-3">
                Para alcançar uma conversa em tempo real sem nenhum atraso, o sistema utiliza um modelo de IA cujo processamento de áudio é nativo e unificado (em vez de traduzir texto para fala). Por causa dessa arquitetura de ponta, a voz da IA é <strong>única e embutida diretamente na rede neural</strong>, não sendo possível alterá-la.
              </p>
              
              <button 
                onClick={() => previewVoice('Puck')}
                disabled={previewingVoice !== null}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50"
              >
                {previewingVoice === 'Puck' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Ouvir Amostra
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
