import React, { useEffect, useRef, MutableRefObject } from 'react';
import * as Y from 'yjs';
import { applyBase64StateToYDoc } from '../../../utils/yjs-utils';

interface UseEditorSyncProps {
  pageId: string | null;
  initialCrdtState?: string | null;
  initialContent: string;
  onSaveRef: MutableRefObject<Function>;
  latestContentRef: MutableRefObject<{ html: string, crdt: string } | null>;
}

if (!window.__cadernoEditorBackup) { window.__cadernoEditorBackup = new Map(); }
export function useEditorSync({ pageId, initialCrdtState, initialContent, onSaveRef, latestContentRef }: UseEditorSyncProps) {
  const hasMeaningfulCrdt = !!initialCrdtState && initialCrdtState.length > 8;

  const [ydoc] = React.useState(() => {
    const doc = new Y.Doc();
    doc.guid = pageId || 'temp';
    
    if (hasMeaningfulCrdt) {
      applyBase64StateToYDoc(doc, initialCrdtState!);
    }
    
    const backup = window.__cadernoEditorBackup?.get(pageId);
    if (backup?.crdt && backup.crdt.length > 8) {
      applyBase64StateToYDoc(doc, backup.crdt);
      window.__cadernoEditorBackup.delete(pageId);
    }
    return doc;
  });
  
  const ydocRef = useRef<Y.Doc>(ydoc);
    
    // console.log(`[Caderno:Mount] pageId=${pageId}`);
    


  useEffect(() => {
    const handleRemoteUpdate = (e: CustomEvent) => {
      const { pageId: syncPageId, crdtState } = e.detail;
      if (syncPageId === pageId && ydocRef.current && crdtState) {
        applyBase64StateToYDoc(ydocRef.current, crdtState);
      }
    };
    window.addEventListener('caderno-sync-update', handleRemoteUpdate as EventListener);
    
    return () => {
      window.removeEventListener('caderno-sync-update', handleRemoteUpdate as EventListener);
    };
  }, [pageId]);

  useEffect(() => {
    return () => {
      if (latestContentRef.current && latestContentRef.current.crdt.length > 8) {
        // console.log(`[Caderno:Flush] Unmount flush for pageId=${pageId}`);
        const result = onSaveRef.current(latestContentRef.current.html, latestContentRef.current.crdt, []) as any;
        if (result && typeof result.catch === 'function') {
          result.catch((err: any) => {
            console.error(`[Caderno:Flush] Flush save FAILED for ${pageId}:`, err);
          });
        }
      }
    };
  }, [pageId, latestContentRef, onSaveRef]);

  return { ydocRef };
}

