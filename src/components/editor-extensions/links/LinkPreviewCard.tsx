import React, { useState } from 'react';
import {
  Globe,
  RefreshCw,
  X,
  Clock,
  PlaySquare,
  ListVideo,
  Calendar,
  Plus,
  ChevronDown,
  ChevronUp,
  GripVertical,
  LayoutGrid,
  Ungroup,
  ArrowUp,
  ArrowDown,
  Check,
  Link2,
} from 'lucide-react';
import YouTubePlaylistModal from '../YouTubePlaylistModal';
import { formatDuration, formatDate, isYouTubeUrl, getVideoId } from './youtubeUtils';
import LinkNotesDrawer from './LinkNotesDrawer';

interface LinkPreviewCardProps {
  url: string;
  title: string | null;
  channel: string | null;
  duration: number | null;
  isPlaylist: boolean;
  uploadDate: string | null;
  notes: string;
  showNotes: boolean;
  watched?: boolean;
  loading: boolean;
  isReloading: boolean;
  selected: boolean;
  isInsideGroup: boolean;
  onOpenConfirm: () => void;
  onToggleNotes: (e: React.MouseEvent) => void;
  onToggleWatched?: (e: React.MouseEvent) => void;
  onConvertToText?: (e: React.MouseEvent) => void;
  onChangeNotes: (notes: string) => void;
  onReload: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onUngroup: (e: React.MouseEvent) => void;
  onGroupWithNext: (e: React.MouseEvent) => void;
  onDragStartHandle?: (e: React.MouseEvent) => void;
  onMoveUp?: (e: React.MouseEvent) => void;
  onMoveDown?: (e: React.MouseEvent) => void;
  onAddLineBelow?: (e: React.MouseEvent) => void;
}

