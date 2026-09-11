import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Sparkles,
  Copy,
  ExternalLink,
  CheckCircle2,
  Circle,
  Play,
} from 'lucide-react';
import type { YouTubeVideoItem } from './youtubePlaylistHelper';
import { triggerToast } from '../../ui/ToastContext';

interface YouTubePlaylistItemActionsProps {
  video: YouTubeVideoItem;
  isWatched: boolean;
  onToggleWatched: () => void;
  onOpenSummary: () => void;
  onWatch?: () => void;
}

export default function YouTubePlaylistItemActions({
  video,
  isWatched,
  onToggleWatched,
  onOpenSummary,
  onWatch,
}: YouTubePlaylistItemActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setShowMenu(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMenu]);

  const videoUrl = `https://youtube.com/watch?v=${video.id}`;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(videoUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = videoUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      triggerToast('Link do vídeo copiado!', 'info', 2000);
    } catch {
      triggerToast('Não foi possível copiar o link.', 'error');
    }
  };

  return (
    <div className="flex items-center gap-1 shrink-0 ml-2 relative">
      {/* 3 dots menu button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowMenu((prev) => !prev);
        }}
        className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
          showMenu
            ? 'bg-white/15 text-white'
            : 'text-zinc-400 hover:text-white hover:bg-white/10'
        }`}
        title="Mais opções do vídeo"
      >
        <MoreVertical size={16} />
      </button>

      {/* Watched toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleWatched();
        }}
        className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
          isWatched
            ? 'text-brand-400 bg-brand-500/10 hover:bg-brand-500/20'
            : 'text-white/20 hover:text-brand-400 hover:bg-white/5'
        }`}
        title={isWatched ? 'Marcar como não assistido' : 'Marcar como assistido'}
      >
        {isWatched ? (
          <CheckCircle2 size={18} className="drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
        ) : (
          <Circle size={18} />
        )}
      </button>

      {/* Contextual dropdown menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl bg-zinc-900/95 border border-white/[0.08] shadow-2xl backdrop-blur-xl p-1.5 text-xs text-zinc-300 select-none space-y-1 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action 0: Assistir Aqui */}
          {onWatch && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(false);
                onWatch();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/15 text-red-300 hover:text-red-200 transition-colors text-left font-medium cursor-pointer"
            >
              <Play size={14} className="shrink-0 text-red-400 fill-red-400" />
              <span>Assistir Aqui</span>
            </button>
          )}

          {/* Action 1: Resumo do Vídeo */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(false);
              onOpenSummary();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-brand-500/15 text-brand-300 hover:text-brand-200 transition-colors text-left font-medium cursor-pointer"
          >
            <Sparkles size={14} className="shrink-0 text-brand-400" />
            <span>Resumo do Vídeo</span>
          </button>

          <div className="h-[1px] bg-white/[0.06] my-1" />

          {/* Action 2: Copiar Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors text-left cursor-pointer"
          >
            <Copy size={14} className="shrink-0 text-zinc-400" />
            <span>Copiar Link do Vídeo</span>
          </button>

          {/* Action 3: Abrir no YouTube */}
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShowMenu(false)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors text-left cursor-pointer no-underline"
          >
            <ExternalLink size={14} className="shrink-0 text-zinc-400" />
            <span>Assistir no YouTube</span>
          </a>
        </div>
      )}
    </div>
  );
}
