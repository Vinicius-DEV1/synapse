import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import SyncMonitor from './SyncMonitor';
import * as syncMonitorService from '../../services/sync/sync-monitor';

vi.mock('../../services/sync/sync-monitor', () => ({
  getTodayStats: vi.fn(),
  getWeeklyStats: vi.fn(),
  isEmergencyStopped: vi.fn(),
  clearEmergencyStop: vi.fn(),
  getSyncEvents: vi.fn(),
}));

describe('SyncMonitor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(syncMonitorService.getTodayStats).mockReturnValue({
      date: '2026-08-22',
      reads: 120,
      writes: 45,
      bytesDownloaded: 10240,
      bytesUploaded: 5120,
      hourlyReads: new Array(24).fill(5),
      hourlyWrites: new Array(24).fill(2),
    });
    vi.mocked(syncMonitorService.getWeeklyStats).mockReturnValue([]);
    vi.mocked(syncMonitorService.isEmergencyStopped).mockReturnValue(false);
    vi.mocked(syncMonitorService.getSyncEvents).mockReturnValue([]);
  });

  it('renders sync stats metrics, daily quotas and counters', () => {
    const { getByText } = render(<SyncMonitor />);

    expect(getByText(/Uso do Firebase/i)).toBeDefined();
    expect(getByText('120')).toBeDefined();
    expect(getByText('45')).toBeDefined();
  });
});
