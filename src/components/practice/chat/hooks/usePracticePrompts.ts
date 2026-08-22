import { useState, useEffect } from 'react';
import type { TutorSession } from '../../../../types';

export const DEFAULT_SYSTEM_INSTRUCTION = `Você é um amigo humano próximo do usuário.
Fale SEMPRE e APENAS em Português do Brasil (pt-BR).
Sua linguagem deve ser muito acolhedora e natural, com sotaque brasileiro.
Inicie a conversa perguntando de forma casual se o usuário está conseguindo te ouvir perfeitamente.`;

export function usePracticePrompts(session: TutorSession) {
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState(
    () => localStorage.getItem('globalSystemPrompt') || DEFAULT_SYSTEM_INSTRUCTION
  );
  const [customPrompt, setCustomPrompt] = useState(session.custom_prompt || '');
  const [presets, setPresets] = useState<{ id: string; name: string; prompt: string }[]>([]);

  useEffect(() => {
    const loadPresets = async () => {
      if (!window.api?.config) return;
      try {
        const stored = await window.api.config.get('practice_presets');
        if (stored && Array.isArray(stored)) {
          setPresets(stored);
        }
      } catch (err) {
        console.error('Failed to load presets', err);
      }
    };
    loadPresets();
  }, []);

  const saveGlobalPrompt = (newPrompt: string) => {
    setGlobalSystemPrompt(newPrompt);
    localStorage.setItem('globalSystemPrompt', newPrompt);
  };

  const saveCustomPrompt = async () => {
    try {
      const val = customPrompt.trim() === '' ? null : customPrompt;
      await window.api?.practice?.updateSession({
        ...session,
        custom_prompt: val,
      });
      session.custom_prompt = val;
    } catch (err) {
      console.error('Failed to update session prompt', err);
    }
  };

  const saveAsNewPreset = async () => {
    if (!window.api?.config) return;
    const name = window.prompt('Nome para este novo Preset de Instruções:');
    if (!name || name.trim() === '') return;

    const newPreset = { id: Date.now().toString(), name, prompt: customPrompt };
    const newPresets = [...presets, newPreset];
    try {
      await window.api.config.set('practice_presets', newPresets);
      setPresets(newPresets);
    } catch (err) {
      console.error('Failed to save preset', err);
    }
  };

  return {
    globalSystemPrompt,
    setGlobalSystemPrompt,
    customPrompt,
    setCustomPrompt,
    presets,
    saveGlobalPrompt,
    saveCustomPrompt,
    saveAsNewPreset,
  };
}
