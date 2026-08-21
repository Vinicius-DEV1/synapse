import { useRef, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { getYDocStateAsBase64 } from '../../../utils/yjs-utils';
import * as Y from 'yjs';
import { Editor } from '@tiptap/core';
import { getEditorBackupMap } from './editorBackupStore';
import { triggerToast } from '../../ui/ToastContext';

interface UseEditorSaveProps {
  pageId: string | null;
  ydocRef: MutableRefObject<Y.Doc | null>;
  onSaveRef: MutableRefObject<Function>;
  latestContentRef: MutableRefObject<{ html: string; crdt: string } | null>;
}

export function useEditorSave({
  pageId,
  ydocRef,
  onSaveRef,
  latestContentRef,
}: UseEditorSaveProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const hasPendingChangesRef = useRef(false);

  const flushSave = useCallback(() => {
    if (!hasPendingChangesRef.current || !ydocRef.current || !editorRef.current) return;

    try {
      const editor = editorRef.current;
      const html = editor.getHTML();
      const crdtState = getYDocStateAsBase64(ydocRef.current);
      latestContentRef.current = { html, crdt: crdtState };

      if (pageId) {
        getEditorBackupMap().set(pageId, { html, crdt: crdtState });
      }

      hasPendingChangesRef.current = false;
      const currentOnSave = onSaveRef.current;
      const currentPageId = pageId;

      const saveResult = currentOnSave(html, crdtState, []) as any;
      if (saveResult && typeof saveResult.catch === 'function') {
        saveResult.catch((err: any) => {
          console.error(`[Caderno:Save] Falha ao persistir página ${currentPageId}:`, err);
          triggerToast('Falha ao salvar página. Verifique o armazenamento.', 'error');
        });
      }
    } catch (err) {
      console.error('[Caderno:Save] Erro ao serializar conteúdo para salvamento:', err);
    }
  }, [pageId, ydocRef, latestContentRef, onSaveRef]);

  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      if (!ydocRef.current) return;

      editorRef.current = editor;
      hasPendingChangesRef.current = true;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(() => {
        flushSave();
      }, 2500);
    },
    [ydocRef, flushSave]
  );

  const cleanupSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    flushSave();
  }, [flushSave]);

  return { handleUpdate, cleanupSave, flushSave };
}
