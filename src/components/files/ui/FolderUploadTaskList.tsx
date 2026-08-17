import { File, AlertCircle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import type { UploadTask } from '../hooks/useFolderUpload';

interface FolderUploadTaskListProps {
  tasks: UploadTask[];
  completedCount: number;
  errorCount: number;
  totalProgress: number;
  onRetry: (taskId: string) => void;
}

export function FolderUploadTaskList({
  tasks,
  completedCount,
  errorCount,
  totalProgress,
  onRetry,
}: FolderUploadTaskListProps) {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Progress Summary */}
      <div className="p-4 bg-white/5 rounded-xl border border-white/10 shrink-0">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h3 className="text-sm font-medium text-white/90">Progresso Geral</h3>
            <p className="text-xs text-white/50">{completedCount} de {tasks.length} arquivos concluídos</p>
          </div>
          <span className="text-brand-400 font-bold">{Math.round(totalProgress)}%</span>
        </div>
        <div className="h-2.5 bg-dark-bg rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand-500 transition-all duration-300 relative"
            style={{ width: `${totalProgress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
        {errorCount > 0 && (
          <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
            <AlertCircle size={12} /> {errorCount} arquivo(s) falharam
          </p>
        )}
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
        {tasks.map((task) => (
          <div key={task.id} className="p-3 rounded-xl border border-white/5 bg-dark-bg/50 flex items-center gap-3">
            <File size={16} className="text-white/40 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/90 truncate" title={task.relativePath}>{task.relativePath}</p>
              {task.status === 'uploading' && (
                <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-brand-400 transition-all duration-200" style={{ width: `${task.progress}%` }} />
                </div>
              )}
              {task.status === 'error' && (
                <p className="text-xs text-red-400 mt-1 truncate">{task.errorMsg}</p>
              )}
            </div>
            
            <div className="shrink-0 flex items-center">
              {task.status === 'completed' && <CheckCircle2 size={18} className="text-green-400" />}
              {task.status === 'uploading' && <Loader2 size={18} className="text-brand-400 animate-spin" />}
              {task.status === 'pending' && <span className="text-xs text-white/30">Pendente</span>}
              {task.status === 'error' && (
                <button 
                  onClick={() => onRetry(task.id)}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-colors"
                  title="Tentar Novamente"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
