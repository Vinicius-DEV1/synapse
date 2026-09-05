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

export interface PageContentData {
  content: string;
  encrypted_content: string | null;
}

const pageContentCache = new Map<string, PageContentData>();

function getCachedPageContent(pageId: string): PageContentData | null {
  const backup = getEditorBackupMap().get(pageId);
  if (backup?.html) {
    return { content: backup.html, encrypted_content: null };
  }
  return pageContentCache.get(pageId) || null;
}

interface PageViewProps {
  page: Page | null;
  onUpdateContent: (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[], senderInstanceId?: string) => Promise<void>;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onCreateLinkedPage: (title: string, parentId: string | null) => Promise<string | null>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  isActive?: boolean;
}

export default function PageView({ page, onUpdateContent, onCreatePage, onCreateLinkedPage, onUpdatePage, isActive = true }: PageViewProps) {
  const { state, dispatch } = useStore();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadedData, setLoadedData] = useState<{ pageId: string; data: PageContentData } | null>(null);
  const [unlockedPageIds, setUnlockedPageIds] = useState<Set<string>>(() => new Set());

  const activePageId = page?.id || null;
  const isLocked = Boolean(page?.is_locked);
  const isUnlocked = !isLocked || (activePageId !== null && unlockedPageIds.has(activePageId));

  // SWR: Synchronously resolve cached content for active page to guarantee 0ms perceived latency
  const contentData: PageContentData | null = useMemo(() => {
    if (!activePageId) return null;
    if (loadedData && loadedData.pageId === activePageId) {
      return loadedData.data;
    }
    return getCachedPageContent(activePageId);
  }, [activePageId, loadedData]);

  const childPages = useMemo(() => {
    if (!page) return [];
    return state.pages
      .filter((p: Page) => p.parent_id === page.id && !p.deleted_at)
      .sort((a: Page, b: Page) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [page, state.pages]);

  useEffect(() => {
    let mounted = true;

    const fetchContent = (isBackground = false) => {
      if (!page?.id || !window.api?.getPageContent) return;
      const targetPageId = page.id;

      window.api.getPageContent(targetPageId).then((data: PageContentData) => {
        if (!mounted || !data) return;
        pageContentCache.set(targetPageId, data);
        if (isBackground) {
          setLoadedData((prev) => {
            if (
              prev &&
              prev.pageId === targetPageId &&
              prev.data.content === data.content &&
              prev.data.encrypted_content === data.encrypted_content
            ) {
              return prev;
            }
            return { pageId: targetPageId, data };
          });
        } else {
          setLoadedData({ pageId: targetPageId, data });
        }
      }).catch(err => {
        if (mounted) {
          console.error(`[Caderno:PageView] Failed to load content for ${targetPageId}:`, err);
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
      const data: PageContentData = { content, encrypted_content: null };
      pageContentCache.set(page.id, data);
      setLoadedData({ pageId: page.id, data });
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
               if (page?.id) {
                 setUnlockedPageIds((prev) => new Set(prev).add(page.id));
                 if (decrypted) {
                   const newData: PageContentData = {
                     content: decrypted,
                     encrypted_content: contentData?.encrypted_content || null,
                   };
                   pageContentCache.set(page.id, newData);
                   setLoadedData({ pageId: page.id, data: newData });
                 }
               }
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
            isActive={isActive}
          />
        )}

        {showHistoryModal && (
          <PageHistoryModal pageId={page.id} onClose={() => setShowHistoryModal(false)} />
        )}
      </div>
    </div>
  );
}
