import { getSettings } from '../utils/settings';

export interface GeminiModel {
  name: string;
  version: string;
  displayName: string;
  description: string;
}

export async function fetchGeminiModels(apiKey: string): Promise<GeminiModel[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
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
  const settings = getSettings();
  if (!settings.geminiApiKey) {
    throw new Error('API Key do Gemini não está configurada.');
  }

  const modelId = settings.geminiModel || 'models/gemini-1.5-pro';
  const fullModelId = modelId.startsWith('models/') ? modelId : `models/${modelId}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/${fullModelId}:generateContent?key=${settings.geminiApiKey}`;

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

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro ao chamar a API do Gemini');
    }

    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    }
    return '';
  } catch (error) {
    console.error('promptGemini error:', error);
    throw error;
  }
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
