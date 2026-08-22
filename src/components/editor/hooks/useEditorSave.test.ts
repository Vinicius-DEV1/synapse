import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorSave } from './useEditorSave';
import { getEditorBackupMap } from './editorBackupStore';
import * as Y from 'yjs';
import type { Editor } from '@tiptap/core';

describe('useEditorSave Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getEditorBackupMap().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const createMockEditor = (html = '<p>Conteúdo de teste</p>') => {
    return {
      getHTML: vi.fn(() => html),
    } as unknown as Editor;
  };

  it('schedules debounced save without calling getHTML immediately on every update', () => {
    const ydoc = new Y.Doc();
    const onSave = vi.fn().mockResolvedValue(true);
    const latestContentRef = { current: null };
    const ydocRef = { current: ydoc };
    const onSaveRef = { current: onSave };

    const { result } = renderHook(() =>
      useEditorSave({
        pageId: 'page_123',
        ydocRef,
        onSaveRef,
        latestContentRef,
      })
    );

    const mockEditor = createMockEditor('<p>Linha 1</p>');

    // Dispara 3 atualizações consecutivas
    act(() => {
      result.current.handleUpdate({ editor: mockEditor });
      result.current.handleUpdate({ editor: mockEditor });
      result.current.handleUpdate({ editor: mockEditor });
    });

    // getHTML ainda não deve ter sido avaliado (avaliação lazy)
    expect(mockEditor.getHTML).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();

    // Avança 2500ms no timer
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Agora sim foi avaliado uma única vez
    expect(mockEditor.getHTML).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      '<p>Linha 1</p>',
      expect.any(String),
      []
    );
    expect(latestContentRef.current).toEqual({
      html: '<p>Linha 1</p>',
      crdt: expect.any(String),
    });
    expect(getEditorBackupMap().get('page_123')).toEqual({
      html: '<p>Linha 1</p>',
      crdt: expect.any(String),
    });
  });

  it('immediately flushes pending changes on cleanupSave without data loss', () => {
    const ydoc = new Y.Doc();
    const onSave = vi.fn().mockResolvedValue(true);
    const latestContentRef = { current: null };
    const ydocRef = { current: ydoc };
    const onSaveRef = { current: onSave };

    const { result } = renderHook(() =>
      useEditorSave({
        pageId: 'page_456',
        ydocRef,
        onSaveRef,
        latestContentRef,
      })
    );

    const mockEditor = createMockEditor('<p>Conteúdo antes de sair da página</p>');

    act(() => {
      result.current.handleUpdate({ editor: mockEditor });
    });

    expect(onSave).not.toHaveBeenCalled();

    // Simula desmontagem ou chamada de limpeza antes do timer de 2000ms expirar
    act(() => {
      result.current.cleanupSave();
    });

    // Flush imediato deve salvar sem esperar
    expect(mockEditor.getHTML).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      '<p>Conteúdo antes de sair da página</p>',
      expect.any(String),
      []
    );
  });

  it('does nothing on cleanupSave if there are no pending changes', () => {
    const ydoc = new Y.Doc();
    const onSave = vi.fn().mockResolvedValue(true);
    const latestContentRef = { current: null };
    const ydocRef = { current: ydoc };
    const onSaveRef = { current: onSave };

    const { result } = renderHook(() =>
      useEditorSave({
        pageId: 'page_789',
        ydocRef,
        onSaveRef,
        latestContentRef,
      })
    );

    act(() => {
      result.current.cleanupSave();
    });

    expect(onSave).not.toHaveBeenCalled();
  });
});
