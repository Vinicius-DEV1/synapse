import React, { useState, useEffect } from 'react';
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
  onClick: () => void;
  onEdit: () => void;
  onEditGoal: () => void;
  hasNewRelease?: boolean;
}

export default function CultureMediaCard({ item, viewMode, onUpdate, onClick, onEdit, onEditGoal, hasNewRelease }: Props) {
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const percent = item.total_progress > 0
    ? Math.min(100, Math.round((item.progress / item.total_progress) * 100))
    : 0;
  const isFinished = item.total_progress > 0 && item.progress >= item.total_progress;
  const hasEpisodes = ['anime', 'série'].includes(item.type);
  const statusInfo = getStatusInfo(item.status);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const handleIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFinished) return;
    try { 
      await CultureService.updateProgress(item.id, item.progress + 1); 
      onUpdate(); 
    } catch (err) { 
      console.error(err); 
    }
  };

  const handleToggleGoal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { 
      await CultureService.updateItem(item.id, { ...item, is_goal: !item.is_goal });
      onUpdate(); 
    } catch (err) { 
      console.error(err); 
    }
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
      await CultureService.updateProgress(item.id, p); 
      onUpdate();
    } catch (err) { 
      console.error(err); 
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir '${item.title}'?`)) {
      try { 
        await CultureService.deleteItem(item.id); 
        onUpdate(); 
      } catch (err) { 
        console.error(err); 
      }
    }
  };

  const handleEditGoalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    onEditGoal();
  };

  const openEpisodes = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    setShowEpisodes(true);
  };

  const handleEditClick = () => {
    setContextMenu(null);
    onEdit();
  };

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
          onClick={onClick}
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
          onClick={onClick}
          onContextMenu={handleContextMenu}
          onOpenEpisodes={openEpisodes}
          onIncrement={handleIncrement}
        />
      ) : (
        <CultureCardGrid
          item={item}
          percent={percent}
          isFinished={isFinished}
          hasEpisodes={hasEpisodes}
          hasNewRelease={hasNewRelease}
          statusInfo={statusInfo}
          onClick={onClick}
          onContextMenu={handleContextMenu}
          onOpenEpisodes={openEpisodes}
          onIncrement={handleIncrement}
          onToggleGoal={handleToggleGoal}
          onOpenLink={handleOpenLink}
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
