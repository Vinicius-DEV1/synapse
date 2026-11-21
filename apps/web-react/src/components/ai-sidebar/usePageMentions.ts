import React, { useState, useMemo, useCallback } from 'react';
import { usePages, useStoreSelector, getStoreState } from '../../store/useStore';
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
  const pages = usePages();
  const activePageId = useStoreSelector(
    (s) => s.tabs.find((t) => t.id === s.activeTabId)?.pageId ?? null
  );
  const [attachedPages, setAttachedPages] = useState<AttachedPage[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const currentPage = useMemo(
    () => (activePageId ? pages.find((p) => p.id === activePageId) : undefined),
    [activePageId, pages]
  );

  const handleAttachPage = useCallback(async (page: { id: string; title: string; content?: string }) => {
    if (!attachedPages.some(p => p.id === page.id)) {
      setAttachedPages(prev => {
        if (prev.some(p => p.id === page.id)) return prev;
        return [...prev, { id: page.id, title: page.title, content: page.content, isLoading: true }];
      });

      let content = page.content;
      const latest = getStoreState();
      const activeTab = latest.tabs.find((t) => t.id === latest.activeTabId);
      if (activeTab?.pageId === page.id && activeTab?.unsavedContent) {
        content = activeTab.unsavedContent;
      }
      if (!content && window.api?.getPageContent) {
        try {
          const fullData = await window.api.getPageContent(page.id);
          content = fullData?.content || '';
        } catch (err) {
          console.error('Failed to fetch page content for chat:', err);
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
  }, [attachedPages, showMentionMenu, prompt, setPrompt]);

  const handleAttachPageTree = useCallback(async (rootPage: { id: string; title: string; content?: string }) => {
    const pagesToAttach = getPageAndDescendants(rootPage.id, pages);
    for (const p of pagesToAttach) {
      await handleAttachPage(p);
    }
  }, [pages, handleAttachPage]);

  const filteredPages = useMemo(() => {
    const query = mentionQuery.toLowerCase().trim();
    let list = pages.filter(p => p.title.toLowerCase().includes(query));
    if (currentPage && currentPage.title.toLowerCase().includes(query)) {
      list = [currentPage, ...list.filter(p => p.id !== currentPage.id)];
    }
    return list.slice(0, 6);
  }, [pages, mentionQuery, currentPage]);

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
