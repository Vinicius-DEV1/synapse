/**
 * Bridge client communicating with the Native Expo Shell via window.__cadernoBridgeSend.
 */

declare global {
  interface Window {
    __CADERNO_MOBILE_WEBVIEW__?: boolean;
    __cadernoBridgeSend?: (type: string, payload?: any) => Promise<any>;
    ReactNativeWebView?: {
      postMessage: (data: string) => void;
    };
  }
}

export async function sendBridgeMessage<T = any>(type: string, payload?: any): Promise<T> {
  if (typeof window !== 'undefined' && window.__cadernoBridgeSend) {
    return await window.__cadernoBridgeSend(type, payload);
  }

  // Fallback if injected script wasn't ready yet: wait briefly
  if (typeof window !== 'undefined' && window.ReactNativeWebView) {
    return new Promise<T>((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.__cadernoBridgeSend) {
          clearInterval(interval);
          window.__cadernoBridgeSend(type, payload).then(resolve).catch(reject);
        } else if (attempts > 20) {
          clearInterval(interval);
          reject(new Error(`Native bridge not ready for command: ${type}`));
        }
      }, 50);
    });
  }

  throw new Error(`Native WebView bridge not available for: ${type}`);
}

export async function sqliteGetAll<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const result = await sendBridgeMessage<T[]>('SQLITE_GET_ALL', { query, params });
  return result || [];
}

export async function sqliteGetFirst<T = any>(query: string, params: any[] = []): Promise<T | null> {
  return await sendBridgeMessage<T | null>('SQLITE_GET_FIRST', { query, params });
}

export async function sqliteExec(sql: string): Promise<void> {
  await sendBridgeMessage('SQLITE_EXEC', { sql });
}

export async function sqliteQuery(query: string, params: any[] = []): Promise<any> {
  return await sendBridgeMessage('SQLITE_QUERY', { query, params });
}

export async function sqliteBatch(statements: Array<{ sql: string; params?: any[] }>): Promise<boolean> {
  return await sendBridgeMessage('SQLITE_BATCH', { statements });
}

export async function triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'): Promise<void> {
  await sendBridgeMessage('HAPTIC', { style }).catch(() => {});
}

export async function notifyAppReady(): Promise<void> {
  await sendBridgeMessage('APP_READY').catch(() => {});
}
