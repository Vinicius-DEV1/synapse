/**
 * Yields control back to the browser main thread between heavy synchronous/async
 * batches (e.g. decryption, compression, CRDT merges) to prevent long-task UI freezes.
 * Uses the native Prioritized Task Scheduling API (`scheduler.yield()`) when available,
 * with a macrotask `setTimeout(0)` fallback.
 */
export function yieldToMain(): Promise<void> {
  const globalScheduler = (
    globalThis as unknown as {
      scheduler?: { yield?: () => Promise<void> };
    }
  ).scheduler;

  if (globalScheduler && typeof globalScheduler.yield === 'function') {
    return globalScheduler.yield();
  }

  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
