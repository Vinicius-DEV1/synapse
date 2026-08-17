import { X, FileText } from 'lucide-react';
import type { TutorSession } from '../../../types';

interface ChatSessionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TutorSession;
  customPrompt: string;
  setCustomPrompt: (val: string) => void;
  presets: {id: string, name: string, prompt: string}[];
  saveCustomPrompt: () => void;
  saveAsNewPreset: () => void;
}

export function ChatSessionSettingsModal({
  isOpen, onClose, session, customPrompt, setCustomPrompt, presets, saveCustomPrompt, saveAsNewPreset
}: ChatSessionSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[60] bg-dark-bg/80 backdrop-blur-sm flex justify-end">
      <div className="w-[400px] h-full bg-dark-card border-l border-white/5 flex flex-col shadow-2xl animate-in slide-in-from-right-8 duration-300">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-400">
            <FileText size={20} />
            <h3 className="font-semibold text-white">Opções da Sessão</h3>
          </div>
          <button 
            onClick={() => {
              setCustomPrompt(session.custom_prompt || '');
              onClose();
            }}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-dark-subtext"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Instruções Específicas</h4>
            <p className="text-xs text-dark-subtext mb-4">Se você preencher este campo, o <strong>Prompt Global será totalmente ignorado</strong> e a IA seguirá apenas estas instruções para esta conversa. Útil para praticar idiomas específicos ou criar situações focadas.</p>
            
            <textarea 
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: Você é um garçom em Paris. Fale apenas em Francês..."
              className="w-full h-48 p-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white/90 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-brand-500/50 resize-none mb-4"
            />
            
            {presets.length > 0 && (
              <div className="mb-4">
                <label className="text-xs text-dark-subtext mb-1 block">Carregar Preset Salvo</label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg text-sm text-white/90 p-2 focus:outline-none focus:border-brand-500/50"
                    onChange={(e) => {
                      const p = presets.find(x => x.id === e.target.value);
                      if (p) setCustomPrompt(p.prompt);
                      e.target.value = '';
                    }}
                    defaultValue=""
                  >
                    <option className="bg-dark-bg text-white" value="" disabled>Selecione um preset...</option>
                    {presets.map(p => (
                      <option className="bg-dark-bg text-white" key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={saveCustomPrompt}
                className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors text-sm"
              >
                Salvar na Sessão Atual
              </button>
              <button 
                onClick={saveAsNewPreset}
                disabled={!customPrompt.trim()}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors text-sm disabled:opacity-50 disabled:hover:bg-white/5"
              >
                Salvar como Novo Preset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
