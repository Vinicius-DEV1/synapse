/**
 * @file ShareContentViewer.tsx
 * @description Standalone full-canvas viewer and live collaboration editor for shared pages.
 * Zero distraction, zero sidebar, zero tabs — pure typography and live cursors with animal personas.
 */

import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Users, Lock, Sparkles, Check } from 'lucide-react';
import type {
  SharedPageConfig,
  VisitorPersona,
  SharePresenceState,
} from '../../types/sharing';
import {
  broadcastCollabUpdate,
  listenToCollabUpdates,
  broadcastPresence,
  listenToPresence,
  removePresence,
} from '../../services/sharing/share-collab';

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
  const [content, setContent] = useState(initialContent);
  const [peers, setPeers] = useState<SharePresenceState[]>([]);
  const [isSaved, setIsSaved] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  // ─── Presence & Cursors ───────────────────────────────────────────────────
  useEffect(() => {
    // Initial presence broadcast
    broadcastPresence(config.id, {
      deviceId: myDeviceId,
      persona: myPersona,
      cursor: null,
      lastActive: Date.now(),
    });

    // Heartbeat every 15 seconds
    const interval = setInterval(() => {
      broadcastPresence(config.id, {
        deviceId: myDeviceId,
        persona: myPersona,
        cursor: null,
        lastActive: Date.now(),
      });
    }, 15_000);

    // Listen to other peers
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
    if (config.permission !== 'editable') return;

    const unsubscribe = listenToCollabUpdates(
      config.id,
      myDeviceId,
      shareKey,
      (incomingBytes) => {
        try {
          const text = new TextDecoder().decode(incomingBytes);
          setContent(text);
          if (editorRef.current && editorRef.current.innerHTML !== text) {
            editorRef.current.innerHTML = text;
          }
        } catch {
          // Ignore parse errors
        }
      }
    );

    return () => unsubscribe();
  }, [config.id, config.permission, myDeviceId, shareKey]);

  // Handle local text edits
  const handleContentInput = () => {
    if (!editorRef.current || config.permission !== 'editable') return;
    const newHtml = editorRef.current.innerHTML;
    setContent(newHtml);
    setIsSaved(false);

    // Broadcast encrypted update
    const bytes = new TextEncoder().encode(newHtml);
    broadcastCollabUpdate(config.id, myDeviceId, bytes, shareKey)
      .then(() => setIsSaved(true))
      .catch(() => {});
  };

  // Sanitized content for read-only mode
  const sanitizedHtml = DOMPurify.sanitize(content, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30">
      {/* Zen Minimal Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/[0.06] px-6 py-3.5 flex items-center justify-between">
        {/* Left: Brand + Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">{config.icon || '📄'}</span>
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
          {config.permission === 'editable' && (
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
          <div className="text-5xl mb-4">{config.icon || '📄'}</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 tracking-tight leading-tight">
            {config.title || 'Sem Título'}
          </h1>
        </div>

        {/* Document Content */}
        {config.permission === 'editable' ? (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleContentInput}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            className="prose prose-invert max-w-none focus:outline-none min-h-[60vh] text-zinc-200 leading-relaxed text-base editor-prose"
          />
        ) : (
          <article
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            className="prose prose-invert max-w-none text-zinc-200 leading-relaxed text-base editor-prose"
          />
        )}
      </main>

      {/* Discreet Zen Footer */}
      <footer className="py-6 border-t border-white/[0.04] text-center text-xs text-zinc-600">
        Caderno · Criptografia de Ponta a Ponta com Isolamento Criptográfico
      </footer>
    </div>
  );
};
