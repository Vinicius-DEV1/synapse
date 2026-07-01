import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Target, Calendar, CheckCircle, Tv, BookOpen, Layers, Play } from 'lucide-react';
import type { CultureItem, CultureEpisode } from '../../types';
import { CultureService } from '../../services/culture';

interface Props {
  item: CultureItem;
  isOpen: boolean;
  onClose: () => void;
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

export default function CultureViewModal({ item, isOpen, onClose }: Props) {
  const [episodes, setEpisodes] = useState<CultureEpisode[]>([]);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Carrega a lista de episódios quando o usuário solicitar
  const handleLoadEpisodes = async () => {
    if (episodes.length > 0) {
      setShowEpisodes(!showEpisodes);
      return;
    }
    setLoadingEpisodes(true);
    try {
      const eps = await CultureService.getEpisodes(item.id);
      setEpisodes(eps);
      setShowEpisodes(true);
    } catch (err) {
      console.error('[CultureViewModal] Erro ao carregar episódios:', err);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  if (!isOpen) return null;

  const percent = item.total_progress > 0
    ? Math.min(100, Math.round((item.progress / item.total_progress) * 100))
    : 0;
  const isFinished = item.total_progress > 0 && item.progress >= item.total_progress;
  const statusInfo = getStatusInfo(item.status);

  // Verifica se é um tipo que pode ter episódios (séries, anime)
  const hasEpisodesFeature = ['anime', 'série'].includes(item.type);
  // Verifica se é manga (tem volumes/capítulos)
  const isManga = item.type === 'manga';

  const handleOpenLink = () => {
    if (item.access_link) window.api?.drive?.openExternalUrl(item.access_link);
  };

  // Constrói cards de metadados dinâmicos
  const metaCards: { icon: React.ReactNode; label: string; value: string }[] = [];

  if (item.episodes_count) {
    metaCards.push({ icon: <Tv size={14} />, label: 'Episódios', value: String(item.episodes_count) });
  }
  if (item.chapters) {
    metaCards.push({ icon: <BookOpen size={14} />, label: 'Capítulos', value: String(item.chapters) });
  }
  if (item.volumes) {
    metaCards.push({ icon: <Layers size={14} />, label: 'Volumes', value: String(item.volumes) });
  }
  if (item.created_at) {
    metaCards.push({ icon: <Calendar size={14} />, label: 'Adicionado em', value: new Date(item.created_at).toLocaleDateString('pt-BR') });
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="bg-dark-card w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 flex overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Poster / Cover */}
        <div className="w-1/3 hidden sm:block relative bg-black/50">
          {item.cover_image ? (
            <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">Sem capa</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-500/5 backdrop-blur-3xl" />
            <div className="relative z-10 flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                  {item.type}
                </span>
                {statusInfo && (
                  <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusInfo.text} ${statusInfo.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                    {statusInfo.label}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight">{item.title}</h2>
              {item.is_goal && (
                <div className="mt-2 flex items-center gap-1.5 text-brand-400 text-sm">
                  <Target size={14} />
                  <span className="font-semibold">Objetivo Ativo</span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="relative z-10 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-custom space-y-6">
            
            {/* Goal Note */}
            {item.is_goal && item.goal_note && (
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 flex gap-3 items-start">
                <Target size={20} className="text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-brand-300">Sua Meta</h4>
                  <p className="text-sm text-brand-400/80 mt-1">{item.goal_note}</p>
                </div>
              </div>
            )}

            {/* Metadata Stats Grid */}
            {metaCards.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {metaCards.map((mc, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
                      {mc.icon}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{mc.label}</p>
                      <p className="text-sm font-bold text-white">{mc.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Progress */}
            <div>
              <div className="flex items-end justify-between mb-2">
                <h4 className="text-sm font-medium text-white/70">Progresso</h4>
                <div className="text-sm font-semibold text-white">
                  {item.total_progress > 0 ? `${item.progress} / ${item.total_progress}` : item.progress}
                  <span className="text-xs text-white/40 ml-2 font-normal">({percent}%)</span>
                </div>
              </div>
              <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isFinished ? 'bg-green-500' : item.is_goal ? 'bg-brand-400 shadow-[0_0_10px_rgba(var(--brand-400),0.8)]' : 'bg-brand-500/70'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {/* Synopsis */}
            {item.synopsis && (
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-2">Sinopse / Anotações</h4>
                <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                  {item.synopsis}
                </p>
              </div>
            )}

            {/* Ver Episódios Button */}
            {hasEpisodesFeature && (
              <div>
                <button
                  onClick={handleLoadEpisodes}
                  disabled={loadingEpisodes}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 rounded-xl text-sm font-semibold text-brand-400 transition-colors w-full justify-center"
                >
                  <Play size={16} />
                  {loadingEpisodes ? 'Carregando...' : showEpisodes ? 'Ocultar Episódios' : 'Ver Episódios'}
                </button>

                {/* Episode List */}
                {showEpisodes && episodes.length > 0 && (
                  <div className="mt-4 space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-custom">
                    {episodes.map((ep) => (
                      <div 
                        key={ep.id} 
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          ep.is_watched 
                            ? 'bg-green-500/10 text-green-400/80' 
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-xs font-mono text-white/30 w-6 text-right flex-shrink-0">
                          {ep.episode_number}
                        </span>
                        <span className="flex-1 truncate">{ep.title}</span>
                        {ep.is_watched && <CheckCircle size={14} className="text-green-400 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
                {showEpisodes && episodes.length === 0 && !loadingEpisodes && (
                  <p className="mt-3 text-center text-sm text-white/30">Nenhum episódio encontrado.</p>
                )}
              </div>
            )}

            {/* Access Link */}
            {item.access_link && (
              <div>
                <button
                  onClick={handleOpenLink}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  <ExternalLink size={16} className="text-brand-400" />
                  Acessar Obra
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
