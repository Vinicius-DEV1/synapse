import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorDropPaste } from './useEditorDropPaste';
import * as imageDrive from '../../../services/image-drive';

vi.mock('../../../services/image-drive', () => ({
  uploadEncryptedImage: vi.fn().mockResolvedValue('uploaded_drive_file_id_789'),
  setCachedImage: vi.fn().mockResolvedValue(undefined),
}));

describe('useEditorDropPaste Hook', () => {
  let mockEditor: any;
  let mockViewerState: any;
  let setViewerState: any;
  let mockNode: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockNode = {
      type: { name: 'image' },
      attrs: { src: 'original.png' },
      nodeSize: 1,
    };

    mockViewerState = {
      isOpen: false,
      src: '',
      nodePos: null,
      nodeType: null,
    };
    setViewerState = vi.fn();

    mockEditor = {
      state: {
        doc: {
          content: { size: 100 },
          nodeAt: vi.fn().mockReturnValue(mockNode),
          descendants: vi.fn((cb) => {
            cb(mockNode, 10);
          }),
        },
        selection: { empty: true },
        tr: {
          setNodeMarkup: vi.fn().mockReturnThis(),
        },
      },
      view: {
        state: { selection: { empty: true } },
        posAtCoords: vi.fn().mockReturnValue({ pos: 5 }),
        dispatch: vi.fn(),
      },
      chain: vi.fn(() => ({
        focus: vi.fn().mockReturnThis(),
        insertContent: vi.fn().mockReturnThis(),
        insertContentAt: vi.fn().mockReturnThis(),
        run: vi.fn(),
      })),
      schema: {
        nodeFromJSON: vi.fn((json) => json),
      },
      on: vi.fn(),
      off: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inserts linkPreview node when a valid URL is pasted in an empty selection', () => {
    const { result } = renderHook(() =>
      useEditorDropPaste({
        editor: mockEditor,
        masterKey: null,
        viewerState: mockViewerState,
        setViewerState,
      })
    );

    const mockEvent = {
      clipboardData: {
        getData: vi.fn((format: string) =>
          format === 'text/plain' ? 'https://google.com' : ''
        ),
        items: [],
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    const handled = result.current.handlePaste(mockEditor.view, mockEvent);

    expect(handled).toBe(true);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEditor.chain).toHaveBeenCalled();
  });

  it('handles image pasting with masterKey and creates encryptedImage node', async () => {
    const mockCryptoKey = {} as CryptoKey;
    const { result } = renderHook(() =>
      useEditorDropPaste({
        editor: mockEditor,
        masterKey: mockCryptoKey,
        viewerState: mockViewerState,
        setViewerState,
      })
    );

    const dummyFile = new File(['fake-image-bytes'], 'photo.png', { type: 'image/png' });
    const mockItem = {
      type: 'image/png',
      getAsFile: () => dummyFile,
    };

    const mockEvent = {
      clipboardData: {
        getData: vi.fn().mockReturnValue(''),
        items: [mockItem],
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    let handled = false;
    await act(async () => {
      handled = result.current.handlePaste(mockEditor.view, mockEvent);
    });

    expect(handled).toBe(true);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEditor.chain).toHaveBeenCalled();
  });

  it('handles cropped image update by replacing node markup', async () => {
    mockViewerState = {
      isOpen: true,
      src: 'old-url',
      nodePos: 10,
      nodeType: 'image',
    };

    const { result } = renderHook(() =>
      useEditorDropPaste({
        editor: mockEditor,
        masterKey: null,
        viewerState: mockViewerState,
        setViewerState,
      })
    );

    await act(async () => {
      await result.current.handleCroppedImage('data:image/png;base64,croppedContent');
    });

    expect(setViewerState).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: false, nodePos: null })
    );
    expect(mockEditor.view.dispatch).toHaveBeenCalled();
  });
});
