import { getSettings } from '../utils/settings';

export interface GeminiKeyEntry {
  id: string;
  key: string;
  status: 'active' | 'exhausted' | 'error';
  disabledUntil?: number;
  addedAt: number;
}

export async function getGeminiKeys(): Promise<GeminiKeyEntry[]> {
  if (!window.api?.config) return [];
  
  let keys: GeminiKeyEntry[] | null = await window.api.config.get('geminiApiKeys');
  
  // Migration logic from old string
  if (!keys) {
    const legacyKey = await window.api.config.get('geminiApiKey');
    if (legacyKey && typeof legacyKey === 'string') {
      keys = [{
        id: crypto.randomUUID(),
        key: legacyKey,
        status: 'active',
        addedAt: Date.now()
      }];
      await window.api.config.set('geminiApiKeys', keys);
      await window.api.config.set('geminiApiKey', null);
    } else {
      keys = [];
    }
  }
  
  // Reactivate keys if disabled time has passed
  let needsSave = false;
  const now = Date.now();
  for (const k of keys) {
    if (k.status === 'exhausted' && k.disabledUntil && k.disabledUntil < now) {
      k.status = 'active';
      k.disabledUntil = undefined;
      needsSave = true;
    }
  }
  
  if (needsSave) {
    await window.api.config.set('geminiApiKeys', keys);
  }
  
  return keys;
}

export async function saveGeminiKeys(keys: GeminiKeyEntry[]): Promise<void> {
  if (window.api?.config) {
    await window.api.config.set('geminiApiKeys', keys);
  }
}


export interface GeminiModel {
  name: string;
  version: string;
  displayName: string;
  description: string;
}

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

export async function promptGemini(prompt: string, imageBase64?: string, history: any[] = []): Promise<string> {
  const keys = await getGeminiKeys();
  const activeKeys = keys.filter(k => k.status === 'active');

  if (activeKeys.length === 0) {
    throw new Error('Todas as chaves da API estão esgotadas ou bloqueadas. Tente novamente mais tarde ou adicione novas chaves nas Configurações.');
  }

  const settings = getSettings();
  let modelId = settings.geminiModel || 'models/gemini-1.5-pro';

  const fullModelId = modelId.startsWith('models/') ? modelId : `models/${modelId}`;

  const systemInstruction = `Se o usuário pedir para transcrever uma questão ou gerar uma questão de múltipla escolha, retorne ESTRITAMENTE um JSON com o schema: {"enunciado": "...", "opcoes": ["A", "B", "C", "D"], "correta": 0} (onde correta é o índice numérico). Não use markdown, apenas o JSON cru. Se não for uma requisição de questão, responda normalmente.`;

  const contents: any[] = [];

  if (history && history.length > 0) {
    const formattedHistory = JSON.parse(JSON.stringify(history)); // deep copy
    if (formattedHistory[0].role === 'user') {
      const originalText = formattedHistory[0].parts[0].text;
      formattedHistory[0].parts[0].text = `${systemInstruction}\n\n${originalText}`;
    }
    contents.push(...formattedHistory);
    
    const userParts: any[] = [{ text: prompt }];
    if (imageBase64) {
      const mimeTypeMatch = imageBase64.match(/^data:(image\/[a-zA-Z]*);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
      const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z]*;base64,/, '');
      userParts.push({
        inline_data: { mime_type: mimeType, data: base64Data }
      });
    }
    contents.push({ role: 'user', parts: userParts });
  } else {
    const userParts: any[] = [{ text: `${systemInstruction}\n\nPedido do usuário:\n${prompt}` }];
    if (imageBase64) {
      const mimeTypeMatch = imageBase64.match(/^data:(image\/[a-zA-Z]*);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
      const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z]*;base64,/, '');
      userParts.push({
        inline_data: { mime_type: mimeType, data: base64Data }
      });
    }
    contents.push({ role: 'user', parts: userParts });
  }

  const requestBody = { contents };

  // Failover loop
  for (const currentKeyEntry of activeKeys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${fullModelId}:generateContent?key=${currentKeyEntry.key}`;

    console.warn(`[DEBUG IA] Iniciando requisição com a chave: ${currentKeyEntry.key.slice(0,4)}...${currentKeyEntry.key.slice(-4)} | Modelo: ${fullModelId}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

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
        return data.candidates[0].content.parts[0].text;
      }
      return '';
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT') {
        console.warn(`Chave Gemini esgotada (429). Desativando por 23h e rotacionando...`);
        // Atualiza a chave no banco
        const allKeys = await getGeminiKeys();
        const target = allKeys.find(k => k.id === currentKeyEntry.id);
        if (target) {
          target.status = 'exhausted';
          target.disabledUntil = Date.now() + 23 * 60 * 60 * 1000;
          await saveGeminiKeys(allKeys);
        }
        continue; // Tenta a próxima chave do loop
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

// Para criar questões automaticamente via JSON
export async function promptGeminiForQuestion(prompt: string, imageBase64?: string): Promise<{
  enunciado: string;
  opcoes: string[];
  correta: number; // indice da correta (0 a N)
}> {
  const customPrompt = `${prompt}\n\nResponda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "enunciado": "Texto da questão",
  "opcoes": ["Opção A", "Opção B", "Opção C", "Opção D"],
  "correta": 0
}
Onde 'correta' é o índice (começando em 0) da opção verdadeira. NÃO INCLUA MAIS NADA ALÉM DO JSON. Não use blocos de código markdown (\`\`\`json) na resposta.`;

  const responseText = await promptGemini(customPrompt, imageBase64);
  
  try {
    // Strip markdown JSON wrapper if the model still returns it
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse Gemini JSON:', responseText);
    throw new Error('A IA não retornou um JSON válido.');
  }
}