export default function LinkPreviewCard({
  url,
  title,
  channel,
  duration,
  isPlaylist,
  uploadDate,
  notes,
  showNotes,
  watched,
  loading,
  isReloading,
  selected,
  isInsideGroup,
  onOpenConfirm,
  onToggleNotes,
  onToggleWatched,
  onConvertToText,
  onChangeNotes,
  onReload,
  onDelete,
  onUngroup,
  onGroupWithNext,
  onDragStartHandle,
  onMoveUp,
  onMoveDown,
  onAddLineBelow,
}: LinkPreviewCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const isYouTube = isYouTubeUrl(url);

  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();

  const renderIcon = () => {
    if (!domain || faviconError) {
      return <Globe size={18} className="text-brand-400" />;
    }
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={`${domain} icon`}
        className="w-5 h-5 rounded-sm"
        onError={() => setFaviconError(true)}
      />
    );
  };

  return (
    <div className="relative group/link">
      {/* Alça e controles de movimentação discretos — subir, adicionar linha, arrastar e descer */}
      <div
        contentEditable={false}
        className="absolute -left-7 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5 rounded-md border border-white/10 bg-dark-bg/90 p-0.5 text-dark-subtext opacity-0 shadow-lg backdrop-blur-xl transition-all group-hover/link:opacity-100"
      >
        {onMoveUp && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMoveUp(e);
            }}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Subir bloco (Mover para cima)"
          >
            <ArrowUp size={11} />
          </button>
        )}
        {onAddLineBelow && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddLineBelow(e);
            }}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Adicionar linha abaixo (+)"
          >
            <Plus size={11} />
          </button>
        )}
        <div
          data-drag-handle
          onMouseDown={onDragStartHandle}
          className="p-0.5 cursor-grab active:cursor-grabbing hover:text-white transition-colors"
          title="Arraste para mover o card de link"
        >
          <GripVertical size={13} />
        </div>
        {onMoveDown && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMoveDown(e);
            }}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Descer bloco (Mover para baixo)"
          >
            <ArrowDown size={11} />
          </button>
        )}
      </div>

      <div
        onClick={onOpenConfirm}
        className={`block transition-all rounded-lg p-3 ${
          isInsideGroup ? 'pr-20' : 'pr-24'
        } cursor-pointer ${
          selected
            ? 'bg-brand-500/5 border border-brand-500/50 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/10'
            : 'bg-dark-card border border-white/10 hover:bg-white/5 hover:border-white/20'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="relative w-8 h-8 rounded bg-dark-bg border border-white/5 flex items-center justify-center shrink-0 overflow-visible mt-0.5">
            {isYouTube ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowVideo(!showVideo);
                }}
                className="w-full h-full flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                title={showVideo ? 'Fechar vídeo' : 'Assistir vídeo'}
              >
                <PlaySquare
                  size={16}
                  className={`${showVideo ? 'text-white' : 'text-brand-500'} drop-shadow-sm flex-shrink-0 transition-colors`}
                />
              </button>
            ) : (
              renderIcon()
            )}
            {watched && (
              <div
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-sm ring-1 ring-black/50 pointer-events-none"
                title="Assistido / Concluído"
              >
                <Check size={9} className="stroke-[3.5]" />
              </div>
            )}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            {loading || isReloading ? (
              <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse mb-1" />
            ) : (
              <span className="text-[13px] font-medium text-white/95 leading-snug tracking-wide break-words">
                {title || domain || url}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px] text-zinc-400">
              {domain && <span className="text-brand-300 font-medium tracking-wide shrink-0">{domain}</span>}
              {channel && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                  <span className="text-zinc-300 font-normal break-words">{channel}</span>
                </>
              )}
              {duration && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                  <span className="flex items-center gap-1 text-zinc-400 shrink-0">
                    <Clock size={11} className="text-zinc-500" />
                    {formatDuration(duration)}
                  </span>
                </>
              )}
              {uploadDate && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                  <span className="flex items-center gap-1 text-zinc-400 shrink-0">
                    <Calendar size={11} className="text-zinc-500" />
                    {formatDate(uploadDate)}
                  </span>
                </>
              )}
            </div>
          </div>

          {isPlaylist && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPlaylistModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 rounded-lg text-[11px] font-medium transition-colors border border-brand-500/30 backdrop-blur-sm shadow-sm whitespace-nowrap"
              >
                <ListVideo size={14} />
                Ver Playlist
              </button>
            </div>
          )}
        </div>

        {showVideo && isYouTube && (
          <div
            className="mt-3 w-full aspect-video rounded-md overflow-hidden bg-black border border-white/10 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${getVideoId(url)}?origin=${encodeURIComponent(
                window.location.origin
              )}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/link:opacity-100 transition-opacity">
        {onToggleWatched && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWatched(e);
            }}
            className={`p-1.5 rounded transition-all flex items-center justify-center border backdrop-blur-sm ${
              watched
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-dark-card/80 hover:bg-emerald-500/15 text-dark-subtext hover:text-emerald-300 border-white/5'
            }`}
            title={watched ? 'Marcar como não assistido' : 'Marcar como assistido (check verde)'}
          >
            <Check size={14} className={watched ? 'text-emerald-400 stroke-[2.5]' : ''} />
          </button>
        )}

        {onConvertToText && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConvertToText(e);
            }}
            className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-white bg-dark-card/80 backdrop-blur-sm border border-white/5"
            title="Converter para link de texto simples"
          >
            <Link2 size={14} />
          </button>
        )}

        <button
          onClick={onToggleNotes}
          className={`p-1.5 rounded transition-all flex items-center gap-1 border backdrop-blur-sm ${
            showNotes
              ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm'
              : notes
                ? 'bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border-brand-500/30'
                : 'bg-dark-card/80 hover:bg-white/10 text-dark-subtext hover:text-white border-white/5'
          }`}
          title={
            !showNotes && !notes
              ? 'Adicionar Anotações ao Link (+)'
              : showNotes
                ? 'Recolher Anotações do Link'
                : 'Expandir Anotações do Link'
          }
        >
          {!notes && !showNotes ? <Plus size={14} /> : showNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isInsideGroup ? (
          <button
            onClick={onUngroup}
            className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-white bg-dark-card/80 backdrop-blur-sm border border-white/5"
            title="Desagrupar este link (mover para fora do grupo)"
          >
            <Ungroup size={14} />
          </button>
        ) : (
          <button
            onClick={onGroupWithNext}
            className="p-1.5 rounded hover:bg-brand-500/20 text-dark-subtext hover:text-brand-300 bg-dark-card/80 backdrop-blur-sm border border-white/5"
            title="Agrupar com link vizinho (Lado a Lado)"
          >
            <LayoutGrid size={14} />
          </button>
        )}

        <button
          onClick={onReload}
          className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-white bg-dark-card/80 backdrop-blur-sm border border-white/5"
          title="Recarregar título"
        >
          <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-red-500/20 text-dark-subtext hover:text-red-400 bg-dark-card/80 backdrop-blur-sm border border-white/5"
          title="Remover link"
        >
          <X size={14} />
        </button>
      </div>

      <LinkNotesDrawer showNotes={showNotes} notes={notes} onChangeNotes={onChangeNotes} />

      {showPlaylistModal && (
        <YouTubePlaylistModal
          url={url}
          title={title || 'Playlist'}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </div>
  );
}
