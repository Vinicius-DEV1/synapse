import { X, RotateCcw, BookmarkCheck } from 'lucide-react';

interface FileViewerResumeBannerProps {
  show: boolean;
  savedProgressData: { percentage: number; scrollTop: number } | null;
  onDismiss: () => void;
  onResume: () => void;
}

export function FileViewerResumeBanner({
  show,
  savedProgressData,
  onDismiss,
  onResume,
}: FileViewerResumeBannerProps) {
  if (!show || !savedProgressData) return null;

  return (
    <div className="absolute bottom-6 right-6 z-50 bg-dark-card/95 backdrop-blur-md border border-brand-500/40 rounded-xl shadow-2xl p-4 max-w-sm flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-brand-400">
          <RotateCcw size={18} />
          <h4 className="text-sm font-semibold text-white">Continuar Leitura?</h4>
        </div>
        <button 
          onClick={onDismiss} 
          className="text-dark-subtext hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <p className="text-xs text-gray-300">
        Você parou em <strong className="text-brand-300 font-bold">{savedProgressData.percentage}%</strong> deste documento. Deseja retornar de onde parou?
      </p>
      <div className="flex items-center gap-2 justify-end mt-1">
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 text-xs text-dark-subtext hover:bg-white/10 rounded-lg transition-colors"
        >
          Começar do Início
        </button>
        <button
          onClick={onResume}
          className="px-3 py-1.5 text-xs bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg shadow transition-colors flex items-center gap-1.5"
        >
          <BookmarkCheck size={14} />
          Continuar Leitura
        </button>
      </div>
    </div>
  );
}
