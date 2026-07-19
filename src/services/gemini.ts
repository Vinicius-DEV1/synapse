import { getSettings } from '../utils/settings';
import { NetworkResilience } from '../utils/NetworkResilience';
import { getWebDb } from './db-web';

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

export async function promptGemini(prompt: string, imageBase64?: string, history: any[] = [], customModelId?: string, customSystemInstruction?: string): Promise<{ text: string, usage?: any }> {
  const keys = await getGeminiKeys();
  const activeKeys = keys.filter(k => k.status === 'active');

  if (activeKeys.length === 0) {
    throw new Error('Todas as chaves da API estão esgotadas ou bloqueadas. Tente novamente mais tarde ou adicione novas chaves nas Configurações.');
  }

  const settings = getSettings();
  let modelId = customModelId || settings.geminiModel || 'models/gemini-1.5-pro';

  const fullModelId = modelId.startsWith('models/') ? modelId : `models/${modelId}`;

  const systemInstruction = customSystemInstruction || `Se o usuário pedir para transcrever uma questão ou gerar uma questão de múltipla escolha, retorne ESTRITAMENTE um JSON com o schema: {"enunciado": "...", "opcoes": ["A", "B", "C", "D"], "correta": 0} (onde correta é o índice numérico). Não use markdown, apenas o JSON cru. Se não for uma requisição de questão, responda normalmente.`;

  const contents: any[] = [];

  if (history && history.length > 0) {
    const formattedHistory = JSON.parse(JSON.stringify(history)); // deep copy
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
  }

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

  const response = await promptGemini(customPrompt, imageBase64);
  const responseText = response.text;
  
  try {
    // Strip markdown JSON wrapper if the model still returns it
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse Gemini JSON:', responseText);
    throw new Error('A IA não retornou um JSON válido.');
  }
}

// Para avaliar flashcards do Anki
export async function promptGeminiForAnkiEvaluation(front: string, back: string, typedAnswer: string): Promise<{
  verdict: 'Correto' | 'Parcial' | 'Incorreto';
  feedback: string;
}> {
  const customPrompt = "O usuário está estudando com Flashcards. Você é um professor avaliando a resposta dele.\n" +
"Frente do Cartão (Contexto): \"" + front + "\"\n" +
"Resposta Correta Esperada: \"" + back + "\"\n" +
"Resposta do Aluno: \"" + typedAnswer + "\"\n\n" +
"Regra de Avaliação:\n" +
"1. Se a resposta do aluno capta a essência semântica e gramatical, é 'Correto'.\n" +
"2. Se há um erro ortográfico leve ou faltou uma pequena nuance, mas a ideia está certa, é 'Parcial'.\n" +
"3. Se mudou o sentido ou está incorreto, é 'Incorreto'.\n\n" +
"Responda ESTRITAMENTE em formato JSON com o seguinte schema:\n" +
"{\n" +
"  \"verdict\": \"Correto\" | \"Parcial\" | \"Incorreto\",\n" +
"  \"feedback\": \"Uma breve frase (máx 20 palavras) explicando o motivo, focando em ajudar o aluno.\"\n" +
"}\n" +
"Não use blocos de código markdown (```json) na resposta. Apenas o JSON cru.";

  const response = await promptGemini(customPrompt);
  const responseText = response.text;
  
  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse Gemini JSON for Anki evaluation:', responseText);
    throw new Error('A IA não retornou um JSON válido na avaliação.');
  }
}

