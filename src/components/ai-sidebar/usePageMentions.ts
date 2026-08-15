import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { getPageAndDescendants } from '../../utils/content-extractor';

export interface AttachedPage {
  id: string;
  title: string;
  content?: string;
  isLoading?: boolean;
}

export function usePageMentions(
  prompt: string,
  setPrompt: (p: string) => void
) {
  const { state } = useStore();
  const [attachedPages, setAttachedPages] = useState<AttachedPage[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  const currentPage = activeTab?.pageId ? state.pages.find(p => p.id === activeTab.pageId) : undefined;

  const handleAttachPage = useCallback(async (page: { id: string; title: string; content?: string }) => {
    if (!attachedPages.some(p => p.id === page.id)) {
      setAttachedPages(prev => {
        if (prev.some(p => p.id === page.id)) return prev;
        return [...prev, { id: page.id, title: page.title, content: page.content, isLoading: true }];
      });

      let content = page.content;
      if (activeTab?.pageId === page.id && activeTab?.unsavedContent) {
        content = activeTab.unsavedContent;
      }
      if (!content && window.api?.getPageContent) {
        try {
          const fullData = await window.api.getPageContent(page.id);
          content = fullData?.content || '';
        } catch (err) {
          console.error('Erro ao buscar conteúdo da página para o chat:', err);
        }
      }
      setAttachedPages(prev =>
        prev.map(p => (p.id === page.id ? { ...p, content, isLoading: false } : p))
      );
    }
    if (showMentionMenu) {
      const newPrompt = prompt.replace(/(?:^|\s)@([^\s@]*)$/, '').trim();
      setPrompt(newPrompt);
      setShowMentionMenu(false);
    }
  }, [attachedPages, activeTab, showMentionMenu, prompt, setPrompt]);

  const handleAttachPageTree = useCallback(async (rootPage: { id: string; title: string; content?: string }) => {
    const pagesToAttach = getPageAndDescendants(rootPage.id, state.pages);
    for (const p of pagesToAttach) {
      await handleAttachPage(p);
    }
  }, [state.pages, handleAttachPage]);

  const filteredPages = useMemo(() => {
    const query = mentionQuery.toLowerCase().trim();
    let list = state.pages.filter(p => p.title.toLowerCase().includes(query));
    if (currentPage && currentPage.title.toLowerCase().includes(query)) {
      list = [currentPage, ...list.filter(p => p.id !== currentPage.id)];
    }
    return list.slice(0, 6);
  }, [state.pages, mentionQuery, currentPage]);

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPrompt(val);
    const match = val.match(/(?:^|\s)@([^\s@]*)$/);
    if (match) {
      setShowMentionMenu(true);
      setMentionQuery(match[1]);
      setMentionSelectedIndex(0);
    } else {
      setShowMentionMenu(false);
    }
  }, [setPrompt]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionMenu && filteredPages.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev + 1) % filteredPages.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev - 1 + filteredPages.length) % filteredPages.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredPages[mentionSelectedIndex] || filteredPages[0];
        if (selected) {
          handleAttachPage(selected);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
      }
    }
  }, [showMentionMenu, filteredPages, mentionSelectedIndex, handleAttachPage]);

  return {
    attachedPages,
    setAttachedPages,
    showMentionMenu,
    setShowMentionMenu,
    mentionQuery,
    mentionSelectedIndex,
    filteredPages,
    handleAttachPage,
    handleAttachPageTree,
    handlePromptChange,
    handleKeyDown
  };
}
