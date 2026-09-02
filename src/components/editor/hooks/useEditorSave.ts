import { useRef, useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { getYDocStateAsBase64 } from '../../../utils/yjs-utils';
import * as Y from 'yjs';
import { Editor } from '@tiptap/core';
import { getEditorBackupMap } from './editorBackupStore';
import { triggerToast } from '../../ui/ToastContext';

export type EditorSaveCallback = (
  content: string,
  crdtState: string | null,
  embeddedSaves?: { id: string; content: string }[],
  senderInstanceId?: string
) => void | Promise<void>;

interface UseEditorSaveProps {
  pageId: string | null;
  ydocRef: MutableRefObject<Y.Doc | null>;
  onSaveRef: MutableRefObject<EditorSaveCallback>;
  latestContentRef: MutableRefObject<{ html: string; crdt: string } | null>;
  instanceId?: string;
}

export function useEditorSave({
  pageId,
  ydocRef,
  onSaveRef,
  latestContentRef,
  instanceId,
}: UseEditorSaveProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const hasPendingChangesRef = useRef(false);

  const flushSave = useCallback(() => {
    if (!hasPendingChangesRef.current || !ydocRef.current || !editorRef.current) return;

    try {
      const editor = editorRef.current;
      if (editor.isDestroyed) return;

      const html = editor.getHTML();
      const crdtState = getYDocStateAsBase64(ydocRef.current);
      latestContentRef.current = { html, crdt: crdtState };

      if (pageId) {
        getEditorBackupMap().set(pageId, { html, crdt: crdtState });
      }

      hasPendingChangesRef.current = false;
      const currentOnSave = onSaveRef.current;
      const currentPageId = pageId;

      const saveResult = currentOnSave(html, crdtState, [], instanceId);
      if (saveResult && typeof (saveResult as Promise<void>).catch === 'function') {
        (saveResult as Promise<void>).catch((err: unknown) => {
          console.error(`[Caderno:Save] Falha ao persistir página ${currentPageId}:`, err);
          triggerToast('Falha ao salvar página. Verifique o armazenamento.', 'error');
        });
      }
    } catch (err) {
      console.error('[Caderno:Save] Erro ao serializar conteúdo para salvamento:', err);
    }
  }, [pageId, ydocRef, latestContentRef, onSaveRef, instanceId]);

  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      if (!ydocRef.current) return;

      editorRef.current = editor;
      hasPendingChangesRef.current = true;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(() => {
        flushSave();
      }, 1000);
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

  // Save immediately on browser tab switch, window blur, or internal tab change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cleanupSave();
      }
    };
    const handleFlush = () => {
      cleanupSave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleFlush);
    window.addEventListener('beforeunload', handleFlush);
    window.addEventListener('pagehide', handleFlush);
    window.addEventListener('caderno-flush-editor', handleFlush);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleFlush);
      window.removeEventListener('beforeunload', handleFlush);
      window.removeEventListener('pagehide', handleFlush);
      window.removeEventListener('caderno-flush-editor', handleFlush);
    };
  }, [cleanupSave]);

  return { handleUpdate, cleanupSave, flushSave };
}
