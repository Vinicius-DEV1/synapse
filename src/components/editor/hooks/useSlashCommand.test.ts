import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSlashCommand } from './useSlashCommand';

describe('useSlashCommand Hook', () => {
  const setPageSearchMenu = vi.fn();
  const setFocusModal = vi.fn();
  const setAlarmModal = vi.fn();
  const setFileUploadModal = vi.fn();
  const setFileSelectModal = vi.fn();
  const setCalendarEventModal = vi.fn();
  const setMediaSelectModal = vi.fn();

  let mockEditor: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEditor = {
      state: {
        selection: {
          $head: {
            pos: 15,
            parentOffset: 5,
            parent: {
              textBetween: vi.fn().mockReturnValue('/'),
            },
          },
        },
        doc: {
          textBetween: vi.fn().mockReturnValue('heading'),
        },
      },
      view: {
        coordsAtPos: vi.fn().mockReturnValue({ left: 100, top: 200 }),
      },
      chain: vi.fn(() => ({
        focus: vi.fn().mockReturnThis(),
        deleteRange: vi.fn().mockReturnThis(),
        setParagraph: vi.fn().mockReturnThis(),
        toggleHeading: vi.fn().mockReturnThis(),
        insertContent: vi.fn().mockReturnThis(),
        insertTable: vi.fn().mockReturnThis(),
        run: vi.fn(),
      })),
    };
  });

  it('opens slash menu on pressing "/" key', () => {
    const { result } = renderHook(() =>
      useSlashCommand({
        setPageSearchMenu,
        setFocusModal,
        setAlarmModal,
        setFileUploadModal,
        setFileSelectModal,
        setCalendarEventModal,
        setMediaSelectModal,
      })
    );

    const mockView = {
      state: { selection: { $head: { pos: 10 } } },
      coordsAtPos: vi.fn().mockReturnValue({ left: 50, top: 150 }),
    };

    act(() => {
      result.current.handleSlashKeyDown(mockView, { key: '/' } as KeyboardEvent);
    });

    expect(result.current.slashMenu).toEqual({
      query: '',
      startPos: 10,
      x: 50,
      y: 174,
    });
  });

  it('closes slash menu on pressing Escape', () => {
    const { result } = renderHook(() =>
      useSlashCommand({
        setPageSearchMenu,
        setFocusModal,
        setAlarmModal,
        setFileUploadModal,
        setFileSelectModal,
        setCalendarEventModal,
        setMediaSelectModal,
      })
    );

    const mockView = {
      state: { selection: { $head: { pos: 10 } } },
      coordsAtPos: vi.fn().mockReturnValue({ left: 50, top: 150 }),
    };

    act(() => {
      result.current.handleSlashKeyDown(mockView, { key: '/' } as KeyboardEvent);
    });

    expect(result.current.slashMenu).not.toBeNull();

    act(() => {
      result.current.handleSlashKeyDown(mockView, { key: 'Escape' } as KeyboardEvent);
    });

    expect(result.current.slashMenu).toBeNull();
  });

  it('executes slash command and triggers modals for specialized commands', () => {
    const { result } = renderHook(() =>
      useSlashCommand({
        setPageSearchMenu,
        setFocusModal,
        setAlarmModal,
        setFileUploadModal,
        setFileSelectModal,
        setCalendarEventModal,
        setMediaSelectModal,
      })
    );

    // Open menu first
    act(() => {
      result.current.setSlashMenu({
        query: 'foco 25 #estudo',
        startPos: 10,
        x: 50,
        y: 150,
      });
    });

    act(() => {
      result.current.executeSlashCommand('foco', mockEditor);
    });

    expect(setFocusModal).toHaveBeenCalledWith({
      isOpen: true,
      initialTime: 25,
      initialTag: 'estudo',
      initialDesc: '',
    });
    expect(result.current.slashMenu).toBeNull();
  });

  it('executes "page" command and opens page search menu with mode "link"', () => {
    const { result } = renderHook(() =>
      useSlashCommand({
        setPageSearchMenu,
        setFocusModal,
        setAlarmModal,
        setFileUploadModal,
        setFileSelectModal,
        setCalendarEventModal,
        setMediaSelectModal,
      })
    );

    act(() => {
      result.current.setSlashMenu({
        query: 'page anotações',
        startPos: 10,
        x: 50,
        y: 150,
      });
    });

    act(() => {
      result.current.executeSlashCommand('page', mockEditor);
    });

    expect(setPageSearchMenu).toHaveBeenCalledWith({
      isOpen: true,
      x: 50,
      y: 150,
      query: 'anotações',
      mode: 'link',
      targetPos: 10,
    });
    expect(result.current.slashMenu).toBeNull();
  });

  it('executes "page-create" command and opens page search menu with mode "create"', () => {
    const { result } = renderHook(() =>
      useSlashCommand({
        setPageSearchMenu,
        setFocusModal,
        setAlarmModal,
        setFileUploadModal,
        setFileSelectModal,
        setCalendarEventModal,
        setMediaSelectModal,
      })
    );

    act(() => {
      result.current.setSlashMenu({
        query: 'criar Nova Tarefa',
        startPos: 10,
        x: 50,
        y: 150,
      });
    });

    act(() => {
      result.current.executeSlashCommand('page-create', mockEditor);
    });

    expect(setPageSearchMenu).toHaveBeenCalledWith({
      isOpen: true,
      x: 50,
      y: 150,
      query: 'Nova Tarefa',
      mode: 'create',
      targetPos: 10,
    });
    expect(result.current.slashMenu).toBeNull();
  });

  it('opens page search menu with blank query when user only typed filter like "vinc" or "vincular"', () => {
    const { result } = renderHook(() =>
      useSlashCommand({
        setPageSearchMenu,
        setFocusModal,
        setAlarmModal,
        setFileUploadModal,
        setFileSelectModal,
        setCalendarEventModal,
        setMediaSelectModal,
      })
    );

    // Test 1: user typed "vinc" to filter the menu
    act(() => {
      result.current.setSlashMenu({
        query: 'vinc',
        startPos: 5,
        x: 50,
        y: 150,
      });
    });

    act(() => {
      result.current.executeSlashCommand('page', mockEditor);
    });

    expect(setPageSearchMenu).toHaveBeenCalledWith({
      isOpen: true,
      x: 50,
      y: 150,
      query: '',
      mode: 'link',
      targetPos: 5,
    });

    // Test 2: user typed "vincular" exactly
    act(() => {
      result.current.setSlashMenu({
        query: 'vincular',
        startPos: 5,
        x: 50,
        y: 150,
      });
    });

    act(() => {
      result.current.executeSlashCommand('page', mockEditor);
    });

    expect(setPageSearchMenu).toHaveBeenCalledWith({
      isOpen: true,
      x: 50,
      y: 150,
      query: '',
      mode: 'link',
      targetPos: 5,
    });
  });

  it('opens event modal with blank title when user only typed "eve" or "evento"', () => {
    const { result } = renderHook(() =>
      useSlashCommand({
        setPageSearchMenu,
        setFocusModal,
        setAlarmModal,
        setFileUploadModal,
        setFileSelectModal,
        setCalendarEventModal,
        setMediaSelectModal,
      })
    );

    act(() => {
      result.current.setSlashMenu({
        query: 'eve',
        startPos: 10,
        x: 50,
        y: 150,
      });
    });

    act(() => {
      result.current.executeSlashCommand('evento', mockEditor);
    });

    expect(setCalendarEventModal).toHaveBeenCalledWith({
      isOpen: true,
      initialTitle: '',
    });
  });
});

