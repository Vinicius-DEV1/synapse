import { useEffect, useState } from 'react';
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
  saveAsNewPreset: (presetName?: string) => void;
}

export function ChatSessionSettingsModal({
  isOpen, onClose, session, customPrompt, setCustomPrompt, presets, saveCustomPrompt, saveAsNewPreset
}: ChatSessionSettingsModalProps) {
  const [isNamingPreset, setIsNamingPreset] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setCustomPrompt(session.custom_prompt || '');
        onClose();
      }
    };
    const handleBackPress = (e: Event) => {
      e.preventDefault();
      setCustomPrompt(session.custom_prompt || '');
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [isOpen, session.custom_prompt, setCustomPrompt, onClose]);

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
              className="w-full h-48 p-3 bg-black/20 border border-white/[0.08] rounded-xl text-sm text-white/90 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-brand-500/50 resize-none mb-4"
            />
            
            {presets.length > 0 && (
              <div className="mb-4">
                <label className="text-xs text-dark-subtext mb-1 block">Carregar Preset Salvo</label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 bg-black/20 border border-white/[0.08] rounded-lg text-sm text-white/90 p-2 focus:outline-none focus:border-brand-500/50"
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
              {isNamingPreset ? (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/20 border border-white/[0.08]">
                  <input
                    type="text"
                    value={presetNameInput}
                    onChange={(e) => setPresetNameInput(e.target.value)}
                    placeholder="Nome do novo preset..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && presetNameInput.trim()) {
                        saveAsNewPreset(presetNameInput.trim());
                        setPresetNameInput('');
                        setIsNamingPreset(false);
                      } else if (e.key === 'Escape') {
                        setIsNamingPreset(false);
                      }
                    }}
                    className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!presetNameInput.trim()) return;
                        saveAsNewPreset(presetNameInput.trim());
                        setPresetNameInput('');
                        setIsNamingPreset(false);
                      }}
                      disabled={!presetNameInput.trim()}
                      className="flex-1 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNamingPreset(false);
                        setPresetNameInput('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white text-xs font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsNamingPreset(true)}
                  disabled={!customPrompt.trim()}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors text-sm disabled:opacity-50 disabled:hover:bg-white/5"
                >
                  Salvar como Novo Preset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
