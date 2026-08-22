/**
 * page-broadcast.ts
 *
 * Cross-tab synchronization via standard BroadcastChannel API.
 *
 * When a browser tab persists a page to IndexedDB, it notifies all other open tabs
 * sharing the same origin. Tabs with that page open apply the incoming CRDT update
 * to their local Y.Doc, preventing stale content from overwriting newer edits.
 *
 * The BroadcastChannel API is supported across all modern browsers and requires zero setup.
 */

export interface PageSavedMessage {
  type: 'PAGE_SAVED';
  pageId: string;
  crdtState: string | null;
  html: string;
  timestamp: number;
  senderInstanceId?: string;
}

type PageSavedCallback = (msg: PageSavedMessage) => void;

const CHANNEL_NAME = 'caderno-pages';

let channel: BroadcastChannel | null = null;
const listeners = new Set<PageSavedCallback>();

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<PageSavedMessage>) => {
      if (event.data?.type === 'PAGE_SAVED') {
        listeners.forEach((cb) => {
          try {
            cb(event.data);
          } catch (err) {
            console.error('[Caderno:Broadcast] Error in channel listener:', err);
          }
        });
      }
    };
  }
  return channel;
}

/**
 * Notifies other open tabs and local window listeners that a page has been saved.
 * Dispatches both across tabs (via BroadcastChannel) and locally within the same window.
 */
export function broadcastPageSaved(
  pageId: string,
  crdtState: string | null,
  html: string,
  senderInstanceId?: string
): void {
  const msg: PageSavedMessage = {
    type: 'PAGE_SAVED',
    pageId,
    crdtState,
    html,
    timestamp: Date.now(),
    senderInstanceId,
  };

  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage(msg);
    } catch (err) {
      console.warn('[Caderno:Broadcast] Failed to send broadcast message:', err);
    }
  }

  // Also notify listeners in same window (for internal tab sync)
  listeners.forEach((cb) => {
    try {
      cb(msg);
    } catch (err) {
      console.error('[Caderno:Broadcast] Error dispatching local listener:', err);
    }
  });
}

/**
 * Registers a callback invoked whenever another tab persists a page.
 * Returns an unregister cleanup function (for useEffect cleanup).
 */
export function onPageSaved(callback: PageSavedCallback): () => void {
  getChannel(); // ensure channel is initialized
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
