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

    // Avança 1000ms no timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Agora sim foi avaliado uma única vez
    expect(mockEditor.getHTML).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      '<p>Linha 1</p>',
      expect.any(String),
      [],
      undefined
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
        instanceId: 'inst_test',
      })
    );

    const mockEditor = createMockEditor('<p>Conteúdo antes de sair da página</p>');

    act(() => {
      result.current.handleUpdate({ editor: mockEditor });
    });

    expect(onSave).not.toHaveBeenCalled();

    // Simula desmontagem ou chamada de limpeza antes do timer expirar
    act(() => {
      result.current.cleanupSave();
    });

    // Flush imediato deve salvar sem esperar
    expect(mockEditor.getHTML).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      '<p>Conteúdo antes de sair da página</p>',
      expect.any(String),
      [],
      'inst_test'
    );
  });

  it('immediately flushes pending changes on window blur and on caderno-flush-editor event', () => {
    const ydoc = new Y.Doc();
    const onSave = vi.fn().mockResolvedValue(true);
    const latestContentRef = { current: null };
    const ydocRef = { current: ydoc };
    const onSaveRef = { current: onSave };

    const { result } = renderHook(() =>
      useEditorSave({
        pageId: 'page_blur_test',
        ydocRef,
        onSaveRef,
        latestContentRef,
      })
    );

    const mockEditor = createMockEditor('<p>Mudança antes de trocar de aba</p>');

    act(() => {
      result.current.handleUpdate({ editor: mockEditor });
    });

    expect(onSave).not.toHaveBeenCalled();

    // Simula evento customizado de troca de aba interna
    act(() => {
      window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
    });

    expect(mockEditor.getHTML).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      '<p>Mudança antes de trocar de aba</p>',
      expect.any(String),
      [],
      undefined
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
