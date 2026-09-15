import React, { useState, useRef, useEffect } from 'react';
import {
  Globe,
  Clock,
  PlaySquare,
  ListVideo,
  Calendar,
  Check,
  FileArchive,
  Loader2,
  Layers,
  Sparkles,
  Hourglass,
} from 'lucide-react';
import YouTubePlaylistModal from '../YouTubePlaylistModal';
import YouTubeSummaryModal from '../youtube/YouTubeSummaryModal';
import YouTubeWatchModal from '../youtube/YouTubeWatchModal';
import LinkInfoModal from './components/LinkInfoModal';
import { formatDuration, formatDate, isYouTubeUrl } from './youtubeUtils';
import LinkNotesDrawer from './LinkNotesDrawer';
import LinkDragControls from './components/LinkDragControls';
import LinkCardActions from './components/LinkCardActions';
import LinkEmbeddedVideo from './components/LinkEmbeddedVideo';
import type { DuplicatePageInfo } from './hooks/useLinkDuplicates';
import {
  hasExistingVideoSummary,
  extractYouTubeVideoId,
} from '../../../services/youtube/youtubeSummaryService';

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
  watching?: boolean;
  color?: string;
  loading: boolean;
  isReloading: boolean;
  selected: boolean;
  isInsideGroup: boolean;
  onOpenConfirm: () => void;
  onToggleNotes: (e: React.MouseEvent) => void;
  onToggleWatched?: (e: React.MouseEvent) => void;
  onToggleWatching?: (e?: React.MouseEvent) => void;
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
  // Duplicate links integration
  duplicatePages?: DuplicatePageInfo[];
  onOpenDuplicates?: () => void;
  // Scrap integration
  scrapId?: string | null;
  scrapStatus?: 'idle' | 'capturing' | 'ready' | 'sync_pending' | 'error' | null;
  scrapLocalPath?: string | null;
  scrapDriveFileId?: string | null;
  masterKey?: CryptoKey;
  onCaptureScrap?: () => void;
  onOpenScrap?: () => void;
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
  watching,
  color,
  loading,
  isReloading,
  selected,
  isInsideGroup,
  onOpenConfirm,
  onToggleNotes,
  onToggleWatched,
  onToggleWatching,
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
  duplicatePages,
  onOpenDuplicates,
  scrapId,
  scrapStatus,
  scrapLocalPath,
  scrapDriveFileId,
  masterKey,
  onCaptureScrap,
  onOpenScrap,
}: LinkPreviewCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
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
  const videoId = isYouTube && !isPlaylist ? extractYouTubeVideoId(url) : null;
  const [hasSummary, setHasSummary] = useState(false);

  useEffect(() => {
    if (!videoId) {
      setHasSummary(false);
      return;
    }

    let isMounted = true;
    hasExistingVideoSummary(videoId).then((exists) => {
      if (isMounted) setHasSummary(exists);
    });

    const handleSummarySaved = (e: Event) => {
      const custom = e as CustomEvent<{ videoId: string }>;
      if (custom.detail?.videoId === videoId && isMounted) {
        setHasSummary(true);
      }
    };

    window.addEventListener('youtube-summary-saved', handleSummarySaved);
    return () => {
      isMounted = false;
      window.removeEventListener('youtube-summary-saved', handleSummarySaved);
    };
  }, [videoId]);

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
        loading="lazy"
        decoding="async"
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

  const hasScrap = Boolean(scrapId && (scrapStatus === 'ready' || scrapStatus === 'sync_pending'));
  const isScrapCapturing = scrapStatus === 'capturing';

  return (
    <div className="relative group/link">
      {/* Drag handle and movement controls */}
      <LinkDragControls
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onAddLineBelow={onAddLineBelow}
        onDragStartHandle={onDragStartHandle}
      />

      {/* Unified Card Container: fuses preview header and integrated notes seamlessly */}
      <div
        style={customCardStyle}
        className={`block transition-all rounded-lg border overflow-hidden ${
          isCustomColor
            ? 'bg-dark-card/90 hover:brightness-105'
            : selected
            ? 'bg-brand-500/5 border-brand-500/50 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/10'
            : 'bg-dark-card border-white/10 hover:bg-white/[0.03] hover:border-white/20'
        }`}
      >
        <div
          onClick={onOpenConfirm}
          className={`p-3 cursor-pointer ${isInsideGroup ? 'pr-20' : 'pr-20'}`}
        >
          <div className="flex items-start gap-3">
            <div className="relative w-8 h-8 rounded bg-dark-bg border border-white/5 flex items-center justify-center shrink-0 overflow-visible mt-0.5">
              {isYouTube ? (
                <button
                  type="button"
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
              {watched ? (
                <div
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-sm ring-1 ring-black/50 pointer-events-none"
                  title="Assistido / Concluído"
                >
                  <Check size={9} className="stroke-[3.5]" />
                </div>
              ) : watching ? (
                <div
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-sm ring-1 ring-black/50 pointer-events-none"
                  title="Assistindo"
                >
                  <Hourglass size={8} className="stroke-[2.5]" />
                </div>
              ) : null}
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

                {/* Assistindo Badge */}
                {watching && !watched && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[10px] font-medium"
                      title="Status: Assistindo"
                    >
                      <Hourglass size={10} className="text-amber-400" />
                      <span>Assistindo</span>
                    </span>
                  </>
                )}

                {/* Subtle Scrap Badge */}
                {hasScrap && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenScrap?.();
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-[10px] font-medium transition-colors shadow-xs"
                      title="Snapshot offline salvo. Clique para abrir."
                    >
                      <FileArchive size={11} className="text-emerald-400" />
                      <span>Offline Salvo</span>
                    </button>
                  </>
                )}
                {isScrapCapturing && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-medium animate-pulse">
                      <Loader2 size={11} className="animate-spin text-brand-400" />
                      <span>Salvando offline...</span>
                    </span>
                  </>
                )}

                {/* Subtle Duplicate Pages Badge */}
                {duplicatePages && duplicatePages.length > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenDuplicates?.();
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 text-[10px] font-medium transition-colors shadow-xs group/dup cursor-pointer"
                      title={`Este link também foi inserido em ${duplicatePages.length} ${
                        duplicatePages.length === 1 ? 'outra página' : 'outras páginas'
                      }. Clique para ver.`}
                    >
                      <Layers size={11} className="text-amber-400 group-hover/dup:scale-110 transition-transform" />
                      <span>
                        {duplicatePages.length === 1
                          ? 'Em 1 outra página'
                          : `Em ${duplicatePages.length} outras páginas`}
                      </span>
                    </button>
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

                {/* AI Video Summary Pill (Only rendered if summary already exists, revealed on card hover) */}
                {hasSummary && isYouTube && !isPlaylist && (
                  <span className="inline-flex items-center gap-2 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200 pointer-events-none group-hover/link:pointer-events-auto">
                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowSummaryModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border border-brand-500/30 text-[10px] font-medium transition-colors shadow-xs group/summary cursor-pointer"
                      title="Abrir resumo didático em tela de foco"
                    >
                      <Sparkles size={11} className="text-brand-400 group-hover/summary:scale-110 transition-transform" />
                      <span>Resumo do Vídeo</span>
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>

          {showVideo && isYouTube && <LinkEmbeddedVideo url={url} />}
        </div>

        {/* Integrated Notes Section: nested inside the continuous card */}
        <LinkNotesDrawer showNotes={showNotes} notes={notes} onChangeNotes={onChangeNotes} />
      </div>

      {/* Action Buttons Toolbar: Notes toggle + ••• menu */}
      <LinkCardActions
        url={url}
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
        watching={watching}
        onToggleWatched={onToggleWatched}
        onToggleWatching={onToggleWatching}
        onConvertToText={onConvertToText}
        onToggleNotes={onToggleNotes}
        onUngroup={onUngroup}
        onGroupWithNext={onGroupWithNext}
        onReload={onReload}
        onDelete={onDelete}
        isYouTube={isYouTube && !isPlaylist}
        onWatch={() => {
          setShowWatchModal(true);
          if (!watched && !watching && onToggleWatching) {
            onToggleWatching();
          }
        }}
        onOpenSummary={() => setShowSummaryModal(true)}
        onOpenInfo={() => setShowInfoModal(true)}
        duplicateCount={duplicatePages?.length || 0}
        onOpenDuplicates={onOpenDuplicates}
        scrapId={scrapId}
        scrapStatus={scrapStatus}
        onCaptureScrap={onCaptureScrap}
        onOpenScrap={onOpenScrap}
      />

      {showPlaylistModal && (
        <YouTubePlaylistModal
          url={url}
          title={title || 'Playlist'}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}

      {showSummaryModal && (
        <YouTubeSummaryModal
          url={url}
          title={title || 'Vídeo do YouTube'}
          channel={channel || ''}
          onClose={() => setShowSummaryModal(false)}
        />
      )}

      {showWatchModal && (
        <YouTubeWatchModal
          url={url}
          title={title || 'Vídeo do YouTube'}
          channel={channel || ''}
          onClose={() => setShowWatchModal(false)}
        />
      )}

      {showInfoModal && (
        <LinkInfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          url={url}
          title={title}
          scrapId={scrapId}
          scrapDriveFileId={scrapDriveFileId}
          scrapLocalPath={scrapLocalPath}
          masterKey={masterKey}
          onInsertIntoNotes={(summaryText) => {
            const nextNotes = notes ? `${notes}\n\n${summaryText}` : summaryText;
            onChangeNotes(nextNotes);
          }}
        />
      )}
    </div>
  );
}
