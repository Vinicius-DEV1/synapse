import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';

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

export interface TaskActionsContextType {
  addTask: (id: string, title: string, abortController?: AbortController, timeoutMs?: number) => void;
  updateTaskProgress: (id: string, progress: number, phase?: string) => void;
  completeTask: (id: string) => void;
  failTask: (id: string, error: string) => void;
  cancelTask: (id: string) => void;
  removeTask: (id: string) => void;
}

interface TaskContextType extends TaskActionsContextType {
  tasks: BackgroundTask[];
}

const TaskStateContext = createContext<BackgroundTask[] | null>(null);
const TaskActionsContext = createContext<TaskActionsContextType | null>(null);
const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const tasksRef = useRef(tasks);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const removalTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  const clearRemovalTimeout = (id: string) => {
    const existing = removalTimeoutsRef.current.get(id);
    if (existing) {
      clearTimeout(existing);
      removalTimeoutsRef.current.delete(id);
    }
  };

  const removeTask = useCallback((id: string) => {
    clearTaskTimeout(id);
    clearRemovalTimeout(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const failTask = useCallback((id: string, error: string) => {
    clearTaskTimeout(id);
    clearRemovalTimeout(id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'error', errorMessage: error } : t))
    );
  }, []);

  const completeTask = useCallback((id: string) => {
    clearTaskTimeout(id);
    clearRemovalTimeout(id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'completed', progress: 100 } : t))
    );
    const removalTimer = setTimeout(() => {
      removalTimeoutsRef.current.delete(id);
      removeTask(id);
    }, 5000);
    removalTimeoutsRef.current.set(id, removalTimer);
  }, [removeTask]);

  const cancelTask = useCallback((id: string) => {
    clearTaskTimeout(id);
    clearRemovalTimeout(id);
    const task = tasksRef.current.find(t => t.id === id);
    if (task && task.abortController) {
      task.abortController.abort();
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'cancelled' } : t))
    );
    const removalTimer = setTimeout(() => {
      removalTimeoutsRef.current.delete(id);
      removeTask(id);
    }, 3000);
    removalTimeoutsRef.current.set(id, removalTimer);
  }, [removeTask]);

  const addTask = useCallback((id: string, title: string, abortController?: AbortController, timeoutMs?: number) => {
    clearTaskTimeout(id);
    clearRemovalTimeout(id);
    setTasks((prev) => [
      ...prev,
      { id, title, progress: 0, status: 'running', abortController, timeoutMs },
    ]);

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
    const removalTimeouts = removalTimeoutsRef.current;
    return () => {
      timeouts.forEach(timer => clearTimeout(timer));
      timeouts.clear();
      removalTimeouts.forEach(timer => clearTimeout(timer));
      removalTimeouts.clear();
    };
  }, []);

  const actionsValue = useMemo<TaskActionsContextType>(() => ({
    addTask,
    updateTaskProgress,
    completeTask,
    failTask,
    cancelTask,
    removeTask,
  }), [addTask, updateTaskProgress, completeTask, failTask, cancelTask, removeTask]);

  const combinedValue = useMemo<TaskContextType>(() => ({
    tasks,
    ...actionsValue,
  }), [tasks, actionsValue]);

  return (
    <TaskActionsContext.Provider value={actionsValue}>
      <TaskStateContext.Provider value={tasks}>
        <TaskContext.Provider value={combinedValue}>
          {children}
        </TaskContext.Provider>
      </TaskStateContext.Provider>
    </TaskActionsContext.Provider>
  );
}

/**
 * Zero-rerender task dispatchers. Never re-renders when task progress ticks.
 */
export function useTaskActions(): TaskActionsContextType {
  const context = useContext(TaskActionsContext);
  if (!context) {
    throw new Error('useTaskActions must be used within a TaskProvider');
  }
  return context;
}

export function useTaskState(): BackgroundTask[] {
  const context = useContext(TaskStateContext);
  if (context === null) {
    throw new Error('useTaskState must be used within a TaskProvider');
  }
  return context;
}

export function useTasks(): TaskContextType {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
