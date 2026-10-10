import React, { useState, useEffect, useCallback } from 'react';
import type { CultureItem } from '../../types';
import { CultureService } from '../../services/culture';
import { CultureEpisodeModal } from './CultureEpisodeModal';
import { getStatusInfo } from './cards/culture-status';
import { CultureCardContextMenu } from './cards/CultureCardContextMenu';
import { CultureCardList } from './cards/CultureCardList';
import { CultureCardCompact } from './cards/CultureCardCompact';
import { CultureCardGrid } from './cards/CultureCardGrid';
import type { ViewMode } from './hooks/useCulture';

interface Props {
  item: CultureItem;
  viewMode: ViewMode;
  onUpdate: () => void;
  onClick?: () => void;
  onItemClick?: (item: CultureItem) => void;
  onEdit?: () => void;
  onItemEdit?: (item: CultureItem) => void;
  onEditGoal?: () => void;
  onItemEditGoal?: (item: CultureItem) => void;
  hasNewRelease?: boolean;
}

function CultureMediaCard({
  item,
  viewMode,
  onUpdate,
  onClick,
  onItemClick,
  onEdit,
  onItemEdit,
  onEditGoal,
  onItemEditGoal,
  hasNewRelease,
}: Props) {
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const percent = item.total_progress > 0
    ? Math.min(100, Math.round((item.progress / item.total_progress) * 100))
    : 0;
  const isFinished = item.total_progress > 0 && item.progress >= item.total_progress;
  const hasEpisodes = ['anime', 'série'].includes(item.type);
  const statusInfo = getStatusInfo(item.status);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const handleClick = useCallback(() => {
    if (onItemClick) {
      onItemClick(item);
    } else {
      onClick?.();
    }
  }, [onItemClick, onClick, item]);

  const handleEditClick = useCallback(() => {
    setContextMenu(null);
    if (onItemEdit) {
      onItemEdit(item);
    } else {
      onEdit?.();
    }
  }, [onItemEdit, onEdit, item]);

  const handleEditGoalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    if (onItemEditGoal) {
      onItemEditGoal(item);
    } else {
      onEditGoal?.();
    }
  }, [onItemEditGoal, onEditGoal, item]);

  const handleIncrement = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFinished) return;
    try { 
      await CultureService.updateProgress(item.id, item.progress + 1); 
      onUpdate(); 
    } catch (err) { 
      console.error(err); 
    }
  }, [isFinished, item.id, item.progress, onUpdate]);

  const handleToggleGoal = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { 
      await CultureService.updateItem(item.id, { ...item, is_goal: !item.is_goal });
      onUpdate(); 
    } catch (err) { 
      console.error(err); 
    }
  }, [item, onUpdate]);

  const handleOpenLink = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.access_link) window.api?.drive?.openExternalUrl(item.access_link);
  }, [item.access_link]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleFinish = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const p = item.total_progress > 0 ? item.total_progress : (item.progress > 0 ? item.progress : 1);
      await CultureService.updateProgress(item.id, p); 
      onUpdate();
    } catch (err) { 
      console.error(err); 
    }
  }, [item.id, item.progress, item.total_progress, onUpdate]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = `Tem certeza que deseja excluir '${item.title}'?`;
    const confirmed = window.api?.app?.showConfirm
      ? (await window.api.app.showConfirm({
          title: 'Excluir Obra Cultural',
          message: msg,
          kind: 'warning',
        })) === 1
      : typeof window !== 'undefined' && typeof window.confirm === 'function' && window.confirm(msg);
    if (!confirmed) return;
    try { 
      await CultureService.deleteItem(item.id); 
      onUpdate(); 
    } catch (err) { 
      console.error(err); 
    }
  }, [item.id, item.title, onUpdate]);

  const openEpisodes = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    setShowEpisodes(true);
  }, []);

  return (
    <>
      {viewMode === 'list' ? (
        <CultureCardList
          item={item}
          percent={percent}
          isFinished={isFinished}
          hasEpisodes={hasEpisodes}
          hasNewRelease={hasNewRelease}
          statusInfo={statusInfo}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onOpenEpisodes={openEpisodes}
          onIncrement={handleIncrement}
          onOpenLink={handleOpenLink}
        />
      ) : viewMode === 'compact' ? (
        <CultureCardCompact
          item={item}
          percent={percent}
          isFinished={isFinished}
          hasEpisodes={hasEpisodes}
          hasNewRelease={hasNewRelease}
          statusInfo={statusInfo}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onOpenEpisodes={openEpisodes}
          onIncrement={handleIncrement}
          onFinish={handleFinish}
          onEdit={handleEditClick}
          onToggleGoal={handleToggleGoal}
        />
      ) : (
        <CultureCardGrid
          item={item}
          percent={percent}
          isFinished={isFinished}
          hasEpisodes={hasEpisodes}
          hasNewRelease={hasNewRelease}
          statusInfo={statusInfo}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onOpenEpisodes={openEpisodes}
          onIncrement={handleIncrement}
          onFinish={handleFinish}
          onToggleGoal={handleToggleGoal}
          onOpenLink={handleOpenLink}
          onEdit={handleEditClick}
        />
      )}

      <CultureEpisodeModal
        item={item}
        isOpen={showEpisodes}
        onClose={() => setShowEpisodes(false)}
        onUpdateProgress={async (p) => { 
          await CultureService.updateProgress(item.id, p); 
          onUpdate(); 
        }}
      />

      {contextMenu && (
        <CultureCardContextMenu
          item={item}
          pos={contextMenu}
          hasEpisodes={hasEpisodes}
          onFinish={handleFinish}
          onToggleGoal={handleToggleGoal}
          onEditGoal={handleEditGoalClick}
          onEpisodes={openEpisodes}
          onEdit={handleEditClick}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}

export default React.memo(CultureMediaCard);
