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
      expect(lofiManager.resolveLofiUrl).toHaveBeenCalledWith(localLofi, 'dummy-key');
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
});
