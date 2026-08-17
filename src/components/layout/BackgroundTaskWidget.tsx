import { useTasks } from '../../store/TaskContext';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function BackgroundTaskWidget() {
  const { tasks, cancelTask, removeTask } = useTasks();

  if (tasks.length === 0) return null;

  return (
    <div className="fixed bottom-12 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="bg-dark-card border border-white/10 shadow-2xl rounded-xl p-3 w-72 pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-300"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
              {task.status === 'running' && <Loader2 size={16} className="text-brand-400 animate-spin flex-shrink-0" />}
              {task.status === 'completed' && <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />}
              {task.status === 'error' && <AlertCircle size={16} className="text-red-400 flex-shrink-0" />}
              {task.status === 'cancelled' && <X size={16} className="text-gray-400 flex-shrink-0" />}
              
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-xs font-medium text-white truncate" title={task.title}>
                  {task.title}
                </span>
                {task.status === 'error' && (
                  <span className="text-[10px] text-red-400 mt-0.5 truncate" title={task.errorMessage}>
                    {task.errorMessage}
                  </span>
                )}
                {task.status === 'running' && (
                  <span className="text-[10px] text-dark-subtext mt-0.5">
                    {Math.round(task.progress)}% concluído
                  </span>
                )}
                {task.status === 'cancelled' && (
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    Cancelado
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                if (task.status === 'running') {
                  cancelTask(task.id);
                } else {
                  removeTask(task.id);
                }
              }}
              className="text-dark-subtext hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors focus:outline-none"
              title={task.status === 'running' ? 'Cancelar tarefa' : 'Fechar'}
            >
              <X size={14} />
            </button>
          </div>

          {(task.status === 'running' || task.status === 'completed') && (
            <div className="w-full bg-white/10 h-1 mt-3 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ease-out ${
                  task.status === 'completed' ? 'bg-emerald-400' : 'bg-brand-500'
                }`}
                style={{ width: `${task.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
