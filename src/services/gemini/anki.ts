import { promptGemini } from './client';
import { logAIApiCall } from './logger';
import { getAiPrompt } from '../db-web';

// Evaluates Anki flashcard answers
export async function promptGeminiForAnkiEvaluation(
  front: string,
  back: string,
  typedAnswer: string,
  mediaBase64?: string,
  customModelId?: string
): Promise<{
  verdict: 'Correto' | 'Parcial' | 'Incorreto';
  feedback: string;
  transcription?: string;
}> {
  let customPrompt = "O usuário está estudando com Flashcards. Você é um professor avaliando a resposta dele.\n" +
"Frente do Cartão (Contexto): \"" + front + "\"\n" +
"Resposta Correta Esperada: \"" + back + "\"\n";

  if (mediaBase64) {
    customPrompt += "O aluno forneceu a resposta em ÁUDIO (anexo). Ouça o áudio e avalie a resposta dele.\n\n";
  } else {
    customPrompt += "Resposta do Aluno: \"" + typedAnswer + "\"\n\n";
  }

  customPrompt += "Regra de Avaliação:\n" +
"1. Se a resposta do aluno capta a essência semântica e gramatical, é 'Correto'. No caso de áudio, tolere sotaques e leves erros de pronúncia se a intenção for clara e correta.\n" +
"2. Se há um erro ortográfico/pronúncia leve ou faltou uma pequena nuance, mas a ideia principal está certa, é 'Parcial'.\n" +
"3. Se mudou o sentido, está incorreto, ou no áudio disse algo sem sentido/diferente, é 'Incorreto'.\n\n" +
"Responda ESTRITAMENTE em formato JSON com o seguinte schema:\n" +
"{\n" +
"  \"verdict\": \"Correto\" | \"Parcial\" | \"Incorreto\",\n" +
"  \"feedback\": \"Uma breve frase (máx 20 palavras) explicando o motivo, focando em ajudar o aluno.\",\n" +
(mediaBase64 ? "  \"transcription\": \"Opcional. Transcrição exata do que você ouviu no áudio.\"\n" : "") +
"}\n" +
"Não use blocos de código markdown (```json) na resposta. Apenas o JSON cru.";

  const response = await promptGemini(customPrompt, mediaBase64, [], customModelId);
  const responseText = response.text;
  
  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse Gemini JSON for Anki evaluation:', responseText, err);
    throw new Error('A IA não retornou um JSON válido na avaliação.');
  }
}

export const DEFAULT_CARD_GENERATION_PROMPT = "Você é um especialista em criação de Flashcards para memorização espaçada (Anki).\n" +
"O usuário solicitará a criação de novos flashcards. \n" +
"Sua tarefa é retornar ESTRITAMENTE um JSON Array de objetos. Nenhum texto adicional.\n" +
"Cada objeto do array deve seguir o schema:\n" +
"{\n" +
"  \"front\": \"Texto da frente do cartão\",\n" +
"  \"back\": \"Texto do verso do cartão (vazio para clozes)\",\n" +
"  \"type\": \"reading\" | \"cloze\" | \"typing\" | \"speaking\" | \"listening\",\n" +
"  \"tags\": [\"array\", \"de\", \"tags\", \"curtas\"],\n" +
"  \"suggested_deck_id\": \"(Opcional) ID do sub-baralho sugerido caso aplicável\"\n" +
"}\n" +
"Regras:\n" +
"1. Se for gerar um cartão de completamento (cloze), o texto 'front' DEVE conter as lacunas no formato {{c1::palavra}}, e 'back' deve ficar vazio. Você pode criar múltiplas lacunas se achar melhor (ex: {{c1::foo}} e {{c2::bar}}).\n" +
"2. Se o contexto possuir uma lista de 'subdecks' (filhos do baralho atual), você pode analisar o assunto de cada filho e sugerir alocar o novo cartão em um deles usando o campo 'suggested_deck_id' (informando o ID do sub-baralho). Se o cartão for geral ou nenhum filho se aplicar perfeitamente, omita esse campo.\n" +
"3. Para cada cartão gerado, crie de 1 a 3 tags curtas sobre O CONTEÚDO. REGRAS DE TAGS: NUNCA crie uma tag idêntica ao nome do baralho atual. Foque em sub-tópicos específicos. Reutilize tags existentes no contexto quando possível. Use sempre o SINGULAR e sem acentuação.\n" +
"4. Não exceda o limite de {{maxCards}} cartões na sua resposta. Retorne os melhores cartões possíveis.\n" +
"5. O campo 'type' define a forma de estudo. Use:\n" +
"   - 'reading' para leitura normal.\n" +
"   - 'cloze' para preencher lacunas.\n" +
"   - 'typing' para prática de digitação/escrita livre.\n" +
"   - 'speaking' se o usuário pedir cartões focados em praticar a pronúncia, falar em voz alta, ou testes de conversação por voz.\n" +
"   - 'listening' se o usuário pedir cartões focados na escuta (áudios).\n" +
"6. Se você adicionar uma explicação ou exemplo no verso do cartão, separe-os da resposta principal usando quebras de linha (\\n\\n).\n" +
"7. Jamais use blocos markdown (```json). Retorne APENAS o JSON válido.";

