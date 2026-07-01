import React, { useState } from 'react';
import type { CultureItem } from '../../types';
import { Target, Plus, CheckCircle, ExternalLink, Image as ImageIcon, List } from 'lucide-react';
import { CultureService } from '../../services/culture';
import { CultureEpisodeModal } from './CultureEpisodeModal';

interface Props {
  item: CultureItem;
  onUpdate: () => void;
  onClick: () => void;
}

export default function CultureMediaCard({ item, onUpdate, onClick }: Props) {
  const [showEpisodes, setShowEpisodes] = useState(false);

  const percent = item.total_progress > 0 
    ? Math.min(100, Math.round((item.progress / item.total_progress) * 100)) 
    : 0;

  const handleIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.total_progress > 0 && item.progress >= item.total_progress) return;
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
      await CultureService.updateItem(item.id, { ...item, is_goal: item.is_goal ? 0 : 1 });
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.access_link) {
      window.api?.drive?.openExternalUrl(item.access_link);
    }
  };

  return (
    <>
      <div 
        onClick={onClick}
        className={`group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
          item.is_goal ? 'ring-2 ring-brand-500 shadow-[0_0_15px_rgba(var(--brand-500),0.3)]' : 'ring-1 ring-white/5 border border-white/5'
        } bg-white/5 backdrop-blur-sm`}
      >
        {/* Cover Image */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-dark-bg/50">
          {item.cover_image ? (
            <img 
              src={item.cover_image} 
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-dark-subtext">
              <ImageIcon size={32} className="opacity-50 mb-2" />
              <span className="text-xs uppercase tracking-wider">{item.type}</span>
            </div>
          )}
          
          {/* Overlay Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-card via-transparent to-transparent opacity-80" />
          
          {/* Top Badges */}
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
              <button 
                onClick={handleOpenLink}
                title="Abrir Link"
                className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <ExternalLink size={16} />
              </button>
            )}
          </div>
          
          {/* Type Badge */}
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
            {item.type}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col gap-2 relative z-10 bg-gradient-to-t from-dark-card to-dark-card/90">
          <h3 className="font-semibold text-sm text-dark-text leading-tight line-clamp-1" title={item.title}>
            {item.title}
          </h3>
          
          {/* Progress Section */}
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-center text-xs text-dark-subtext">
              <span>
                {item.total_progress > 0 
                  ? `${item.progress} / ${item.total_progress}` 
                  : item.progress}
              </span>
              <span>{percent}%</span>
            </div>
            
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex items-center">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${item.is_goal ? 'bg-brand-400 shadow-[0_0_10px_rgba(var(--brand-400),0.8)]' : 'bg-brand-500/70'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Quick Increment */}
          <div className="mt-1 flex justify-end">
            {['anime', 'série'].includes(item.type) ? (
              <button
                onClick={(e) => { e.stopPropagation(); setShowEpisodes(true); }}
                className="flex items-center justify-center gap-1 bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 active:scale-95 text-xs font-medium py-1.5 px-3 rounded-lg transition-all"
              >
                <List size={14} />
                <span>Episódios</span>
              </button>
            ) : (
              <button
                onClick={handleIncrement}
                disabled={item.total_progress > 0 && item.progress >= item.total_progress}
                className="flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-xs font-medium text-dark-text py-1.5 px-3 rounded-lg transition-all"
              >
                {item.total_progress > 0 && item.progress >= item.total_progress ? (
                  <>
                    <CheckCircle size={14} className="text-green-400" />
                    <span>Concluído</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Progresso</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <CultureEpisodeModal 
        item={item} 
        isOpen={showEpisodes} 
        onClose={() => setShowEpisodes(false)} 
        onUpdateProgress={async (progress) => {
          await CultureService.updateProgress(item.id, progress);
          onUpdate(); // Re-fetches items from backend
        }}
      />
    </>
  );
}
