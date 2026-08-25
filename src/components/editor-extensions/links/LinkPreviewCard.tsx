import React, { useState, useRef, useEffect } from 'react';
import {
  Globe,
  Clock,
  PlaySquare,
  ListVideo,
  Calendar,
  Check,
} from 'lucide-react';
import YouTubePlaylistModal from '../YouTubePlaylistModal';
import { formatDuration, formatDate, isYouTubeUrl } from './youtubeUtils';
import LinkNotesDrawer from './LinkNotesDrawer';
import LinkDragControls from './components/LinkDragControls';
import LinkCardActions from './components/LinkCardActions';
import LinkEmbeddedVideo from './components/LinkEmbeddedVideo';

interface LinkPreviewCardProps {
  url: string;
  title: string | null;
  channel: string | null;
  duration: number | null;
  isPlaylist: boolean;
  playlistCount?: number | null;
  uploadDate: string | null;
  notes: string;
  showNotes: boolean;
  watched?: boolean;
  color?: string;
  loading: boolean;
  isReloading: boolean;
  selected: boolean;
  isInsideGroup: boolean;
  onOpenConfirm: () => void;
  onToggleNotes: (e: React.MouseEvent) => void;
  onToggleWatched?: (e: React.MouseEvent) => void;
  onConvertToText?: (e: React.MouseEvent) => void;
  onChangeColor?: (color: string) => void;
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
  playlistCount,
  uploadDate,
  notes,
  showNotes,
  watched,
  color,
  loading,
  isReloading,
  selected,
  isInsideGroup,
  onOpenConfirm,
  onToggleNotes,
  onToggleWatched,
  onConvertToText,
  onChangeColor,
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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

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

  const isCustomColor = Boolean(color && color !== 'default');
  const customCardStyle: React.CSSProperties = isCustomColor
    ? {
        backgroundColor: `${color}18`,
        borderColor: selected ? color : `${color}60`,
        boxShadow: selected
          ? `0 0 0 2px ${color}80, 0 0 15px ${color}30`
          : `0 0 0 1px ${color}20, 0 2px 10px ${color}15`,
      }
    : {};

  return (
    <div className="relative group/link">
      {/* Drag handle and movement controls */}
      <LinkDragControls
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onAddLineBelow={onAddLineBelow}
        onDragStartHandle={onDragStartHandle}
      />

      <div
        onClick={onOpenConfirm}
        style={customCardStyle}
        className={`block transition-all rounded-lg p-3 border cursor-pointer ${
          isInsideGroup ? 'pr-20' : 'pr-24'
        } ${
          isCustomColor
            ? 'bg-dark-card/90 hover:brightness-110'
            : selected
            ? 'bg-brand-500/5 border-brand-500/50 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/10'
            : 'bg-dark-card border-white/10 hover:bg-white/5 hover:border-white/20'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="relative w-8 h-8 rounded bg-dark-bg border border-white/5 flex items-center justify-center shrink-0 overflow-visible mt-0.5">
            {isYouTube ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isPlaylist) {
                    setShowPlaylistModal(true);
                  } else {
                    setShowVideo(!showVideo);
                  }
                }}
                className="w-full h-full flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                title={isPlaylist ? 'Abrir Playlist' : showVideo ? 'Fechar vídeo' : 'Assistir vídeo'}
              >
                {isPlaylist ? (
                  <ListVideo
                    size={16}
                    className="text-brand-500 drop-shadow-sm flex-shrink-0 transition-colors"
                  />
                ) : (
                  <PlaySquare
                    size={16}
                    className={`${showVideo ? 'text-white' : 'text-brand-500'} drop-shadow-sm flex-shrink-0 transition-colors`}
                  />
                )}
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
              {isPlaylist && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                  <span className="flex items-center gap-1 text-brand-300 font-medium shrink-0">
                    <ListVideo size={11} className="text-brand-400" />
                    {playlistCount !== null && playlistCount !== undefined && playlistCount > 0
                      ? `${playlistCount} ${playlistCount === 1 ? 'vídeo' : 'vídeos'}`
                      : 'Playlist'}
                  </span>
                </>
              )}
              {duration && !isPlaylist && (
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
              {isPlaylist && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowPlaylistModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 rounded text-[11px] font-medium transition-colors border border-brand-500/30 shadow-sm"
                    title="Abrir detalhes e lista de vídeos da playlist"
                  >
                    <ListVideo size={12} />
                    Ver Playlist
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {showVideo && isYouTube && <LinkEmbeddedVideo url={url} />}
      </div>

      {/* Action Buttons Toolbar */}
      <LinkCardActions
        color={color}
        isCustomColor={isCustomColor}
        watched={watched}
        notes={notes}
        showNotes={showNotes}
        isInsideGroup={isInsideGroup}
        isReloading={isReloading}
        showColorPicker={showColorPicker}
        colorPickerRef={colorPickerRef as React.RefObject<HTMLDivElement>}
        setShowColorPicker={setShowColorPicker}
        onChangeColor={onChangeColor}
        onToggleWatched={onToggleWatched}
        onConvertToText={onConvertToText}
        onToggleNotes={onToggleNotes}
        onUngroup={onUngroup}
        onGroupWithNext={onGroupWithNext}
        onReload={onReload}
        onDelete={onDelete}
      />

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
