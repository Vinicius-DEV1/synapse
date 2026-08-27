import { useEffect, useState } from 'react';
import { Portal } from '../../ui/Portal';
import { UploadCloud, FileText, Loader2, CheckCircle2 } from 'lucide-react';

interface ProgressData {
  filename: string;
  progress: number;
  stage: 'encrypting' | 'uploading';
  current?: number;
  total?: number;
}

export function UploadProgressModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);

  useEffect(() => {
    const onStart = () => {
      setIsVisible(true);
      setProgressData(null);
    };

    const onEnd = () => {
      // Pequeno delay para exibir conclusão antes de sumir
      setTimeout(() => {
        setIsVisible(false);
        setProgressData(null);
      }, 1000);
    };

    const onProgress = (e: any) => {
      setIsVisible(true);
      setProgressData(e.detail);
    };

    window.addEventListener('library-upload-start', onStart);
    window.addEventListener('library-upload-end', onEnd);
    window.addEventListener('library-upload-progress', onProgress);

    return () => {
      window.removeEventListener('library-upload-start', onStart);
      window.removeEventListener('library-upload-end', onEnd);
      window.removeEventListener('library-upload-progress', onProgress);
    };
  }, []);

  if (!isVisible) return null;

  const isCompleted = Math.round(progressData?.progress || 0) >= 100 && progressData?.stage === 'uploading';

  return (
    <Portal>
      {/* Floating Card no canto inferior direito sem backdrop / sem bloqueio de tela */}
      <aside aria-label="Progresso de sincronização da biblioteca" className="fixed bottom-6 right-6 z-[9999] pointer-events-auto animate-slide-up">
        <div className="w-84 bg-dark-bg/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-white">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-dark-card border border-white/5 rounded-lg flex items-center justify-center">
                {isCompleted ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : progressData?.stage === 'encrypting' ? (
                  <FileText size={18} className="text-brand-400 animate-pulse" />
                ) : (
                  <UploadCloud size={18} className="text-blue-400 animate-bounce" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold leading-tight">
                  {isCompleted ? 'Sincronização Concluída' : progressData?.stage === 'encrypting' ? 'Criptografando...' : 'Sincronizando...'}
                </span>
                <span className="text-[11px] text-dark-subtext truncate max-w-[170px]">
                  {progressData?.filename || 'Processando arquivo'}
                </span>
              </div>
            </div>

            {progressData?.total && progressData.total > 1 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 font-medium border border-brand-500/20">
                {progressData.current || 1}/{progressData.total}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex flex-col gap-1.5">
            <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/5">
              <div 
                className={`h-full transition-all duration-300 ease-out rounded-full ${
                  isCompleted ? 'bg-emerald-500' : progressData?.stage === 'encrypting' ? 'bg-brand-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.max(5, progressData?.progress || 0)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-dark-subtext">
              <span>{Math.round(progressData?.progress || 0)}%</span>
              {!isCompleted && (
                <span className="flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  Em segundo plano
                </span>
              )}
            </div>
          </div>
        </div>
      </aside>
    </Portal>
  );
}
