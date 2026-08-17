import { useRef, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { getYDocStateAsBase64 } from '../../../utils/yjs-utils';
import * as Y from 'yjs';
import { Editor } from '@tiptap/core';
import { getEditorBackupMap } from './editorBackupStore';

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

    // Debug: rastrear IDs de encrypted-image no HTML salvo
    const encImgMatches = html.match(/data-drive-file-id="([^"]+)"/g);
    const blobMatches = html.match(/src="blob:[^"]+"/g);
    if (encImgMatches || blobMatches) {
      console.log(`[EditorSave] HTML contém ${encImgMatches?.length || 0} encrypted-image(s): ${encImgMatches?.join(', ') || 'nenhuma'}`);
      if (blobMatches) {
        console.warn(`[EditorSave] ⚠️ HTML contém ${blobMatches.length} blob URL(s) que VÃO QUEBRAR no restart: ${blobMatches.join(', ')}`);
      }
    }

    if (pageId) {
      getEditorBackupMap().set(pageId, { html, crdt: crdtState });
    }
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    const currentOnSave = onSaveRef.current;
    const currentContent = { ...latestContentRef.current };
    const currentPageId = pageId;

    saveTimeoutRef.current = setTimeout(() => {
      if (!currentContent) return;
      console.log(`[EditorSave:Debounce] Salvando página ${currentPageId}. HTML length=${currentContent.html.length}`);
      const saveResult = currentOnSave(currentContent.html, currentContent.crdt, []) as any;
      if (saveResult && typeof saveResult.then === 'function') {
        saveResult.then(() => {
          console.log(`[EditorSave:Debounce] Save OK para ${currentPageId}`);
        }).catch((err: any) => {
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
