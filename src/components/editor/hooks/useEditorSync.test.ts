import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorSync } from './useEditorSync';
import * as yjsUtils from '../../../utils/yjs-utils';

vi.mock('../../../utils/yjs-utils', () => ({
  applyBase64StateToYDoc: vi.fn(),
  getYDocStateAsBase64: vi.fn().mockReturnValue('mock-base64-crdt-state'),
}));

describe('useEditorSync Hook', () => {
  let onSaveRef: any;
  let latestContentRef: any;

  beforeEach(() => {
    vi.clearAllMocks();

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
      []
    );
  });
});
