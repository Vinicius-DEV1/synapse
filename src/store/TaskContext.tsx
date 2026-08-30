import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'error' | 'cancelled';

export interface BackgroundTask {
  id: string;
  title: string;
  progress: number;
  status: TaskStatus;
  abortController?: AbortController;
  errorMessage?: string;
  timeoutMs?: number;
}

interface TaskContextType {
  tasks: BackgroundTask[];
  addTask: (id: string, title: string, abortController?: AbortController, timeoutMs?: number) => void;
  updateTaskProgress: (id: string, progress: number, phase?: string) => void;
  completeTask: (id: string) => void;
  failTask: (id: string, error: string) => void;
  cancelTask: (id: string) => void;
  removeTask: (id: string) => void;
}

const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const tasksRef = useRef(tasks);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Sync ref with state for callbacks
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const clearTaskTimeout = (id: string) => {
    const existing = timeoutsRef.current.get(id);
    if (existing) {
      clearTimeout(existing);
      timeoutsRef.current.delete(id);
    }
  };

  const removeTask = useCallback((id: string) => {
    clearTaskTimeout(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const failTask = useCallback((id: string, error: string) => {
    clearTaskTimeout(id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'error', errorMessage: error } : t))
    );
  }, []);

  const completeTask = useCallback((id: string) => {
    clearTaskTimeout(id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'completed', progress: 100 } : t))
    );
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeTask(id);
    }, 5000);
  }, [removeTask]);

  const cancelTask = useCallback((id: string) => {
    clearTaskTimeout(id);
    const task = tasksRef.current.find(t => t.id === id);
    if (task && task.abortController) {
      task.abortController.abort();
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'cancelled' } : t))
    );
    // Auto-remove after a few seconds
    setTimeout(() => {
      removeTask(id);
    }, 3000);
  }, [removeTask]);

  const addTask = useCallback((id: string, title: string, abortController?: AbortController, timeoutMs?: number) => {
    clearTaskTimeout(id);
    setTasks((prev) => [
      ...prev,
      { id, title, progress: 0, status: 'running', abortController, timeoutMs },
    ]);

    // Safety watchdog: default 15 minutes or custom timeout
    const effectiveTimeout = timeoutMs || 15 * 60 * 1000;
    const timer = setTimeout(() => {
      console.warn(`[Caderno:TaskWatchdog] Task ${id} (${title}) timed out after ${effectiveTimeout}ms`);
      failTask(id, 'Tempo limite excedido na execução da tarefa.');
      if (abortController) {
        try { abortController.abort(); } catch (e) { console.error(e); }
      }
    }, effectiveTimeout);

    timeoutsRef.current.set(id, timer);
  }, [failTask]);

  const updateTaskProgress = useCallback((id: string, progress: number, phase?: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, progress, title: phase || t.title } : t))
    );
  }, []);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach(timer => clearTimeout(timer));
      timeouts.clear();
    };
  }, []);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        addTask,
        updateTaskProgress,
        completeTask,
        failTask,
        cancelTask,
        removeTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}

