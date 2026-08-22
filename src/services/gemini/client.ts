import { getSettings } from '../../utils/settings';
import { NetworkResilience } from '../../utils/network-resilience';
import { getGeminiKeys, saveGeminiKeys } from './keys';
import type { GeminiModel } from './types';

export async function fetchGeminiModels(): Promise<GeminiModel[]> {
  try {
    const keys = await getGeminiKeys();
    const activeKey = keys.find(k => k.status === 'active');
    if (!activeKey) {
      throw new Error('Nenhuma chave da API Gemini ativa encontrada.');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${activeKey.key}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro ao buscar modelos do Gemini');
    }
    // Filter only valid models for our use case (e.g. ones that start with 'models/gemini' and support text/vision)
    return (data.models as any[])
      .filter(m => m.name.startsWith('models/gemini'))
      .map(m => ({
        name: m.name,
        version: m.version,
        displayName: m.displayName,
        description: m.description,
      }));
  } catch (error) {
    console.error('fetchGeminiModels error:', error);
    throw error;
  }
}

export async function promptGemini(
  prompt: string,
  mediaBase64?: string | string[],
  history: any[] = [],
  customModelId?: string,
  customSystemInstruction?: string
): Promise<{ text: string; usage?: any }> {
  const keys = await getGeminiKeys();
  const activeKeys = keys.filter(k => k.status === 'active');

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

  // Failover loop
  for (const currentKeyEntry of activeKeys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${fullModelId}:generateContent?key=${currentKeyEntry.key}`;

    console.warn(`[DEBUG IA] Iniciando requisição com a chave: ${currentKeyEntry.key.slice(0,4)}...${currentKeyEntry.key.slice(-4)} | Modelo: ${fullModelId}`);

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
        4, // 4 retries
        1500, // base 1.5s delay
        30000 // 30s timeout
      );

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('RATE_LIMIT');
        } else if (response.status >= 500) {
          throw new Error('SERVER_ERROR');
        } else if (response.status === 400 || response.status === 403 || response.status === 404) {
          console.error(`[DEBUG IA] Fatal Error for Model: ${fullModelId}`, data.error);
          throw new Error(`Erro fatal da API (${response.status}): ${data.error?.message || 'Requisição inválida ou chave incorreta.'}`);
        }
        console.error(`[DEBUG IA] Unknown API Error:`, data);
        throw new Error(data.error?.message || 'Erro ao chamar a API do Gemini');
      }

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        const text = candidate?.content?.parts?.[0]?.text || '';
        return { text, usage: data.usageMetadata };
      }
      return { text: '' };
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT') {
        console.warn(`Chave Gemini esgotada (429). Desativando por 23h e rotacionando...`);
        // Update key in database
        const allKeys = await getGeminiKeys();
        const target = allKeys.find(k => k.id === currentKeyEntry.id);
        if (target) {
          target.status = 'exhausted';
          target.disabledUntil = Date.now() + 23 * 60 * 60 * 1000;
          await saveGeminiKeys(allKeys);
        }
        continue; // Try next key in loop
      } else if (error.message === 'SERVER_ERROR') {
        console.warn(`Servidor do Google indisponível (5xx). Tentando próxima chave sem bloquear a atual...`);
        continue;
      }
      
      console.error('promptGemini error:', error);
      throw error;
    }
  }

  throw new Error('Todas as chaves ativas falharam ao processar o pedido. Limite de cota excedido.');
}
