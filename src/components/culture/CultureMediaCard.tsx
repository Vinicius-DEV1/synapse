import React, { useState } from 'react';
import type { CultureItem } from '../../types';
import { Target, Plus, CheckCircle, ExternalLink, Image as ImageIcon, List } from 'lucide-react';
import { CultureService } from '../../services/culture';
import { CultureEpisodeModal } from './CultureEpisodeModal';
import type { ViewMode } from './CultureView';

interface Props {
  item: CultureItem;
  viewMode: ViewMode;
  onUpdate: () => void;
  onClick: () => void;
  hasNewRelease?: boolean;
}

function getStatusInfo(status?: string) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes('airing') || s.includes('running') || s.includes('releasing') || s.includes('currently') || s === 'ongoing') {
    return { label: 'Em produção', dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
  }
  if (s.includes('finished') || s.includes('ended') || s.includes('complete')) {
    return { label: 'Finalizado', dot: 'bg-white/30', text: 'text-white/30', bg: 'bg-white/5 border-white/10' };
  }
  if (s.includes('cancel')) {
    return { label: 'Cancelado', dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
  }
  if (s.includes('hiatus') || s.includes('determined') || s.includes('tba')) {
    return { label: 'Em hiatus', dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
  }
  return null;
}

export default function CultureMediaCard({ item, viewMode, onUpdate, onClick, hasNewRelease }: Props) {
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const percent = item.total_progress > 0
    ? Math.min(100, Math.round((item.progress / item.total_progress) * 100))
    : 0;
  const isFinished = item.total_progress > 0 && item.progress >= item.total_progress;
  const hasEpisodes = ['anime', 'série'].includes(item.type);
  const statusInfo = getStatusInfo(item.status);

  React.useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const handleIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFinished) return;
    try { await CultureService.updateProgress(item.id, item.progress + 1); onUpdate(); }
    catch (err) { console.error(err); }
  };

  const handleToggleGoal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await CultureService.updateItem(item.id, { ...item, is_goal: item.is_goal ? 0 : 1 }); onUpdate(); }
    catch (err) { console.error(err); }
  };

  const handleOpenLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.access_link) window.api?.drive?.openExternalUrl(item.access_link);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleFinish = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const p = item.total_progress > 0 ? item.total_progress : (item.progress > 0 ? item.progress : 1);
      await CultureService.updateProgress(item.id, p); onUpdate();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir '${item.title}'?`)) {
      try { await CultureService.deleteItem(item.id); onUpdate(); }
      catch (err) { console.error(err); }
    }
  };

  const openEpisodes = (e: React.MouseEvent) => { e.stopPropagation(); setShowEpisodes(true); };

  const episodeModal = (
    <CultureEpisodeModal
      item={item}
      isOpen={showEpisodes}
      onClose={() => setShowEpisodes(false)}
      onUpdateProgress={async (p) => { await CultureService.updateProgress(item.id, p); onUpdate(); }}
    />
  );

  const ctxMenu = contextMenu && (
    <ContextMenuPopup
      item={item} pos={contextMenu}
      onFinish={handleFinish} onToggleGoal={handleToggleGoal}
      onEdit={onClick} onDelete={handleDelete}
    />
  );

  // ── LIST MODE ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <>
        <div
          onClick={onClick} onContextMenu={handleContextMenu}
          className={`group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/5 ${
            item.is_goal ? 'border border-brand-500/30 bg-brand-500/5' : 'border border-transparent'
          }`}
        >
          {/* Thumbnail */}
          <div className="flex-shrink-0 w-8 h-12 rounded-md overflow-hidden bg-white/5">
            {item.cover_image
              ? <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="opacity-40 text-dark-subtext" /></div>
            }
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {hasNewRelease && <span className="flex-shrink-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
              {item.is_goal && <Target size={11} className="flex-shrink-0 text-brand-400" />}
              <span className="text-sm font-medium text-dark-text truncate">{item.title}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-dark-subtext uppercase tracking-wider">{item.type}</span>
              {statusInfo && (
                <span className={`flex items-center gap-1 text-[9px] font-medium ${statusInfo.text}`}>
                  <span className={`w-1 h-1 rounded-full ${statusInfo.dot}`} />
                  {statusInfo.label}
                </span>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="flex-shrink-0 flex items-center gap-3 w-40">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.is_goal ? 'bg-brand-400' : 'bg-brand-500/70'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[10px] text-dark-subtext w-12 text-right tabular-nums">
              {item.total_progress > 0 ? `${item.progress}/${item.total_progress}` : `${item.progress}`}
            </span>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {hasEpisodes ? (
              <button onClick={openEpisodes} className="p-1.5 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 transition-colors" title="Ver episódios">
                <List size={13} />
              </button>
            ) : (
              <button onClick={handleIncrement} disabled={isFinished} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-text disabled:opacity-40 transition-colors">
                {isFinished ? <CheckCircle size={13} className="text-green-400" /> : <Plus size={13} />}
              </button>
            )}
            {item.access_link && (
              <button onClick={handleOpenLink} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-subtext transition-colors">
                <ExternalLink size={13} />
              </button>
            )}
          </div>
        </div>
        {episodeModal}{ctxMenu}
      </>
    );
  }

  // ── COMPACT MODE ───────────────────────────────────────────────────────────
  if (viewMode === 'compact') {
    return (
      <>
        <div
          onClick={onClick} onContextMenu={handleContextMenu}
          className={`group relative overflow-hidden rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-lg ${
            item.is_goal ? 'ring-2 ring-brand-500/60' : 'ring-1 ring-white/5'
          } bg-white/5`}
        >
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-dark-bg/50">
            {item.cover_image
              ? <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={18} className="opacity-40 text-dark-subtext" /></div>
            }
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {hasNewRelease && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-lg shadow-red-500/50 animate-pulse" />}
            {item.is_goal && (
              <div className="absolute top-1 left-1 p-0.5 rounded bg-brand-500/80">
                <Target size={9} className="text-white" />
              </div>
            )}
            {/* Status dot compact */}
            {statusInfo && (
              <div className={`absolute bottom-2 left-1.5 w-1.5 h-1.5 rounded-full ${statusInfo.dot} shadow`} title={statusInfo.label} />
            )}

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40">
              <div
                className={`h-full transition-all duration-500 ${item.is_goal ? 'bg-brand-400' : 'bg-brand-500/80'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="px-1.5 py-1.5">
            <h3 className="text-[10px] font-medium text-dark-text leading-tight line-clamp-2" title={item.title}>
              {item.title}
            </h3>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {hasEpisodes ? (
              <button onClick={openEpisodes} className="p-2 bg-brand-500 rounded-full shadow-lg text-white"><List size={14} /></button>
            ) : (
              <button onClick={handleIncrement} disabled={isFinished} className="p-2 bg-white/20 rounded-full text-white disabled:opacity-50">
                {isFinished ? <CheckCircle size={14} className="text-green-400" /> : <Plus size={14} />}
              </button>
            )}
          </div>
        </div>
        {episodeModal}{ctxMenu}
      </>
    );
  }

  // ── GRID MODE (default) ────────────────────────────────────────────────────
  return (
    <>
      <div
        onClick={onClick} onContextMenu={handleContextMenu}
        className={`group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
          item.is_goal ? 'ring-2 ring-brand-500 shadow-[0_0_15px_rgba(var(--brand-500),0.3)]' : 'ring-1 ring-white/5 border border-white/5'
        } bg-white/5 backdrop-blur-sm`}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-dark-bg/50">
          {item.cover_image ? (
            <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-dark-subtext">
              <ImageIcon size={32} className="opacity-50 mb-2" />
              <span className="text-xs uppercase tracking-wider">{item.type}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-card via-transparent to-transparent opacity-80" />

          {/* Top action buttons */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleToggleGoal}
              title={item.is_goal ? 'Remover dos Objetivos' : 'Marcar como Objetivo'}
              className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                item.is_goal ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/50' : 'bg-black/50 text-white/70 hover:text-white hover:bg-brand-500/80'
              }`}
            >
              <Target size={16} />
            </button>
            {item.access_link && (
              <button onClick={handleOpenLink} title="Abrir Link" className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white/70 hover:text-white hover:bg-white/20 transition-colors">
                <ExternalLink size={16} />
              </button>
            )}
          </div>

          {/* Type badge */}
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
            {item.type}
          </div>

          {/* New release badge */}
          {hasNewRelease && (
            <div className="absolute top-2 left-16 px-2 py-1 rounded bg-red-500/90 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-red-500/50 animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              Novo
            </div>
          )}
        </div>

        <div className="p-3 flex flex-col gap-2 relative z-10 bg-gradient-to-t from-dark-card to-dark-card/90">
          <h3 className="font-semibold text-sm text-dark-text leading-tight line-clamp-1" title={item.title}>
            {item.title}
          </h3>

          {/* Status badge */}
          {statusInfo && (
            <span className={`self-start flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusInfo.text} ${statusInfo.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
              {statusInfo.label}
            </span>
          )}

          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-center text-xs text-dark-subtext">
              <span>{item.total_progress > 0 ? `${item.progress} / ${item.total_progress}` : item.progress}</span>
              <span>{percent}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.is_goal ? 'bg-brand-400 shadow-[0_0_10px_rgba(var(--brand-400),0.8)]' : 'bg-brand-500/70'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="mt-1 flex justify-end">
            {hasEpisodes ? (
              <button onClick={openEpisodes} className="flex items-center justify-center gap-1 bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 active:scale-95 text-xs font-medium py-1.5 px-3 rounded-lg transition-all">
                <List size={14} /><span>Episódios</span>
              </button>
            ) : (
              <button onClick={handleIncrement} disabled={isFinished} className="flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-xs font-medium text-dark-text py-1.5 px-3 rounded-lg transition-all">
                {isFinished ? <><CheckCircle size={14} className="text-green-400" /><span>Concluído</span></> : <><Plus size={14} /><span>Progresso</span></>}
              </button>
            )}
          </div>
        </div>
      </div>
      {episodeModal}{ctxMenu}
    </>
  );
}