export async function promptGeminiForCardSuggestions(
  userPrompt: string,
  maxCards: number,
  contextData?: any,
  customModelId?: string
): Promise<any[]> {
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
      
      // POST-PROCESSING: Extra safety guard to strip redundant tags
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
      "cards": [{"front": "...", "back": "...", "type": "reading|speaking|listening|cloze|typing", "tags": ["tag1", "tag2"], "suggested_deck_id": "(opcional) ID do sub-baralho se aplicável"}]
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
  
  REGRAS DE TIPOS (type): Use 'reading' para flashcards normais, 'cloze' para preencher lacunas, 'typing' para escrita livre, 'speaking' se o usuário pedir cartões focados em praticar a pronúncia/fala, e 'listening' para testes de audição.
  
  Só adicione ações de 'create' se o usuário pedir para gerar cartões. Só adicione 'edit' ou 'delete_bulk' se você encontrar ativamente algum cartão no contexto fornecido que precise ser melhorado ou excluído.
Para editar ou excluir, você precisa olhar o 'id' dos cartões no contexto atual fornecido. Se encontrar múltiplos cartões inúteis ou redundantes, exclua todos juntos no 'delete_bulk'. 
Se o contexto possuir uma lista de 'subdecks' (filhos do baralho atual), você DEVE analisar o assunto de cada filho e sugerir alocar o novo cartão criado em um deles usando o campo 'suggested_deck_id' (informando o ID do sub-baralho). Os cartões no array 'existing_cards' possuem a propriedade 'deck_id', que indica a qual sub-baralho ou baralho pai eles pertencem. Use essa informação para fazer contagens ou análises corretas. REGRA CRÍTICA: Se o usuário pedir para criar cartões e você não tiver certeza de qual sub-baralho ele quer usar, NÃO GERE OS CARTÕES AINDA. Ao invés disso, use a 'message' para perguntar em qual sub-baralho ele deseja colocar (liste os disponíveis) e aguarde a resposta dele. Se o cartão for explicitamente geral e para a raiz, omita o campo.
A propriedade 'message' é sempre OBRIGATÓRIA.
Regras de Padronização:
1. TAGS: Sempre que criar ou editar cartões, forneça tags curtas focadas OBRIGATORIAMENTE no CONTEÚDO (ex: verbos, biologia). NUNCA crie tags genéricas de dificuldade ou estado (ex: importante, revisar, dificil). Dê PREFERÊNCIA ABSOLUTA a usar tags já existentes no contexto. Ao criar novas, escreva sempre no SINGULAR e sem acentuação (ex: 'verbo' em vez de 'verbos').
2. TEXTOS (FRONT/BACK): Mantenha os cartões curtos e objetivos. Evite blocos de texto gigantescos, prefira informações atomizadas (fáceis de memorizar rapidamente). Se você adicionar uma explicação ou exemplo no verso do cartão, separe-os da resposta principal usando quebras de linha (\n\n).
Você tem capacidade de geração massiva. NUNCA mencione restrições de tamanho na sua resposta, nunca fracione entregas injustificadamente, NUNCA peça permissão para continuar, e nunca dê desculpas para gerar menos cartões do que o pedido (ex: se o usuário pedir para gerar ou editar 100 cartões, você DEVE gerar o JSON contendo TODOS eles de uma vez).
EXCEÇÃO: A única exceção é se a quantidade pedida for EXTREMAMENTE exagerada e desnecessária (ex: pedir 500 ou 1000 cartões de uma vez). Nesse caso específico, NÃO GERE OS CARTÕES. Ao invés disso, use a propriedade 'message' para avisar o usuário que a quantidade é gigantesca, perguntando se ele tem certeza de que deseja desperdiçar tantos tokens, e aguarde a confirmação dele no chat antes de gerar.
Não retorne NADA ALÉM do JSON válido.`;

export async function promptGeminiForChatAnalysis(
  userPrompt: string,
  history: any[] = [],
  contextData?: any,
  customModelId?: string
): Promise<any> {
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
      
      // PROGRAMMATIC POST-PROCESSING: Extra safety guard for tags
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
