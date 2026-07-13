export class NetworkResilience {
  /**
   * Executes a network request with Exponential Backoff and Timeout support.
   */
  static async fetchWithBackoff<T>(
    requestFn: (signal: AbortSignal) => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000,
    timeoutMs = 15000
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(new Error('Timeout')), timeoutMs);
      
      try {
        const result = await requestFn(controller.signal);
        clearTimeout(timeoutId);
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        // Se foi abortado pelo usuário (não por timeout), aborta o backoff
        if (error.name === 'AbortError' && error.message !== 'Timeout') {
          throw error;
        }
        
        attempt++;
        if (attempt >= maxRetries) {
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