// ── Context Menu ──────────────────────────────────────────────────────────────
function ContextMenuPopup({ item, pos, onFinish, onToggleGoal, onEdit, onDelete }: {
  item: CultureItem;
  pos: { x: number; y: number };
  onFinish: (e: React.MouseEvent) => void;
  onToggleGoal: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="fixed z-[9999] bg-dark-card border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-scale-up"
      style={{ top: pos.y, left: pos.x }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex flex-col text-sm min-w-[200px] p-1">
        <button onClick={onFinish} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white rounded transition-colors text-left">
          <CheckCircle size={14} className="text-green-400" /><span>Marcar como Finalizado</span>
        </button>
        <button onClick={onToggleGoal} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white rounded transition-colors text-left">
          <Target size={14} className="text-brand-400" /><span>{item.is_goal ? 'Remover dos Objetivos' : 'Definir como Objetivo'}</span>
        </button>
        <button onClick={onEdit} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white rounded transition-colors text-left">
          <List size={14} className="text-blue-400" /><span>Editar Detalhes</span>
        </button>
        <div className="h-px bg-white/10 my-1 mx-2" />
        <button onClick={onDelete} className="flex items-center gap-2 px-3 py-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-colors text-left">
          <span className="font-medium">Excluir Obra</span>
        </button>
      </div>
    </div>
  );
}
