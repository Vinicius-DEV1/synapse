import { getSettings } from '../../utils/settings';
import { NetworkResilience } from '../../utils/network-resilience';
import {
  getGeminiKeys,
  updateGeminiKeyStatus,
  getRotatedActiveKeys,
} from './keys';
import type { GeminiModel } from './types';

export async function fetchGeminiModels(): Promise<GeminiModel[]> {
  const keys = await getGeminiKeys();
  const activeKeys = getRotatedActiveKeys(keys);

  if (activeKeys.length === 0) {
    throw new Error('Nenhuma chave da API Gemini ativa encontrada.');
  }

  let lastError: Error | null = null;

  // Failover loop across active keys
  for (const currentKeyEntry of activeKeys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${currentKeyEntry.key}`
      );
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          await updateGeminiKeyStatus(
            currentKeyEntry.id,
            'exhausted',
            Date.now() + 5 * 60 * 1000,
            'Limite de cota temporário'
          );
          continue;
        } else if (response.status === 400 || response.status === 403) {
          await updateGeminiKeyStatus(
            currentKeyEntry.id,
            'error',
            undefined,
            data.error?.message || 'Chave inválida ou revogada'
          );
          continue;
        }
        throw new Error(data.error?.message || 'Erro ao buscar modelos do Gemini');
      }

      // Filter only valid models for our use case
      return (data.models as any[])
        .filter((m: any) => m.name && m.name.startsWith('models/gemini'))
        .map((m: any) => ({
          name: m.name,
          version: m.version || '',
          displayName: m.displayName || m.name,
          description: m.description || '',
        }));
    } catch (error: any) {
      lastError = error;
      console.warn(
        `[fetchGeminiModels] Falha na chave ${currentKeyEntry.key.slice(0, 4)}...:`,
        error.message
      );
    }
  }

  throw lastError || new Error('Nenhuma chave ativa conseguiu listar os modelos disponíveis.');
}

export async function promptGemini(
  prompt: string,
  mediaBase64?: string | string[],
  history: any[] = [],
  customModelId?: string,
  customSystemInstruction?: string,
  timeoutMs = 45000
): Promise<{ text: string; usage?: any }> {
  const keys = await getGeminiKeys();
  const activeKeys = getRotatedActiveKeys(keys);

  if (activeKeys.length === 0) {
    throw new Error('Todas as chaves da API estão esgotadas ou bloqueadas. Tente novamente mais tarde ou adicione novas chaves nas Configurações.');
  }

  const settings = getSettings();
  const modelId = customModelId || settings.geminiModel;

  // Require configuration if model is unset or points to legacy defaults
  if (!modelId || modelId.includes('1.5-pro') || modelId.includes('2.5-pro') || modelId.includes('2.5-flash')) {
    throw new Error('Por favor, acesse as Configurações > Inteligência Artificial, carregue os modelos e escolha um modelo atual para usar.');
  }

  const fullModelId = modelId.startsWith('models/') ? modelId : `models/${modelId}`;

  const contents: any[] = [];

  if (history && history.length > 0) {
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role,
      parts: msg.parts
    }));
    contents.push(...formattedHistory);
  }

  const userParts: any[] = [{ text: prompt }];
  if (mediaBase64) {
    const mediaList = Array.isArray(mediaBase64) ? mediaBase64 : [mediaBase64];
    for (const mediaItem of mediaList) {
      if (!mediaItem) continue;
      const mimeTypeMatch = mediaItem.match(/^data:(.*?);base64,/);
      let mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
      // Strip codecs from mimeType to avoid Gemini API errors
      if (mimeType.includes(';')) {
        mimeType = mimeType.split(';')[0];
      }
      const base64Data = mediaItem.replace(/^data:.*?;base64,/, '');
      userParts.push({
        inline_data: { mime_type: mimeType, data: base64Data }
      });
    }
  }
  contents.push({ role: 'user', parts: userParts });

  const requestBody: any = { 
    contents,
    generationConfig: { maxOutputTokens: 65536 }
  };
  if (customSystemInstruction) {
    requestBody.system_instruction = { parts: { text: customSystemInstruction } };
  }

  let allServerErrors = true;
  let allQuotaErrors = true;
  let allAuthErrors = true;
  let lastErrorMsg = '';

  // Failover loop across rotated active keys
  for (const currentKeyEntry of activeKeys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${fullModelId}:generateContent?key=${currentKeyEntry.key}`;

    console.warn(`[GeminiPool] Requisição com a chave: ${currentKeyEntry.key.slice(0,4)}...${currentKeyEntry.key.slice(-4)} | Modelo: ${fullModelId}`);

    try {
      const response = await NetworkResilience.fetchWithBackoff(
        async (signal) => {
          return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal
          });
        },
        3, // 3 retries
        1000, // 1s base delay
        timeoutMs
      );

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          const errorMsg = data.error?.message || '';
          const isDaily =
            errorMsg.toLowerCase().includes('per-day') ||
            errorMsg.toLowerCase().includes('daily');
          const blockDuration = isDaily ? 23 * 60 * 60 * 1000 : 5 * 60 * 1000;
          const reason = isDaily ? 'Cota diária esgotada (23h)' : 'Limite por minuto excedido (5min)';

          console.warn(`[GeminiPool] Chave 429: ${reason}. Rotacionando para próxima chave...`);
          await updateGeminiKeyStatus(currentKeyEntry.id, 'exhausted', Date.now() + blockDuration, reason);

          allServerErrors = false;
          allAuthErrors = false;
          lastErrorMsg = errorMsg || 'Limite de cota excedido (429)';
          continue;
        } else if (response.status === 400 || response.status === 403) {
          const errorMsg = data.error?.message || `Chave rejeitada (${response.status}).`;
          console.warn(`[GeminiPool] Chave inválida ou revogada (${response.status}): ${errorMsg}. Rotacionando para próxima chave...`);
          await updateGeminiKeyStatus(currentKeyEntry.id, 'error', undefined, errorMsg);

          allServerErrors = false;
          allQuotaErrors = false;
          lastErrorMsg = errorMsg;
          continue;
        } else if (response.status >= 500) {
          console.warn(`[GeminiPool] Servidor do Google indisponível (${response.status}). Tentando próxima chave sem penalizar a atual...`);
          allQuotaErrors = false;
          allAuthErrors = false;
          lastErrorMsg = `Servidor do Google indisponível (${response.status})`;
          continue;
        }

        console.error(`[GeminiPool] Erro de API para modelo: ${fullModelId}`, data.error);
        throw new Error(`Erro fatal da API (${response.status}): ${data.error?.message || 'Requisição inválida.'}`);
      }

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        const text = candidate?.content?.parts?.[0]?.text || '';
        return { text, usage: data.usageMetadata };
      }
      return { text: '' };
    } catch (error: any) {
      if (
        error.message?.includes('Tempo limite') ||
        error.message?.includes('Failed to fetch') ||
        error.name === 'AbortError'
      ) {
        console.warn(`[GeminiPool] Erro de rede ou timeout na chave. Tentando próxima chave...`, error.message);
        allServerErrors = false;
        lastErrorMsg = error.message;
        continue;
      }

      console.error('promptGemini error:', error);
      throw error;
    }
  }

  if (allServerErrors && lastErrorMsg) {
    throw new Error('Os servidores da IA do Google estão temporariamente instáveis (5xx). Tente novamente em instantes.');
  }
  if (allAuthErrors && lastErrorMsg) {
    throw new Error('Todas as chaves da API configuradas são inválidas ou foram revogadas. Por favor, atualize suas chaves nas Configurações.');
  }
  if (allQuotaErrors && lastErrorMsg) {
    throw new Error('Todas as chaves da API estão com limites de cota excedidos no momento. Tente novamente mais tarde.');
  }

  throw new Error(lastErrorMsg || 'Todas as chaves da API falharam ao processar o pedido.');
}

