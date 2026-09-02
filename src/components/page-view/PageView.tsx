import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import type { Page } from '../../types';
import Editor from '../Editor';
import SubPageGrid from '../editor/components/SubPageGrid';
import EmptyState from '../EmptyState';
import PageHistoryModal from '../modals/PageHistoryModal';
import { PageCover } from './PageCover';
import { PageHeader } from './PageHeader';
import { PageUnlockForm } from './PageUnlockForm';
import { getEditorBackupMap } from '../editor/hooks/editorBackupStore';

const pageContentCache = new Map<string, { content: string; encrypted_content: string | null }>();

interface PageViewProps {
  page: Page | null;
  onUpdateContent: (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[], senderInstanceId?: string) => Promise<void>;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onCreateLinkedPage: (title: string, parentId: string | null) => Promise<string | null>;
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
      .filter((p: Page) => p.parent_id === page.id && !p.deleted_at)
      .sort((a: Page, b: Page) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [page, state.pages]);

  // SWR: Synchronously populate contentData if cached in-memory or in editor backup store
  if (page?.id && page.id !== contentPageId) {
    setContentPageId(page.id);
    if (!page.is_locked) {
      setIsUnlocked(true);
      const backup = getEditorBackupMap().get(page.id);
      const cached = pageContentCache.get(page.id);
      if (backup?.html) {
        setContentData({ content: backup.html, encrypted_content: null });
      } else if (cached) {
        setContentData(cached);
      } else {
        setContentData(null);
      }
    } else {
      setContentData(null);
      setIsUnlocked(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    const fetchContent = (isBackground = false) => {
      if (!page?.id || !window.api?.getPageContent) return;
      window.api.getPageContent(page.id).then((data: { content: string; encrypted_content: string | null }) => {
        if (!mounted || !data) return;
        pageContentCache.set(page.id, data);
        if (isBackground) {
          setContentData((prev) => {
            if (
              prev &&
              prev.content === data.content &&
              prev.encrypted_content === data.encrypted_content
            ) {
              return prev;
            }
            return data;
          });
        } else {
          setContentData(data);
          if (!page.is_locked) setIsUnlocked(true);
        }
      }).catch(err => {
        if (mounted) {
          console.error(`[Caderno:PageView] Failed to load content for ${page.id}:`, err);
        }
      });
    };

    fetchContent(false);

    const handleFocusCheck = () => {
      if (document.visibilityState === 'visible') {
        fetchContent(true);
      }
    };

    document.addEventListener('visibilitychange', handleFocusCheck);
    window.addEventListener('focus', handleFocusCheck);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleFocusCheck);
      window.removeEventListener('focus', handleFocusCheck);
    };
  }, [page?.id, page?.is_locked]);

  const handleSave = useCallback((content: string, crdtState: string | null, embeddedSaves?: { id: string; content: string }[], senderInstanceId?: string) => {
    if (page?.id) {
      pageContentCache.set(page.id, { content, encrypted_content: null });
      onUpdateContent(page.id, content, crdtState, embeddedSaves, senderInstanceId);
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

      <div className={`max-w-5xl mx-auto px-4 sm:px-8 md:px-12 pb-12 animate-fade-in ${page.cover_image ? 'pt-8' : ''}`}>
        
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
             onUnlockSuccess={(decrypted) => {
               if (decrypted) {
                 setContentData((prev) => ({
                   content: decrypted,
                   encrypted_content: prev?.encrypted_content || null,
                 }));
               }
               setIsUnlocked(true);
             }} 
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
