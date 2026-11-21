export interface PageContentResponse {
  content: string;
  encrypted_content: string | null;
  crdt_state?: string | null;
  updated_at?: string | null;
}

const inFlightRequests = new Map<string, Promise<PageContentResponse>>();

/**
 * Coalesces simultaneous in-flight `window.api.getPageContent(pageId)` requests
 * (e.g., PageView + useEditorSync reacting to the same window focus event)
 * into a single IPC/IndexedDB query without caching stale responses across events.
 */
export function fetchPageContentDedup(pageId: string): Promise<PageContentResponse> | null {
  if (!pageId || !window.api?.getPageContent) return null;

  const existing = inFlightRequests.get(pageId);
  if (existing) {
    return existing;
  }

  const promise = Promise.resolve(window.api.getPageContent(pageId)).finally(() => {
    if (inFlightRequests.get(pageId) === promise) {
      inFlightRequests.delete(pageId);
    }
  });

  inFlightRequests.set(pageId, promise);
  return promise;
}

export function invalidatePageContentFetch(pageId: string): void {
  inFlightRequests.delete(pageId);
}
