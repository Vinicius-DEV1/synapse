import { useRef, MutableRefObject, useCallback } from 'react';
import { getYDocStateAsBase64 } from '../../../utils/yjs-utils';
import * as Y from 'yjs';
import { Editor } from '@tiptap/core';

interface UseEditorSaveProps {
  pageId: string | null;
  ydocRef: MutableRefObject<Y.Doc | null>;
  onSaveRef: MutableRefObject<Function>;
  latestContentRef: MutableRefObject<{ html: string, crdt: string } | null>;
}

export function useEditorSave({ pageId, ydocRef, onSaveRef, latestContentRef }: UseEditorSaveProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdate = useCallback(({ editor }: { editor: Editor }) => {
    if (!ydocRef.current) return;

    const html = editor.getHTML();
    const crdtState = getYDocStateAsBase64(ydocRef.current);
    latestContentRef.current = { html, crdt: crdtState };

    if (pageId) {
      window.__cadernoEditorBackup.set(pageId, { html, crdt: crdtState });
    }
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    const currentOnSave = onSaveRef.current;
    const currentContent = { ...latestContentRef.current };
    const currentPageId = pageId;

    saveTimeoutRef.current = setTimeout(() => {
      if (!currentContent) return;
      const saveResult = currentOnSave(currentContent.html, currentContent.crdt, []) as any;
      if (saveResult && typeof saveResult.then === 'function') {
        saveResult.catch((err: any) => {
          console.error(`[Caderno:Debounce] Save FAILED for ${currentPageId}:`, err);
        });
      }
    }, 2000);
  }, [pageId, ydocRef, latestContentRef, onSaveRef]);

  const cleanupSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  }, []);

  return { handleUpdate, cleanupSave };
}
