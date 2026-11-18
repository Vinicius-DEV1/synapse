/** Dispatches quota and permission failures with a stable event payload. */
export function handleSyncError(err: unknown, context: string): void {
  const error = typeof err === 'object' && err !== null
    ? err as { message?: unknown; code?: unknown }
    : {};
  const message = typeof error.message === 'string'
    ? error.message
    : String(err ?? 'Unknown error');
  const code = typeof error.code === 'string' ? error.code : undefined;
  console.warn(`[Sync] ${context} FAILED: ${message}`, err);

  const errorMessage = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  if (
    error.code === 'resource-exhausted'
    || errorMessage.includes('quota')
    || errorMessage.includes('permission-denied')
  ) {
    window.dispatchEvent(new CustomEvent('caderno-sync-error', { detail: { message, code } }));
  }
}

export function isPromiseSettledResult(value: unknown): value is PromiseSettledResult<unknown> {
  if (typeof value !== 'object' || value === null || !('status' in value)) return false;
  return value.status === 'fulfilled' || value.status === 'rejected';
}