export async function logAIApiCall(module: string, model: string, prompt: any, response: any, error?: string, tokenUsage?: any) {
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

import { getAiPrompt } from './db-web';

export const DEFAULT_CARD_GENERATION_PROMPT = "Você é um especialista em criação de Flashcards para memorização espaçada (Anki).\n" +
"O usuário solicitará a criação de novos flashcards. \n" +
"Sua tarefa é retornar ESTRITAMENTE um JSON Array de objetos. Nenhum texto adicional.\n" +
"Cada objeto do array deve seguir o schema:\n" +
"{\n" +
"  \"front\": \"Texto da frente do cartão\",\n" +
"  \"back\": \"Texto do verso do cartão (vazio para clozes)\",\n" +
"  \"type\": \"reading\" | \"cloze\" | \"typing\",\n" +
"  \"tags\": [\"array\", \"de\", \"tags\", \"curtas\"],\n" +
"  \"suggested_deck_id\": \"(Opcional) ID do sub-baralho sugerido caso aplicável\"\n" +
"}\n" +
"Regras:\n" +
"1. Se for gerar um cartão de completamento (cloze), o texto 'front' DEVE conter as lacunas no formato {{c1::palavra}}, e 'back' deve ficar vazio. Você pode criar múltiplas lacunas se achar melhor (ex: {{c1::foo}} e {{c2::bar}}).\n" +
"2. Se o usuário fornecer o contexto do baralho atual, NÃO REPITA NENHUM CARTÃO que já existe no contexto. Crie cartões totalmente inéditos, que complementem o material enviado.\n" +
"3. Se o contexto possuir uma lista de 'subdecks' (filhos do baralho atual), você pode analisar o assunto de cada filho e sugerir alocar o novo cartão em um deles usando o campo 'suggested_deck_id' (informando o ID do sub-baralho). Se o cartão for geral ou nenhum filho se aplicar perfeitamente, omita esse campo.\n" +
"4. Para cada cartão gerado, crie de 1 a 3 tags curtas sobre O CONTEÚDO. REGRAS DE TAGS: NUNCA crie uma tag que seja idêntica ou muito similar ao nome do baralho atual ou de seus sub-baralhos (isso é redundante). Concentre-se em sub-tópicos mais específicos (ex: em um baralho 'Javascript', use 'array', 'funcao' e NÃO 'javascript'). NUNCA crie tags sobre dificuldade (ex: dificil, revisar). DÊ PREFERÊNCIA ABSOLUTA a reutilizar as tags já existentes no contexto. Escreva sempre no SINGULAR e sem acentuação (ex: use 'verbo' em vez de 'verbos'). Retorne as tags no array 'tags'.\n" +
"5. Não exceda o limite de {{maxCards}} cartões na sua resposta. Retorne os melhores cartões possíveis.\n" +
"6. O campo 'type' define a forma de estudo. Use 'reading' para flashcards normais de leitura, 'cloze' para cartões de preencher lacunas, e 'typing' SE O USUÁRIO PEDIR cartões de digitação ou escrita livre.\n" +
"7. Jamais use blocos markdown (```json). Retorne APENAS o JSON.";

export async function promptGeminiForCardSuggestions(userPrompt: string, maxCards: number, contextData?: any, customModelId?: string): Promise<any[]> {
  let systemInstruction = await getAiPrompt('anki_card_suggestions') || DEFAULT_CARD_GENERATION_PROMPT;
  systemInstruction = systemInstruction.replace('{{maxCards}}', maxCards.toString());

  const contextStr = contextData ? `\n--- CONTEXTO DO BARALHO ATUAL ---\n${JSON.stringify(contextData)}\n--------------------------------\n` : '';
  const finalPrompt = `${systemInstruction}\n\n${contextStr}\nPedido do usuário: ${userPrompt}`;

  try {
    const response = await promptGemini(finalPrompt, undefined, [], customModelId);
    const responseText = response.text;
    logAIApiCall('anki_card_suggestions', customModelId || 'default', finalPrompt, responseText, undefined, response.usage);
    
    try {
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        let parsed = JSON.parse(cleanJson);
        
        // POST-PROCESSAMENTO: Trava de segurança extra para remover tags redundantes
        if (Array.isArray(parsed) && contextData) {
          const rootDeckName = (contextData.deck_name || '').toLowerCase();
          const subdecksMap = new Map();
          if (Array.isArray(contextData.subdecks)) {
            contextData.subdecks.forEach((s: any) => subdecksMap.set(s.id, (s.name || '').toLowerCase()));
          }
          
          parsed = parsed.map(card => {
            if (Array.isArray(card.tags)) {
              const targetDeckName = card.suggested_deck_id ? subdecksMap.get(card.suggested_deck_id) : rootDeckName;
              card.tags = card.tags.filter((t: string) => {
                const lowerT = t.toLowerCase();
                return lowerT !== rootDeckName && (!targetDeckName || lowerT !== targetDeckName);
              });
            }
            return card;
          });
        }
        
        return parsed;
      } catch (err) {
      logAIApiCall('anki_card_suggestions', customModelId || 'default', finalPrompt, responseText, 'Invalid JSON returned', response.usage);
      throw new Error('A IA não retornou um JSON válido na geração de cartões.');
    }
  } catch (e: any) {
    logAIApiCall('anki_card_suggestions', customModelId || 'default', finalPrompt, null, e.message);
    throw e;
  }
}

export const DEFAULT_CHAT_ANALYSIS_PROMPT = `Você é um professor e especialista em memorização (Anki). Você está ajudando o usuário em um chat a revisar e melhorar seu baralho.
O usuário vai pedir análises ou geração/edição de cartões.
Você deve SEMPRE retornar sua resposta ESTRITAMENTE no formato JSON abaixo, sem usar formatação markdown (\`\`\`json). Apenas o texto do JSON cru.

Schema esperado:
{
  "message": "A mensagem de texto que você responderá ao usuário no chat (sempre obrigatório). Pode usar formatação markdown leve (negrito, listas) mas sem aspas não escapadas.",
  "actions": [
    {
      "type": "create",
      "cards": [{"front": "...", "back": "...", "type": "reading", "tags": ["tag1", "tag2"], "suggested_deck_id": "(opcional) ID do sub-baralho se aplicável"}]
    },
    {
      "type": "edit",
      "card_id": "ID do cartão no contexto",
      "new_front": "Novo texto da frente",
      "new_back": "Novo texto do verso",
      "new_tags": ["tag_preservada", "nova_tag"]
    },
    {
      "type": "delete_bulk",
      "cards_to_delete": [
        { "card_id": "ID do cartão", "reason": "Por que excluir?" }
      ]
    }
  ]
}

  REGRAS DE TAGS PARA CRIAÇÃO/EDIÇÃO: NUNCA crie uma tag que seja idêntica ou muito similar ao nome do baralho atual ou de seus sub-baralhos (isso é redundante). Concentre-se em sub-tópicos específicos. NUNCA crie tags sobre dificuldade (ex: dificil). DÊ PREFERÊNCIA ABSOLUTA a reutilizar as tags já existentes no contexto. Escreva sempre no SINGULAR e sem acentuação.
  
  REGRAS DE TIPOS (type): Use 'reading' para flashcards normais, 'cloze' para preencher lacunas, e 'typing' SE O USUÁRIO PEDIR escrita livre.
  
  Só adicione ações de 'create' se o usuário pedir para gerar cartões. Só adicione 'edit' ou 'delete_bulk' se você encontrar ativamente algum cartão no contexto fornecido que precise ser melhorado ou excluído.
Para editar ou excluir, você precisa olhar o 'id' dos cartões no contexto atual fornecido. Se encontrar múltiplos cartões inúteis ou redundantes, exclua todos juntos no 'delete_bulk'. 
Se o contexto possuir uma lista de 'subdecks' (filhos do baralho atual), você DEVE analisar o assunto de cada filho e sugerir alocar o novo cartão criado em um deles usando o campo 'suggested_deck_id' (informando o ID do sub-baralho). Os cartões no array 'existing_cards' possuem a propriedade 'deck_id', que indica a qual sub-baralho ou baralho pai eles pertencem. Use essa informação para fazer contagens ou análises corretas. REGRA CRÍTICA: Se o usuário pedir para criar cartões e você não tiver certeza de qual sub-baralho ele quer usar, NÃO GERE OS CARTÕES AINDA. Ao invés disso, use a 'message' para perguntar em qual sub-baralho ele deseja colocar (liste os disponíveis) e aguarde a resposta dele. Se o cartão for explicitamente geral e para a raiz, omita o campo.
A propriedade 'message' é sempre OBRIGATÓRIA.
Regras de Padronização:
1. TAGS: Sempre que criar ou editar cartões, forneça tags curtas focadas OBRIGATORIAMENTE no CONTEÚDO (ex: verbos, biologia). NUNCA crie tags genéricas de dificuldade ou estado (ex: importante, revisar, dificil). Dê PREFERÊNCIA ABSOLUTA a usar tags já existentes no contexto. Ao criar novas, escreva sempre no SINGULAR e sem acentuação (ex: 'verbo' em vez de 'verbos').
2. TEXTOS (FRONT/BACK): Mantenha os cartões curtos e objetivos. Evite blocos de texto gigantescos, prefira informações atomizadas (fáceis de memorizar rapidamente).
Você tem capacidade de geração massiva. NUNCA mencione restrições de tamanho na sua resposta, nunca fracione entregas injustificadamente, NUNCA peça permissão para continuar, e nunca dê desculpas para gerar menos cartões do que o pedido (ex: se o usuário pedir para gerar ou editar 100 cartões, você DEVE gerar o JSON contendo TODOS eles de uma vez).
EXCEÇÃO: A única exceção é se a quantidade pedida for EXTREMAMENTE exagerada e desnecessária (ex: pedir 500 ou 1000 cartões de uma vez). Nesse caso específico, NÃO GERE OS CARTÕES. Ao invés disso, use a propriedade 'message' para avisar o usuário que a quantidade é gigantesca, perguntando se ele tem certeza de que deseja desperdiçar tantos tokens, e aguarde a confirmação dele no chat antes de gerar.
Não retorne NADA ALÉM do JSON válido.`;

export async function promptGeminiForChatAnalysis(userPrompt: string, history: any[] = [], contextData?: any, customModelId?: string): Promise<any> {
  const systemInstruction = await getAiPrompt('anki_chat_analysis') || DEFAULT_CHAT_ANALYSIS_PROMPT;
  const contextStr = contextData ? `\n--- CONTEXTO DO BARALHO (USE OS IDs PARA EDIT/DELETE) ---\n${JSON.stringify(contextData)}\n--------------------------------\n` : '';

  const finalSystemInstruction = systemInstruction + contextStr;
  const finalPrompt = userPrompt;

  let fullLogPrompt = systemInstruction + '\n\n' + contextStr;
  if (history && history.length > 0) {
     fullLogPrompt += '\n--- HISTÓRICO DO CHAT ---\n';
     fullLogPrompt += JSON.stringify(history, null, 2);
     fullLogPrompt += '\n-------------------------\n';
  }
  fullLogPrompt += '\nPedido atual do usuário: ' + userPrompt;

  try {
    const response = await promptGemini(finalPrompt, undefined, history, customModelId, finalSystemInstruction);
    const responseText = response.text;
    logAIApiCall('anki_chat_analysis', customModelId || 'default', fullLogPrompt, responseText, undefined, response.usage);
    
    try {
      let cleanedText = responseText;
      if (cleanedText.startsWith('```json')) {
         cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanedText.startsWith('```')) {
         cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      const parsed = JSON.parse(cleanedText);
      
      // POST-PROCESSAMENTO PROGRAMÁTICO (Trava de segurança extra para tags)
      if (typeof parsed === 'object' && parsed.actions && Array.isArray(parsed.actions) && contextData) {
        const rootDeckName = (contextData.deck_name || '').toLowerCase();
        const subdecksMap = new Map();
        if (Array.isArray(contextData.subdecks)) {
          contextData.subdecks.forEach((s: any) => subdecksMap.set(s.id, (s.name || '').toLowerCase()));
        }
        
        parsed.actions.forEach((action: any) => {
          if (action.type === 'create' && Array.isArray(action.cards)) {
            action.cards.forEach((card: any) => {
              if (Array.isArray(card.tags)) {
                const targetDeckName = card.suggested_deck_id ? subdecksMap.get(card.suggested_deck_id) : rootDeckName;
                card.tags = card.tags.filter((t: string) => {
                  const lowerT = t.toLowerCase();
                  return lowerT !== rootDeckName && (!targetDeckName || lowerT !== targetDeckName);
                });
              }
            });
          } else if (action.type === 'edit' && Array.isArray(action.new_tags)) {
            action.new_tags = action.new_tags.filter((t: string) => {
              const lowerT = t.toLowerCase();
              if (lowerT === rootDeckName) return false;
              for (let subName of subdecksMap.values()) {
                if (lowerT === subName) return false;
              }
              return true;
            });
          }
        });
      }

      if (response.usage && typeof parsed === 'object') {
         parsed._usage = response.usage;
      }
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError, responseText);
      return { message: "Desculpe, ocorreu um erro ao processar o formato da resposta. " + responseText };
    }
  } catch (e: any) {
    logAIApiCall('anki_chat_analysis', customModelId || 'default', fullLogPrompt, null, e.message);
    throw e;
  }
}
