/**
 * @file ShareContentViewer.tsx
 * @description Standalone full-canvas rich viewer and live collaboration editor for shared pages.
 * Renders complete ProseMirror/TipTap rich content identical to Caderno desktop:
 * collapsible toggles, callouts, widgets, code blocks, tables, highlights, and live cursors.
 */

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Users, Lock, Sparkles, Check } from 'lucide-react';
import type {
  SharedPageConfig,
  SharedPagePayload,
  VisitorPersona,
  SharePresenceState,
} from '../../types/sharing';
import { decryptFromShare } from '../../services/sharing/share-crypto';
import {
  broadcastCollabUpdate,
  listenToCollabUpdates,
  broadcastPresence,
  listenToPresence,
  removePresence,
} from '../../services/sharing/share-collab';
import { useEditorExtensions } from '../../components/editor/hooks/useEditorExtensions';

interface ShareContentViewerProps {
  config: SharedPageConfig;
  initialContent: string;
  shareKey: CryptoKey;
  myDeviceId: string;
  myPersona: VisitorPersona;
}

export const ShareContentViewer: React.FC<ShareContentViewerProps> = ({
  config,
  initialContent,
  shareKey,
  myDeviceId,
  myPersona,
}) => {
  const [peers, setPeers] = useState<SharePresenceState[]>([]);
  const [isSaved, setIsSaved] = useState(true);

  const isEditable = config.permission === 'editable';
  const extensions = useEditorExtensions(null);

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: isEditable,
    editorProps: {
      attributes: {
        class: 'editor-content min-h-[50vh] leading-relaxed text-dark-text/90 focus:outline-none text-base',
        spellcheck: 'false',
      },
      handleClick: (_view, _pos, event) => {
        const targetElement = event.target as HTMLElement;
        const spoiler = targetElement.closest('.caderno-spoiler, [data-type="spoiler"]');
        if (spoiler) {
          if (event.altKey) {
            spoiler.classList.toggle('is-revealed');
            return true;
          } else if (!spoiler.classList.contains('is-revealed')) {
            spoiler.classList.add('is-revealed');
            return true;
          }
        }
        const link = targetElement.closest('a');
        if (link && link.href) {
          const href = link.href.trim();
          if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
            window.open(href, '_blank', 'noopener,noreferrer');
            return true;
          }
        }
        return false;
      },
    },
    onCreate: ({ editor: currentEditor }) => {
      if (initialContent && typeof initialContent === 'string' && initialContent.trim().length > 0) {
        try {
          if (currentEditor.isEmpty) {
            currentEditor.commands.setContent(initialContent, { emitUpdate: false });
          }
        } catch (err) {
          console.error('[ShareContentViewer] Error setting initial content in onCreate:', err);
        }
      }
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (!isEditable) return;
      setIsSaved(false);
      const newHtml = currentEditor.getHTML();
      const bytes = new TextEncoder().encode(newHtml);
      broadcastCollabUpdate(config.id, myDeviceId, bytes, shareKey)
        .then(() => setIsSaved(true))
        .catch(() => {});
    },
  });

  // Ensure content gets set if editor was created before initialContent was ready
  useEffect(() => {
    if (editor && !editor.isDestroyed && initialContent && editor.isEmpty) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [editor, initialContent]);

  // ─── Presence & Cursors ───────────────────────────────────────────────────
  useEffect(() => {
    broadcastPresence(config.id, {
      deviceId: myDeviceId,
      persona: myPersona,
      cursor: null,
      lastActive: Date.now(),
    });

    const interval = setInterval(() => {
      broadcastPresence(config.id, {
        deviceId: myDeviceId,
        persona: myPersona,
        cursor: null,
        lastActive: Date.now(),
      });
    }, 15_000);

    const unsubscribe = listenToPresence(config.id, myDeviceId, (activePeers) => {
      setPeers(activePeers);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
      removePresence(config.id, myDeviceId);
    };
  }, [config.id, myDeviceId, myPersona]);

  // ─── Real-time Collab Updates (if editable) ──────────────────────────────
  useEffect(() => {
    if (!isEditable) return;

    const unsubscribe = listenToCollabUpdates(
      config.id,
      myDeviceId,
      shareKey,
      (incomingBytes) => {
        try {
          const text = new TextDecoder().decode(incomingBytes);
          if (text && editor && !editor.isDestroyed && editor.getHTML() !== text) {
            editor.commands.setContent(text, { emitUpdate: false });
          }
        } catch {
          // Ignore parse errors
        }
      }
    );

    return () => unsubscribe();
  }, [config.id, isEditable, myDeviceId, shareKey, editor]);

  // ─── Listen to Owner Updates to Shared Page Content ───────────────────────
  useEffect(() => {
    const contentRef = doc(db, 'shared_page_content', config.id);
    const unsubscribe = onSnapshot(
      contentRef,
      async (snap) => {
        if (!snap.exists()) return;
        const payload = snap.data() as SharedPagePayload;
        if (payload?.encryptedContent) {
          try {
            const decrypted = await decryptFromShare(payload.encryptedContent, shareKey);
            if (decrypted && editor && !editor.isDestroyed && editor.getHTML() !== decrypted) {
              editor.commands.setContent(decrypted, { emitUpdate: false });
            }
          } catch (err) {
            console.debug('[ShareContentViewer] Error decrypting remote content update:', err);
          }
        }
      },
      (err) => {
        console.warn('[ShareContentViewer] Error listening to remote shared_page_content:', err);
      }
    );

    return () => unsubscribe();
  }, [config.id, editor, shareKey]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30">
      {/* Zen Minimal Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/[0.06] px-6 py-3.5 flex items-center justify-between">
        {/* Left: Brand + Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl select-none">{config.icon || '📄'}</span>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate max-w-sm sm:max-w-md">
              {config.title || 'Sem Título'}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Lock size={11} className="text-emerald-400" />
                <span>E2EE</span>
              </span>
              <span>·</span>
              <span>Caderno</span>
            </div>
          </div>
        </div>

        {/* Right: Persona Badge + Peers + Mode indicator */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Active Collaborators Counter */}
          {peers.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-white/[0.06] text-xs text-zinc-300">
              <Users size={13} className="text-indigo-400" />
              <span>{peers.length + 1} ativos</span>
              <div className="flex -space-x-1 ml-1">
                {peers.slice(0, 3).map((peer) => (
                  <span
                    key={peer.deviceId}
                    title={`${peer.persona.name} (${peer.persona.tagline})`}
                    className="w-3.5 h-3.5 rounded-full border border-zinc-950 flex items-center justify-center text-[8px] font-bold text-black"
                    style={{ backgroundColor: peer.persona.color }}
                  >
                    {peer.persona.animal.charAt(0)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Visitor Persona Moniker */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: `${myPersona.color}15`,
              borderColor: `${myPersona.color}35`,
              color: myPersona.color,
            }}
            title={myPersona.tagline}
          >
            <Sparkles size={12} />
            <span className="font-mono">{myPersona.name}</span>
          </div>

          {/* Editable Mode Status */}
          {isEditable && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              {isSaved ? (
                <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                  <Check size={12} />
                  <span>Sincronizado</span>
                </span>
              ) : (
                <span className="text-amber-400 text-[11px]">Salvando...</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Column */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 md:py-16">
        {/* Title display */}
        <div className="mb-8">
          <div className="text-5xl mb-4 select-none">{config.icon || '📄'}</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 tracking-tight leading-tight">
            {config.title || 'Sem Título'}
          </h1>
        </div>

        {/* TipTap Document Content */}
        <div className="editor-container relative z-0">
          <EditorContent editor={editor} />
        </div>
      </main>

      {/* Discreet Zen Footer */}
      <footer className="py-6 border-t border-white/[0.04] text-center text-xs text-zinc-600">
        Caderno · Criptografia de Ponta a Ponta com Isolamento Criptográfico
      </footer>
    </div>
  );
};
