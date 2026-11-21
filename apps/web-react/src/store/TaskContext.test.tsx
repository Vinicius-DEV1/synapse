import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { TaskProvider, useTasks, useTaskActions } from './TaskContext';

describe('TaskContext (store/TaskContext)', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TaskProvider>{children}</TaskProvider>
  );

  it('adds and updates task progress', () => {
    const { result } = renderHook(() => useTasks(), { wrapper });

    act(() => {
      result.current.addTask('task-1', 'Indexing files');
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]).toEqual(
      expect.objectContaining({
        id: 'task-1',
        title: 'Indexing files',
        progress: 0,
        status: 'running',
      })
    );

    act(() => {
      result.current.updateTaskProgress('task-1', 50, 'Indexing 50%');
    });

    expect(result.current.tasks[0].progress).toBe(50);
    expect(result.current.tasks[0].title).toBe('Indexing 50%');
  });

  it('completes task and marks progress as 100', () => {
    const { result } = renderHook(() => useTasks(), { wrapper });

    act(() => {
      result.current.addTask('task-2', 'Exporting PDF');
    });

    act(() => {
      result.current.completeTask('task-2');
    });

    expect(result.current.tasks[0].status).toBe('completed');
    expect(result.current.tasks[0].progress).toBe(100);
  });

  it('fails task and sets error message', () => {
    const { result } = renderHook(() => useTasks(), { wrapper });

    act(() => {
      result.current.addTask('task-3', 'Syncing cloud');
    });

    act(() => {
      result.current.failTask('task-3', 'Connection timed out');
    });

    expect(result.current.tasks[0].status).toBe('error');
    expect(result.current.tasks[0].errorMessage).toBe('Connection timed out');
  });

  it('cancels task and triggers abortController', () => {
    const { result } = renderHook(() => useTasks(), { wrapper });
    const abortCtrl = new AbortController();
    const abortSpy = vi.spyOn(abortCtrl, 'abort');

    act(() => {
      result.current.addTask('task-4', 'Downloading audio', abortCtrl);
    });

    act(() => {
      result.current.cancelTask('task-4');
    });

    expect(abortSpy).toHaveBeenCalled();
    expect(result.current.tasks[0].status).toBe('cancelled');
  });

  it('automatically times out task and marks it as failed after timeoutMs', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTasks(), { wrapper });
    const abortCtrl = new AbortController();
    const abortSpy = vi.spyOn(abortCtrl, 'abort');

    act(() => {
      result.current.addTask('task-timeout', 'Long stuck task', abortCtrl, 1000);
    });

    expect(result.current.tasks[0].status).toBe('running');

    act(() => {
      vi.advanceTimersByTime(1050);
    });

    expect(result.current.tasks[0].status).toBe('error');
    expect(result.current.tasks[0].errorMessage).toContain('Tempo limite excedido');
    expect(abortSpy).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('keeps useTaskActions consumers from re-rendering during frequent progress updates', () => {
    let actionConsumerRenders = 0;
    let actionsRef: ReturnType<typeof useTaskActions> | null = null;

    function ActionsOnlyConsumer() {
      actionConsumerRenders += 1;
      actionsRef = useTaskActions();
      return null;
    }

    render(
      <TaskProvider>
        <ActionsOnlyConsumer />
      </TaskProvider>
    );

    expect(actionConsumerRenders).toBe(1);

    act(() => {
      actionsRef?.addTask('t1', 'Converting');
      actionsRef?.updateTaskProgress('t1', 25);
      actionsRef?.updateTaskProgress('t1', 75);
      actionsRef?.completeTask('t1');
    });

    expect(actionConsumerRenders).toBe(1);
  });
});

