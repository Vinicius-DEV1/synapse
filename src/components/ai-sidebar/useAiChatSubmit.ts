import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { promptGemini } from '../../services/gemini';
import { stripHtml, extractImagesFromHtml } from '../../utils/content-extractor';
import type { Page as _Page } from '../../types';

import type { AttachedPage } from './usePageMentions';

interface UseAiChatSubmitProps {
  prompt: string;
  setPrompt: (val: string) => void;
  attachedPages: AttachedPage[];
  setAttachedPages: React.Dispatch<React.SetStateAction<AttachedPage[]>>;
  setShowMentionMenu: (show: boolean) => void;
}

export function useAiChatSubmit({
  prompt,
  setPrompt,
  attachedPages,
  setAttachedPages,
  setShowMentionMenu,
}: UseAiChatSubmitProps) {
  const { state, dispatch } = useStore();
  const [loading, setLoading] = useState(false);

  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  const activeSession = state.activeAiChatId ? state.aiChatSessions[state.activeAiChatId] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && attachedPages.length === 0) || !activeSession) return;

    const promptText = prompt.trim() || 'Faça um resumo com os principais pontos das páginas anexadas.';

    setLoading(true);
    try {
      let finalPromptToSend = promptText;
      const extractedImages: string[] = [];

      if (attachedPages.length > 0) {
        const pagesWithContent = await Promise.all(
          attachedPages.map(async p => {
            let content = p.content;
            if (activeTab?.pageId === p.id && activeTab?.unsavedContent) {
              content = activeTab.unsavedContent;
            }
            if (!content && window.api?.getPageContent) {
              try {
                const fullData = await window.api.getPageContent(p.id);
                content = fullData?.content || '';
              } catch (err) {
                console.error('Erro ao buscar conteúdo no submit:', err);
              }
            }
            return { ...p, content };
          })
        );

        const names = pagesWithContent.map(p => p.title).join(', ');
        const pagesContext = pagesWithContent.map(p => {
          const cleanContent = stripHtml(p.content);
          const pageImgs = extractImagesFromHtml(p.content);
          extractedImages.push(...pageImgs);
          return `📄 Página "${p.title}"${pageImgs.length > 0 ? ` [Contém ${pageImgs.length} imagem(ns) anexa(s)]` : ''}:\n${cleanContent}`;
        }).join('\n\n---\n\n');

        finalPromptToSend = `[Anexos: ${names}]\n--- CONTEXTO DAS PÁGINAS ANEXADAS ---\n${pagesContext}\n--- FIM DO CONTEXTO ---\n\nInstrução:\n${promptText}`;
      }

      const { getSettings } = await import('../../utils/settings');
      const settings = getSettings();
      const imagesToSend = extractedImages.slice(0, 5);
      const responseObj = await promptGemini(
        finalPromptToSend,
        imagesToSend.length > 0 ? imagesToSend : undefined,
        activeSession.messages,
        settings.geminiModelChat || settings.geminiModel
      );
      const response = responseObj.text;
      const newUserMsg = { role: 'user', parts: [{ text: finalPromptToSend }] };
      const newModelMsg = { role: 'model', parts: [{ text: response }], tokens: responseObj.usage };

      dispatch({
        type: 'UPDATE_AI_CHAT',
        session: {
          ...activeSession,
          messages: [...activeSession.messages, newUserMsg, newModelMsg],
          updatedAt: Date.now(),
        },
      });
      setPrompt('');
      setAttachedPages([]);
      setShowMentionMenu(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSubmit,
  };
}
