import { describe, it, expect, vi } from 'vitest';
import { NetworkResilience } from './network-resilience';

describe('NetworkResilience', () => {
  it('successfully returns data on first attempt without retrying', async () => {
    const mockRequest = vi.fn().mockResolvedValue({ data: 'success' });
    const result = await NetworkResilience.fetchWithBackoff(mockRequest, 3, 10, 1000);
    
    expect(result).toEqual({ data: 'success' });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds on subsequent attempt', async () => {
    const mockRequest = vi.fn()
      .mockRejectedValueOnce(new Error('Network error 1'))
      .mockRejectedValueOnce(new Error('Network error 2'))
      .mockResolvedValue({ data: 'eventual success' });

    const result = await NetworkResilience.fetchWithBackoff(mockRequest, 3, 10, 1000);
    
    expect(result).toEqual({ data: 'eventual success' });
    expect(mockRequest).toHaveBeenCalledTimes(3);
  });

  it('throws when max retries are exceeded', async () => {
    const mockRequest = vi.fn().mockRejectedValue(new Error('Persistent error'));

    await expect(
      NetworkResilience.fetchWithBackoff(mockRequest, 3, 5, 1000)
    ).rejects.toThrow('Persistent error');

    expect(mockRequest).toHaveBeenCalledTimes(3);
  });

  it('does not retry if AbortError was caused by user', async () => {
    const abortErr = new Error('Aborted by user');
    abortErr.name = 'AbortError';

    const mockRequest = vi.fn().mockRejectedValue(abortErr);

    await expect(
      NetworkResilience.fetchWithBackoff(mockRequest, 3, 10, 1000)
    ).rejects.toThrow('Aborted by user');

    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
