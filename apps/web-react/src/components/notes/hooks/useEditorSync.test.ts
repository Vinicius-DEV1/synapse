import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorSync } from './useEditorSync';
import * as yjsUtils from '../../../utils/yjs-utils';
import { getEditorBackupMap } from './editorBackupStore';
import * as pageBroadcast from '../../../services/page-broadcast';

vi.mock('../../../utils/yjs-utils', () => ({
  applyBase64StateToYDoc: vi.fn(),
  getYDocStateAsBase64: vi.fn().mockReturnValue('mock-base64-crdt-state'),
}));

describe('useEditorSync Hook', () => {
  let onSaveRef: { current: ReturnType<typeof vi.fn> };
  let latestContentRef: { current: { html: string; crdt: string } | null };

  beforeEach(() => {
    vi.clearAllMocks();
    getEditorBackupMap().clear();

    onSaveRef = {
      current: vi.fn().mockResolvedValue(undefined),
    };

    latestContentRef = {
      current: {
        html: '<p>Texto salvo</p>',
        crdt: 'crdt_data_payload_long_enough',
      },
    };
  });

  it('initializes Y.Doc and applies initial base64 CRDT state when present', () => {
    const { result } = renderHook(() =>
      useEditorSync({
        pageId: 'page_123',
        initialCrdtState: 'crdt_initial_state_base64_long',
        onSaveRef,
        latestContentRef,
      })
    );

    expect(result.current.ydocRef.current).toBeDefined();
    expect(result.current.ydocRef.current.guid).toBe('page_123');
    expect(yjsUtils.applyBase64StateToYDoc).toHaveBeenCalled();
  });

  it('receives remote sync updates via caderno-sync-update event', () => {
    renderHook(() =>
      useEditorSync({
        pageId: 'page_123',
        initialCrdtState: null,
        onSaveRef,
        latestContentRef,
      })
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent('caderno-sync-update', {
          detail: {
            pageId: 'page_123',
            crdtState: 'remote_updated_crdt_state',
          },
        })
      );
    });

    expect(yjsUtils.applyBase64StateToYDoc).toHaveBeenCalledWith(
      expect.anything(),
      'remote_updated_crdt_state'
    );
  });

  type PageSavedHandler = Parameters<typeof pageBroadcast.onPageSaved>[0];

  it('receives cross-tab broadcast updates and applies CRDT to active page', () => {
    let savedCallback: PageSavedHandler | undefined;
    vi.spyOn(pageBroadcast, 'onPageSaved').mockImplementation((cb) => {
      savedCallback = cb;
      return () => {};
    });

    renderHook(() =>
      useEditorSync({
        pageId: 'page_123',
        initialCrdtState: null,
        onSaveRef,
        latestContentRef,
      })
    );

    act(() => {
      savedCallback?.({
        type: 'PAGE_SAVED',
        pageId: 'page_123',
        crdtState: 'cross_tab_crdt_state_12345678',
        html: '<p>Salvo em outra aba</p>',
        timestamp: Date.now(),
      });
    });

    expect(yjsUtils.applyBase64StateToYDoc).toHaveBeenCalledWith(
      expect.anything(),
      'cross_tab_crdt_state_12345678'
    );
    expect(latestContentRef.current).toEqual({
      html: '<p>Salvo em outra aba</p>',
      crdt: 'cross_tab_crdt_state_12345678',
    });
    expect(getEditorBackupMap().get('page_123')).toEqual({
      html: '<p>Salvo em outra aba</p>',
      crdt: 'cross_tab_crdt_state_12345678',
    });
  });

  it('updates editor backup when cross-tab update arrives for a different page', () => {
    let savedCallback: PageSavedHandler | undefined;
    vi.spyOn(pageBroadcast, 'onPageSaved').mockImplementation((cb) => {
      savedCallback = cb;
      return () => {};
    });

    renderHook(() =>
      useEditorSync({
        pageId: 'page_active',
        initialCrdtState: null,
        onSaveRef,
        latestContentRef,
      })
    );

    act(() => {
      savedCallback?.({
        type: 'PAGE_SAVED',
        pageId: 'page_other',
        crdtState: 'crdt_other_page_long_string',
        html: '<p>Outra página</p>',
        timestamp: Date.now(),
      });
    });

    // Does NOT apply to current ydoc
    expect(yjsUtils.applyBase64StateToYDoc).not.toHaveBeenCalledWith(
      expect.anything(),
      'crdt_other_page_long_string'
    );
    // But DOES update backup map so when page_other opens, it has latest state
    expect(getEditorBackupMap().get('page_other')).toEqual({
      html: '<p>Outra página</p>',
      crdt: 'crdt_other_page_long_string',
    });
  });

  it('ignores broadcast updates from the same sender instance', () => {
    let savedCallback: PageSavedHandler | undefined;
    vi.spyOn(pageBroadcast, 'onPageSaved').mockImplementation((cb) => {
      savedCallback = cb;
      return () => {};
    });

    renderHook(() =>
      useEditorSync({
        pageId: 'page_123',
        initialCrdtState: null,
        onSaveRef,
        latestContentRef,
        instanceId: 'inst_myself',
      })
    );

    act(() => {
      savedCallback?.({
        type: 'PAGE_SAVED',
        pageId: 'page_123',
        crdtState: 'cross_tab_crdt_state_12345678',
        html: '<p>Salvo por mim mesmo</p>',
        timestamp: Date.now(),
        senderInstanceId: 'inst_myself',
      });
    });

    // Should NOT re-apply to self
    expect(yjsUtils.applyBase64StateToYDoc).not.toHaveBeenCalled();
  });

  it('queries only current page via getPageContent (never getAllPages) and applies CRDT on divergence', async () => {
    const mockGetAllPages = vi.fn();
    const mockGetPageContent = vi.fn().mockResolvedValue({
      content: '<p>From DB</p>',
      encrypted_content: null,
      crdt_state: 'new_crdt_from_db_123456',
      updated_at: '2026-11-13T12:00:00.000Z',
    });
    (window as unknown as { api: { getAllPages: typeof mockGetAllPages; getPageContent: typeof mockGetPageContent } }).api = {
      getAllPages: mockGetAllPages,
      getPageContent: mockGetPageContent,
    };

    renderHook(() =>
      useEditorSync({
        pageId: 'page_123',
        initialCrdtState: null,
        onSaveRef,
        latestContentRef,
      })
    );

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(mockGetAllPages).not.toHaveBeenCalled();
    expect(mockGetPageContent).toHaveBeenCalledWith('page_123');
    expect(yjsUtils.applyBase64StateToYDoc).toHaveBeenCalledWith(
      expect.anything(),
      'new_crdt_from_db_123456'
    );
  });

  it('skips applyBase64StateToYDoc on focus when remote crdt_state matches current local snapshot', async () => {
    const mockGetPageContent = vi.fn().mockResolvedValue({
      content: '<p>Texto salvo</p>',
      encrypted_content: null,
      crdt_state: 'crdt_data_payload_long_enough',
      updated_at: '2026-11-13T12:00:00.000Z',
    });
    (window as unknown as { api: { getPageContent: typeof mockGetPageContent } }).api = {
      getPageContent: mockGetPageContent,
    };

    renderHook(() =>
      useEditorSync({
        pageId: 'page_123',
        initialCrdtState: null,
        onSaveRef,
        latestContentRef,
      })
    );

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(mockGetPageContent).toHaveBeenCalledWith('page_123');
    expect(yjsUtils.applyBase64StateToYDoc).not.toHaveBeenCalled();
  });

  it('clears stale in-memory backup and does not apply CRDT when DB page has null crdt_state (external native Qt edit)', async () => {
    getEditorBackupMap().set('page_123', {
      html: '<p>Stale React memory</p>',
      crdt: 'stale_crdt_payload_12345678',
    });

    const mockGetPageContent = vi.fn().mockResolvedValue({
      content: '<p>Updated in Qt</p>',
      encrypted_content: null,
      crdt_state: null,
      updated_at: '2026-11-13T12:00:00.000Z',
    });
    (window as unknown as { api: { getPageContent: typeof mockGetPageContent } }).api = {
      getPageContent: mockGetPageContent,
    };

    renderHook(() =>
      useEditorSync({
        pageId: 'page_123',
        initialCrdtState: null,
        onSaveRef,
        latestContentRef,
      })
    );

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(mockGetPageContent).toHaveBeenCalledWith('page_123');
    expect(getEditorBackupMap().has('page_123')).toBe(false);
  });

  it('flushes unsaved changes on unmount', () => {
    const { unmount } = renderHook(() =>
      useEditorSync({
        pageId: 'page_123',
        initialCrdtState: null,
        onSaveRef,
        latestContentRef,
      })
    );

    unmount();

    expect(onSaveRef.current).toHaveBeenCalledWith(
      '<p>Texto salvo</p>',
      'crdt_data_payload_long_enough',
      [],
      undefined
    );
  });
});
