import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'error' | 'cancelled';

export interface BackgroundTask {
  id: string;
  title: string;
  progress: number;
  status: TaskStatus;
  abortController?: AbortController;
  errorMessage?: string;
}

interface TaskContextType {
  tasks: BackgroundTask[];
  addTask: (id: string, title: string, abortController?: AbortController) => void;
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

  // Sync ref with state for callbacks
  tasksRef.current = tasks;

  const addTask = useCallback((id: string, title: string, abortController?: AbortController) => {
    setTasks((prev) => [
      ...prev,
      { id, title, progress: 0, status: 'running', abortController },
    ]);
  }, []);

  const updateTaskProgress = useCallback((id: string, progress: number, phase?: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, progress, title: phase || t.title } : t))
    );
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'completed', progress: 100 } : t))
    );
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeTask(id);
    }, 5000);
  }, []);

  const failTask = useCallback((id: string, error: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'error', errorMessage: error } : t))
    );
  }, []);

  const cancelTask = useCallback((id: string) => {
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
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
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
