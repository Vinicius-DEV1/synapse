import { useState, useEffect, useMemo, useCallback, lazy, Suspense, memo } from 'react';
import { useStoreDispatch, usePages } from '../../store/useStore';
import type { Page } from '../../types';
import Editor from '../Editor';
import SubPageGrid from '../notes/components/SubPageGrid';
import EmptyState from '../EmptyState';

const PageHistoryModal = lazy(() => import('../modals/PageHistoryModal'));
import { PageCover } from './PageCover';
import { PageHeader } from './PageHeader';
import { PageUnlockForm } from './PageUnlockForm';
import { getEditorBackupMap } from '../notes/hooks/editorBackupStore';
import { fetchPageContentDedup, invalidatePageContentFetch } from './pageContentFetcher';
import { useI18n } from '../../i18n';

import { LruMap } from '../../utils/lru-cache';

export interface PageContentData {
  content: string;
  encrypted_content: string | null;
  crdt_state?: string | null;
  updated_at?: string | null;
}

const pageContentCache = new LruMap<string, PageContentData>(30);

function getCachedPageContent(pageId: string): PageContentData | null {
  const backup = getEditorBackupMap().get(pageId);
  if (backup?.html) {
    return {
      content: backup.html,
      encrypted_content: null,
      crdt_state: backup.crdt || null,
    };
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

function PageView({ page, onUpdateContent, onCreatePage, onCreateLinkedPage, onUpdatePage, isActive = true }: PageViewProps) {
  const dispatch = useStoreDispatch();
  const pages = usePages();
  const { t } = useI18n();
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
    if (!activePageId) return [];
    return pages
      .filter((p: Page) => p.parent_id === activePageId && !p.deleted_at)
      .sort((a: Page, b: Page) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [activePageId, pages]);

  const fetchPageContent = useCallback(
    (targetPageId: string, isBackground: boolean, isMounted: () => boolean) => {
      const request = fetchPageContentDedup(targetPageId);
      if (!request) return;

      request
        .then((data: PageContentData) => {
          if (!isMounted() || !data) return;
          pageContentCache.set(targetPageId, data);
          setLoadedData((prev) => {
            if (
              prev &&
              prev.pageId === targetPageId &&
              prev.data.content === data.content &&
              prev.data.encrypted_content === data.encrypted_content &&
              prev.data.crdt_state === data.crdt_state
            ) {
              return prev;
            }
            return { pageId: targetPageId, data };
          });
        })
        .catch((err) => {
          if (isMounted()) {
            const label = isBackground ? 'background refresh' : 'initial load';
            console.error(`[Caderno:PageView] Failed ${label} for ${targetPageId}:`, err);
          }
        });
    },
    []
  );

  // Initial / page-change content load (does NOT re-fire merely when switching away from a tab)
  useEffect(() => {
    if (!page?.id) return;
    let mounted = true;
    fetchPageContent(page.id, false, () => mounted);
    return () => {
      mounted = false;
    };
  }, [page?.id, page?.is_locked, fetchPageContent]);

  // Background revalidation on window focus/visibility strictly while this tab is active
  useEffect(() => {
    if (!isActive || !page?.id) return;
    const targetPageId = page.id;
    let mounted = true;
    let lastFocusTime = 0;

    const handleFocusCheck = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && now - lastFocusTime > 2000) {
        lastFocusTime = now;
        fetchPageContent(targetPageId, true, () => mounted);
      }
    };

    document.addEventListener('visibilitychange', handleFocusCheck);
    window.addEventListener('focus', handleFocusCheck);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleFocusCheck);
      window.removeEventListener('focus', handleFocusCheck);
    };
  }, [page?.id, isActive, fetchPageContent]);

  const handleSave = useCallback((content: string, crdtState: string | null, embeddedSaves?: { id: string; content: string }[], senderInstanceId?: string) => {
    if (page?.id) {
      invalidatePageContentFetch(page.id);
      const data: PageContentData = { content, encrypted_content: null, crdt_state: crdtState };
      pageContentCache.set(page.id, data);
      // Bail out if already loaded for this page to prevent re-rendering PageView and Editor on every autosave keystroke
      setLoadedData((prev) => (prev?.pageId === page.id ? prev : { pageId: page.id, data }));
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
    <div className="h-full overflow-y-auto relative bg-dark-bg smooth-scroll-container" id="page-view-scroll">
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
           <div className="text-dark-subtext mt-8 flex justify-center">{t('notes.loadingContent')}</div>
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
                     crdt_state: contentData?.crdt_state ?? null,
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
            initialCrdtState={contentData.crdt_state ?? page.crdt_state ?? null}
            onSave={handleSave}
            onCreateLinkedPage={handleCreateLinked}
            isActive={isActive}
          />
        )}

        {showHistoryModal && (
          <Suspense fallback={null}>
            <PageHistoryModal pageId={page.id} onClose={() => setShowHistoryModal(false)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default memo(PageView);
