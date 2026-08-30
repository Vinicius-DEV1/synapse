import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { GlobalLofiPlayer } from './GlobalLofiPlayer';
import * as lofiManager from '../../services/lofi-manager';
import * as toastContext from '../ui/ToastContext';

vi.mock('../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

const mockContext = {
  activeLofi: null as any,
  setActiveLofi: vi.fn(),
  isPlayingLofi: true,
  setIsPlayingLofi: vi.fn(),
  lofiVolume: 0.5,
  setLofiVolume: vi.fn(),
};

vi.mock('../../store/FocusContext', () => ({
  useFocusContext: () => mockContext,
}));

vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    state: { moduleKeys: { focus: 'dummy-key' } },
  }),
}));

vi.mock('../../hooks/useTimeTracker', () => ({
  useTimeTracker: vi.fn(),
}));

describe('GlobalLofiPlayer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays local lofi without needing Google Drive and without error', async () => {
    const localLofi = {
      id: 'lofi_local_1',
      title: 'Chuva Suave Local',
      original_name: 'rain.mp3',
      is_local: true,
      file_path: '/path/rain.mp3',
    };
    mockContext.activeLofi = localLofi;
    mockContext.isPlayingLofi = true;

    vi.spyOn(lofiManager, 'resolveLofiUrl').mockResolvedValue('encrypted://localhost/focus/rain.mp3.enc');

    render(<GlobalLofiPlayer />);

    await waitFor(() => {
      expect(lofiManager.resolveLofiUrl).toHaveBeenCalledWith(localLofi, 'dummy-key', undefined);
      expect(toastContext.triggerToast).not.toHaveBeenCalled();
    });
  });

  it('stops playback and alerts via toast when cloud lofi fails due to disconnected Drive', async () => {
    const cloudLofi = {
      id: 'lofi_cloud_1',
      title: 'Café Jazz Nuvem',
      original_name: 'cafe.mp3',
      is_local: false,
      drive_file_id: 'drive_123',
    };
    mockContext.activeLofi = cloudLofi;
    mockContext.isPlayingLofi = true;

    vi.spyOn(lofiManager, 'resolveLofiUrl').mockRejectedValue(
      new Error('Não foi possível autenticar com o Google Drive.')
    );
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    render(<GlobalLofiPlayer />);

    await waitFor(() => {
      expect(mockContext.setIsPlayingLofi).toHaveBeenCalledWith(false);
      expect(toastContext.triggerToast).toHaveBeenCalledWith(
        expect.stringContaining('O Google Drive não está conectado'),
        'error',
        5000
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'drive-auth-expired' })
      );
    });
  });

  it('immediately halts playback and alerts on MediaError code 4 (SRC_NOT_SUPPORTED) without infinite retry loops', async () => {
    const lofi = {
      id: 'lofi_bad_1',
      title: 'Corrupt Lofi Track',
      original_name: 'broken.mp3',
      is_local: false,
      drive_file_id: 'drive_broken_123',
    };
    mockContext.activeLofi = lofi;
    mockContext.isPlayingLofi = true;

    vi.spyOn(lofiManager, 'resolveLofiUrl').mockResolvedValue('blob:http://localhost/dummy-blob-error');

    const { container } = render(<GlobalLofiPlayer />);

    await waitFor(() => {
      expect(lofiManager.resolveLofiUrl).toHaveBeenCalledTimes(1);
    });

    const audioElement = container.querySelector('audio');
    expect(audioElement).toBeDefined();

    if (audioElement) {
      act(() => {
        // Dispatch MediaError code 4 event
        Object.defineProperty(audioElement, 'error', {
          value: { code: 4, message: 'Format not supported' },
          configurable: true,
        });
        audioElement.dispatchEvent(new Event('error'));
      });

      await waitFor(() => {
        expect(mockContext.setIsPlayingLofi).toHaveBeenCalledWith(false);
        expect(toastContext.triggerToast).toHaveBeenCalledWith(
          expect.stringContaining('formato incompatível ou falha na descriptografia'),
          'error',
          4000
        );
      });

      // Confirm resolveLofiUrl was NOT called again in an infinite loop
      expect(lofiManager.resolveLofiUrl).toHaveBeenCalledTimes(1);
    }
  });
});
