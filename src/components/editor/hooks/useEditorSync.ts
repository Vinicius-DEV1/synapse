import React, { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as Y from 'yjs';
import { applyBase64StateToYDoc } from '../../../utils/yjs-utils';
import { getEditorBackupMap } from './editorBackupStore';

interface UseEditorSyncProps {
  pageId: string | null;
  initialCrdtState?: string | null;
  onSaveRef: MutableRefObject<Function>;
  latestContentRef: MutableRefObject<{ html: string, crdt: string } | null>;
}

export function useEditorSync({ pageId, initialCrdtState, onSaveRef, latestContentRef }: UseEditorSyncProps) {
  const hasMeaningfulCrdt = !!initialCrdtState && initialCrdtState.length > 8;

  const [ydoc] = React.useState(() => {
    const doc = new Y.Doc();
    doc.guid = pageId || 'temp';
    
    if (hasMeaningfulCrdt) {
      applyBase64StateToYDoc(doc, initialCrdtState!);
    }
    
    const backupMap = getEditorBackupMap();
    const backup = backupMap.get(pageId);
    if (backup?.crdt && backup.crdt.length > 8) {
      applyBase64StateToYDoc(doc, backup.crdt);
      backupMap.delete(pageId);
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

