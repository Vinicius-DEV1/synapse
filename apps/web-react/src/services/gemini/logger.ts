import { getWebDb } from '../db-web';

export interface AiLogEntry {
  id: string;
  module: string;
  model: string;
  prompt: string;
  response: string | null;
  error: string | null;
  status: 'error' | 'success';
  token_usage?: unknown;
  created_at: string;
}

export async function logAIApiCall(
  module: string,
  model: string,
  prompt: unknown,
  response: unknown,
  error?: string,
  tokenUsage?: unknown
): Promise<void> {
  try {
    const db = await getWebDb();
    const log: AiLogEntry = {
      id: crypto.randomUUID(),
      module,
      model,
      prompt: typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
      response: response ? (typeof response === 'string' ? response : JSON.stringify(response)) : null,
      error: error || null,
      status: error ? 'error' : 'success',
      token_usage: tokenUsage || null,
      created_at: new Date().toISOString(),
    };
    await db.put('ai_logs', log);
  } catch (e) {
    console.warn('Failed to log AI call', e);
  }
}
