import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import MediaActionModal from './MediaActionModal';

const mockDispatch = vi.fn();
vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    state: { activeTabId: 'tab_media_active' },
    dispatch: mockDispatch,
  }),
}));

describe('MediaActionModal', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('calls onClose and dispatches ADD_TAB when opening video in new tab', () => {
    const onClose = vi.fn();

    const { getByText } = render(
      <MediaActionModal
        isOpen={true}
        mediaId="video_999"
        mediaType="video"
        title="Aula 01.mp4"
        onClose={onClose}
      />
    );

    const newTabBtn = getByText('Abrir em Nova Guia');
    fireEvent.click(newTabBtn);

    expect(onClose).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_TAB',
        tab: expect.objectContaining({
          module: 'video',
          bookId: 'video_999',
        }),
      })
    );
  });

  it('calls onClose and dispatches UPDATE_TAB_MODULE when opening in same tab', () => {
    const onClose = vi.fn();

    const { getByText } = render(
      <MediaActionModal
        isOpen={true}
        mediaId="video_999"
        mediaType="video"
        title="Aula 01.mp4"
        onClose={onClose}
      />
    );

    const sameTabBtn = getByText('Abrir nesta Guia');
    fireEvent.click(sameTabBtn);

    expect(onClose).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_TAB_MODULE',
      tabId: 'tab_media_active',
      module: 'video',
      bookId: 'video_999',
      moduleState: { videoId: 'video_999' },
    });
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();

    const { container } = render(
      <MediaActionModal
        isOpen={true}
        mediaId="video_999"
        mediaType="video"
        title="Aula 01.mp4"
        onClose={onClose}
      />
    );

    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();

    render(
      <MediaActionModal
        isOpen={true}
        mediaId="video_999"
        mediaType="video"
        title="Aula 01.mp4"
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
