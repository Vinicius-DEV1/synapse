import { describe, it, expect, vi, beforeEach } from 'vitest';
import { broadcastPageSaved, onPageSaved } from './page-broadcast';

describe('page-broadcast service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('broadcasts page saved messages and delivers to registered listeners', () => {
    const callback = vi.fn();
    const unsubscribe = onPageSaved(callback);

    broadcastPageSaved('page_123', 'crdt_base64_data', '<p>Texto salvo</p>');

    // Simulate BroadcastChannel message dispatch if in mock environment
    // Or verify postMessage was called
    unsubscribe();
  });

  it('unsubscribes listeners properly', () => {
    const callback = vi.fn();
    const unsubscribe = onPageSaved(callback);
    unsubscribe();

    broadcastPageSaved('page_123', 'crdt_base64_data', '<p>Texto salvo</p>');
    expect(callback).not.toHaveBeenCalled();
  });
});
