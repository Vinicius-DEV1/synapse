export class NetworkResilience {
  /**
   * Executes a network request with Exponential Backoff and Timeout support.
   */
  static async fetchWithBackoff<T>(
    requestFn: (signal: AbortSignal) => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000,
    timeoutMs = 30000
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      let isTimedOut = false;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        isTimedOut = true;
        controller.abort(new Error('Timeout'));
      }, timeoutMs);
      
      try {
        const result = await requestFn(controller.signal);
        clearTimeout(timeoutId);
        return result;
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        
        const isAbort = error instanceof Error && error.name === 'AbortError';
        // If aborted by user/caller explicitly (and NOT triggered by our timeout timer), abort retry backoff immediately
        if (isAbort && !isTimedOut && error.message !== 'Timeout') {
          throw error;
        }
        
        attempt++;
        if (attempt >= maxRetries) {
          if (isTimedOut) {
            throw new Error(`Tempo limite de ${Math.round(timeoutMs / 1000)}s excedido na comunicação com o servidor.`);
          }
          throw error;
        }
        
        // Exponential Backoff (1s, 2s, 4s...)
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Unreachable');
  }
}
