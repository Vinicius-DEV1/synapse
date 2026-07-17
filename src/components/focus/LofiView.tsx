import React, { useState } from 'react';
import { ArrowLeft, Plus, Music, Trash2, Cloud, UploadCloud, Clock } from 'lucide-react';
import { useFocusContext } from '../../store/FocusContext';
import { uploadNewLofi, deleteLofiCompletely, deleteLofiLocal } from '../../services/lofi-manager';
import { useStore } from '../../store/useStore';

export const LofiView: React.FC = () => {
  const { view, setView, lofis, activeLofi, setActiveLofi, isPlayingLofi, setIsPlayingLofi, loadLofis } = useFocusContext();
  const { state } = useStore();
  const masterKey = state.moduleKeys['focus'];
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (view !== 'lofi') return null;

  const handleImport = async () => {
    // Using standard HTML input for simplicity in this React component
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,video/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);
      setProgress(0);
      try {
        let duration: number | undefined;
        try {
          const url = URL.createObjectURL(file);
          duration = await new Promise((resolve) => {
            const audio = new Audio(url);
            audio.onloadedmetadata = () => {
              resolve(audio.duration);
              URL.revokeObjectURL(url);
            };
            audio.onerror = () => resolve(undefined);
          });
        } catch (e) {
          console.warn("Could not extract duration", e);
        }

        await uploadNewLofi(file, duration, masterKey, (p) => setProgress(p));
        await loadLofis();
        window.dispatchEvent(new Event('app-sync-trigger')); // Força push para o Firebase
      } catch (err) {
        console.error("Erro ao importar Lofi", err);
        alert("Erro ao importar Lofi");
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const handleDeleteCompletely = async (lofi: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteLofiCompletely(lofi);
      await loadLofis();
      window.dispatchEvent(new Event('app-sync-trigger')); // Força push para o Firebase
      if (activeLofi?.id === lofi.id) {
        setActiveLofi(null);
        setIsPlayingLofi(false);
      }
    } catch (err) {
      console.error("Erro ao deletar Lofi", err);
    }
    setDeletingId(null);
  };

  const handleDeleteLocal = async (lofi: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteLofiLocal(lofi);
      await loadLofis();
      if (activeLofi?.id === lofi.id) {
        // Stop playing if we deleted the file we were streaming locally, 
        // to force it to reload from cloud if we play again
        setActiveLofi(null);
        setIsPlayingLofi(false);
      }
    } catch (err) {
      console.error("Erro ao deletar Lofi local", err);
    }
    setDeletingId(null);
  };

  const togglePlay = (lofi: any) => {
    if (activeLofi?.id === lofi.id) {
      setIsPlayingLofi(!isPlayingLofi);
    } else {
      setActiveLofi(lofi);
      setIsPlayingLofi(true);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full w-full p-4 overflow-hidden">
      <header className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView('dashboard')}
            className="p-2 text-dark-subtext hover:text-white bg-dark-bg/50 border border-white/5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Lofi Station</h1>
            <p className="text-dark-subtext text-xs font-medium">Suas músicas para focar</p>
          </div>
        </div>
        
        <button 
          onClick={handleImport}
          disabled={isUploading}
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-50"
        >
          {isUploading ? (
            <span>Enviando {Math.round(progress)}%</span>
          ) : (
            <>
              <Plus size={16} />
              <span>Importar</span>
            </>
          )}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto space-y-2">
        {lofis.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-dark-subtext">
            <Music size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Nenhum lofi importado.</p>
            <p className="text-xs opacity-60">Clique em Importar para adicionar áudios ou vídeos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {lofis.map(lofi => {
              const isActive = activeLofi?.id === lofi.id;
              
              return (
                <div 
                  key={lofi.id} 
                  onClick={() => togglePlay(lofi)}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-brand-500/10 border-brand-500/30 text-white' 
                      : 'bg-dark-card border-white/5 text-dark-subtext hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-brand-500/20 text-brand-400' : 'bg-dark-bg text-dark-subtext'
                  }`}>
                    <Music size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{lofi.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {lofi.is_local && (
                        <span className="text-[10px] flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                          <Cloud size={10} /> Local
                        </span>
                      )}
                      {lofi.drive_file_id && (
                        <span className="text-[10px] flex items-center gap-1 bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
                          <UploadCloud size={10} /> Nuvem
                        </span>
                      )}
                      {lofi.duration ? (
                        <span className="text-[10px] flex items-center gap-1 text-dark-subtext ml-2">
                          <Clock size={10} /> {formatDuration(lofi.duration)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex items-center relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeletingId(deletingId === lofi.id ? null : lofi.id); }}
                      className="p-2 text-dark-subtext/50 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    {deletingId === lofi.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-dark-card border border-white/10 rounded-lg shadow-xl z-10 flex flex-col overflow-hidden">
                        {lofi.is_local && (
                          <button 
                            onClick={(e) => handleDeleteLocal(lofi, e)}
                            className="text-left px-3 py-2 text-xs text-dark-subtext hover:bg-white/5 hover:text-white transition-colors border-b border-white/5"
                          >
                            Apagar apenas localmente
                          </button>
                        )}
                        <button 
                          onClick={(e) => handleDeleteCompletely(lofi, e)}
                          className="text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-400/10 transition-colors font-semibold"
                        >
                          Apagar completamente
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
