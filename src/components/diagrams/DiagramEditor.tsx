import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Tldraw, Editor, getSnapshot, loadSnapshot, createTLStore } from 'tldraw';
import type { TLStore } from 'tldraw';
import 'tldraw/tldraw.css';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { DiagramMeta } from '../../types';
import { triggerToast } from '../ui/ToastContext';
import { useTranslation } from '../../i18n';

interface DiagramEditorProps {
  diagram: DiagramMeta;
  onBack: () => void;
}

const DiagramEditor = ({ diagram, onBack }: DiagramEditorProps) => {
  const { t } = useTranslation();
  const [store, setStore] = useState<TLStore | null>(null);
  const [loading, setLoading] = useState(true);
  const editorRef = useRef<Editor | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const unlistenRef = useRef<(() => void) | null>(null);

  const saveCurrentDiagram = useCallback(async () => {
    if (!editorRef.current || !window.api?.diagrams) return;
    try {
      const snapshot = getSnapshot(editorRef.current.store);
      const jsonStr = JSON.stringify(snapshot);
      await window.api.diagrams.update({
        id: diagram.id,
        content: jsonStr
      });
    } catch (err) {
      console.error("Erro ao salvar diagrama", err);
    }
  }, [diagram.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onBack();
      }
    };
    const handleBackPress = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      onBack();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [onBack]);

  useEffect(() => {
    let isCancelled = false;
    const initStore = async () => {
      if (window.api?.diagrams) {
        try {
          const data = await window.api.diagrams.getContent(diagram.id);
          if (isCancelled) return;

          const newStore = createTLStore();
          
          if (data?.content) {
            try {
              const snapshot = JSON.parse(data.content);
              loadSnapshot(newStore, snapshot);
            } catch (e) {
              console.error("Failed to load snapshot", e);
              triggerToast(t('diagrams.restoreError'), 'error');
            }
          }
          
          setStore(newStore);
        } catch (e: unknown) {
          console.error(e);
          const errorMsg = e instanceof Error ? e.message : t('diagrams.contentLoadError');
          triggerToast(errorMsg, 'error');
        } finally {
          if (!isCancelled) setLoading(false);
        }
      }
    };
    initStore();
    
    return () => {
      isCancelled = true;
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
        // Flush pending changes on unmount to guarantee zero data loss
        saveCurrentDiagram();
      }
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, [diagram.id, saveCurrentDiagram, t]);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    
    // Set dark theme as default to match app appearance
    editor.user.updateUserPreferences({ colorScheme: 'dark' });

    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }

    unlistenRef.current = editor.store.listen(() => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      
      saveTimeout.current = setTimeout(async () => {
        if (!editorRef.current || !window.api?.diagrams) return;
        
        try {
          const snapshot = getSnapshot(editorRef.current.store);
          const jsonStr = JSON.stringify(snapshot);
          await window.api.diagrams.update({
            id: diagram.id,
            content: jsonStr
          });
        } catch (err) {
          console.error("Erro ao salvar diagrama", err);
        }
      }, 1500);
    });
  }, [diagram.id]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-bg text-dark-subtext">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative" style={{ height: '100dvh' }}>
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 z-[9999] bg-dark-card border border-white/10 hover:bg-white/10 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 font-medium transition-colors"
      >
        <ArrowLeft size={16} /> {diagram.title}
      </button>
      
      <div className="flex-1 w-full relative">
        {store && (
          <Tldraw
            store={store}
            onMount={handleMount}
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(DiagramEditor);
