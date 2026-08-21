import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import type { Page } from '../../types';
import Editor from '../Editor';
import SubPageGrid from '../SubPageGrid';
import EmptyState from '../EmptyState';
import PageHistoryModal from '../PageHistoryModal';
import { PageCover } from './PageCover';
import { PageHeader } from './PageHeader';
import { PageUnlockForm } from './PageUnlockForm';

interface PageViewProps {
  page: Page | null;
  onUpdateContent: (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[]) => Promise<void>;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onCreateLinkedPage: (title: string, parentId: string | null) => Promise<string>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
}

export default function PageView({ page, onUpdateContent, onCreatePage, onCreateLinkedPage, onUpdatePage }: PageViewProps) {
  const { state, dispatch } = useStore();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [contentData, setContentData] = useState<{ content: string; encrypted_content: string | null } | null>(null);
  const [contentPageId, setContentPageId] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const childPages = useMemo(() => {
    if (!page) return [];
    return state.pages
      .filter((p: Page) => p.parent_id === page.id)
      .sort((a: Page, b: Page) => a.sort_order - b.sort_order);
  }, [page, state.pages]);

  // Reset contentData synchronously when page changes to prevent stale content leaking
  if (page?.id && page.id !== contentPageId) {
    setContentData(null);
    setContentPageId(page.id);
    setIsUnlocked(false);
  }

  useEffect(() => {
    let mounted = true;
    if (page?.id) {
      window.api.getPageContent(page.id).then((data: any) => {
        if (mounted) {
          setContentData(data);
          if (!page.is_locked) setIsUnlocked(true);
        }
      }).catch(err => {
        if (mounted) {
          console.error(`[Caderno:PageView] Failed to load content for ${page.id}:`, err);
        }
      });
    }
    return () => { mounted = false; };
  }, [page?.id, page?.is_locked]);

  const handleSave = useCallback((content: string, crdtState: string | null, embeddedSaves?: { id: string; content: string }[]) => {
    if (page?.id) {
      onUpdateContent(page.id, content, crdtState, embeddedSaves);
    }
  }, [page?.id, onUpdateContent]);

  const handleCreateLinked = useCallback((title: string) => {
    return onCreateLinkedPage(title, page?.id || null);
  }, [page?.id, onCreateLinkedPage]);

  if (!page) {
    return <EmptyState onCreatePage={() => onCreatePage(null)} />;
  }

  const handleNavigate = (pageId: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
  };

  return (
    <div className="h-full overflow-y-auto relative bg-dark-bg" id="page-view-scroll">
      <PageCover page={page} onUpdatePage={onUpdatePage} />

      <div className={`max-w-5xl mx-auto px-12 pb-12 animate-fade-in ${page.cover_image ? 'pt-8' : ''}`}>
        
        <PageHeader 
          page={page} 
          onUpdatePage={onUpdatePage} 
          onShowHistory={() => setShowHistoryModal(true)} 
        />

        {childPages.length > 0 && (
          <div className="mb-10">
            <SubPageGrid
              pages={childPages}
              onNavigate={handleNavigate}
              onCreatePage={() => onCreatePage(page.id)}
              onUpdatePage={onUpdatePage}
            />
          </div>
        )}

        {!contentData ? (
           <div className="text-dark-subtext mt-8 flex justify-center">Carregando conteúdo...</div>
        ) : page.is_locked && !isUnlocked ? (
           <PageUnlockForm 
             page={page} 
             encryptedContent={contentData.encrypted_content} 
             onUnlockSuccess={() => setIsUnlocked(true)} 
           />
        ) : (
          <Editor
            key={page.id}
            pageId={page.id}
            initialContent={contentData.content}
            initialCrdtState={page.crdt_state}
            onSave={handleSave}
            onCreateLinkedPage={handleCreateLinked}
          />
        )}

        {showHistoryModal && (
          <PageHistoryModal pageId={page.id} onClose={() => setShowHistoryModal(false)} />
        )}
      </div>
    </div>
  );
}
