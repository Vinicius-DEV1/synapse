import React, { useState, useEffect } from 'react';
import { Edit3, Save, RotateCcw } from 'lucide-react';
import { getAiPrompt, saveAiPrompt, getWebDb } from '../../../services/db-web';
import { DEFAULT_CARD_GENERATION_PROMPT, DEFAULT_CHAT_ANALYSIS_PROMPT } from '../../../services/gemini';

export function PromptsTab() {
  const [activePromptModule, setActivePromptModule] = useState<'anki_card_suggestions' | 'anki_chat_analysis'>('anki_card_suggestions');
  const [promptContent, setPromptContent] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  useEffect(() => {
    loadPrompt();
  }, [activePromptModule]);

  const loadPrompt = async () => {
    try {
      const customPrompt = await getAiPrompt(activePromptModule);
      if (customPrompt) {
        setPromptContent(customPrompt);
      } else {
        setPromptContent(activePromptModule === 'anki_card_suggestions' ? DEFAULT_CARD_GENERATION_PROMPT : DEFAULT_CHAT_ANALYSIS_PROMPT);
      }
    } catch (e) {
      console.error('Failed to load prompt', e);
    }
  };

  const handleSavePrompt = async () => {
    setIsSavingPrompt(true);
    try {
      await saveAiPrompt(activePromptModule, 'anki', promptContent);
      alert('Prompt salvo com sucesso! O sistema usará essa instrução a partir de agora.');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar prompt.');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleRestorePrompt = async () => {
    if (!confirm('Deseja realmente restaurar o prompt padrão? Todas as suas edições para este módulo serão perdidas.')) return;
    setIsSavingPrompt(true);
    try {
      const db = await getWebDb();
      await db.delete('ai_prompts', activePromptModule);
      await loadPrompt();
      alert('Prompt restaurado para o padrão de fábrica.');
    } catch (e) {
      console.error(e);
      alert('Erro ao restaurar prompt.');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full min-h-[500px]">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Prompts do Sistema (Engenharia de IA)</h3>
        <p className="text-dark-subtext text-sm leading-relaxed">
          Você tem acesso total aos cérebros que operam o Assistente de IA do Anki. Edite as instruções de sistema livremente para criar comportamentos customizados. Lembre-se de não remover as exigências de retorno em formato JSON válido para que o app continue funcionando.
        </p>
      </div>

      <div className="flex bg-white/5 p-1 rounded-lg shrink-0">
        <button 
          onClick={() => setActivePromptModule('anki_card_suggestions')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activePromptModule === 'anki_card_suggestions' ? 'bg-indigo-600 text-white shadow-sm' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
        >
          Geração de Cartões
        </button>
        <button 
          onClick={() => setActivePromptModule('anki_chat_analysis')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activePromptModule === 'anki_chat_analysis' ? 'bg-indigo-600 text-white shadow-sm' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
        >
          Análise Interativa (Chat)
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-[300px]">
        <textarea 
          value={promptContent}
          onChange={(e) => setPromptContent(e.target.value)}
          className="w-full flex-1 bg-dark-bg border border-white/10 rounded-xl p-4 text-sm text-indigo-100 font-mono focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed"
          spellCheck={false}
        />
      </div>

      <div className="flex justify-end gap-3 shrink-0">
        <button 
          onClick={handleRestorePrompt}
          disabled={isSavingPrompt}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Restaurar Padrão
        </button>
        <button 
          onClick={handleSavePrompt}
          disabled={isSavingPrompt}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSavingPrompt ? 'Salvando...' : 'Salvar Prompt'}
        </button>
      </div>
    </div>
  );
}
