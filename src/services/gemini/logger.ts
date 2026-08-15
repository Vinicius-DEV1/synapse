import { getWebDb } from '../db-web';

export async function logAIApiCall(
  module: string,
  model: string,
  prompt: any,
  response: any,
  error?: string,
  tokenUsage?: any
): Promise<void> {
  try {
    const db = await getWebDb();
    await db.put('ai_logs', {
      id: crypto.randomUUID(),
      module,
      model,
      prompt: typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
      response: response ? (typeof response === 'string' ? response : JSON.stringify(response)) : null,
      error: error || null,
      status: error ? 'error' : 'success',
      token_usage: tokenUsage || null,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Failed to log AI call', e);
  }
}
