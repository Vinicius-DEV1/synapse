import { promptGemini } from '../../../../services/gemini';
import { getSettings } from '../../../../utils/settings';
import type { ReferencedBattery, QuestionItem } from '../../../editor-extensions/quiz/types';

export interface DocumentAiMessage {
  role: 'user' | 'model';
  text: string;
  proposedMarkdown?: string;
  generatedQuestions?: QuestionItem[];
  targetBattery?: ReferencedBattery;
}

export interface DocumentAiPromptOptions {
  documentText: string;
  documentTitle: string;
  userInstruction: string;
  history?: DocumentAiMessage[];
  referencedBatteries?: ReferencedBattery[];
  customModelId?: string;
}

export interface DocumentAiResult {
  chatText: string;
  proposedMarkdown?: string;
  hasChanges: boolean;
  generatedQuestions?: QuestionItem[];
  targetBattery?: ReferencedBattery;
}

const DOCUMENT_AI_SYSTEM_INSTRUCTION = `Você é o assistente inteligente de documentos do aplicativo Caderno, especializado em analisar, revisar, aprofundar tópicos, remover seções, reestruturar documentos Markdown (.md) e gerar questões de exercícios integradas.
Você recebe o documento completo atual do usuário e as instruções dele.

DIRETRIZES DE RESPOSTA:
1. Se o usuário pedir para MODIFICAR, EDITAR, APROFUNDAR, EXPANDIR ou REMOVER algo do documento:
   - Forneça uma explicação concisa e amigável em português sobre o que foi alterado.
   - Em seguida, forneça o documento Markdown COMPLETO atualizado dentro de um bloco de código markdown exatamente no formato:
     \`\`\`markdown
     # Título do Documento
     ... (conteúdo completo atualizado)
     \`\`\`
2. Se o usuário pedir para GERAR ou ACRESCENTAR QUESTÕES para uma bateria de questões referenciada (@...):
   - Crie questões de alta qualidade pedagógica, formuladas estritamente com base nos conceitos apresentados no documento.
   - NÃO duplique nem repita questões que já existam na bateria referenciada.
   - Forneça uma breve explicação no chat e retorne as questões em um bloco JSON estrito no formato:
     \`\`\`json
     [
       {
         "type": "multiple_choice",
         "question": "Enunciado da questão...",
         "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
         "correctIndex": 0,
         "explanation": "Explicação detalhada do gabarito..."
       }
     ]
     \`\`\`
     Para questões discursivas/abertas, use "type": "open", omita "options" e "correctIndex" e forneça "expectedAnswer": "Gabarito modelo esperado...".
3. Se o usuário fizer apenas uma PERGUNTA ou solicitar uma ANÁLISE sem pedir para alterar o documento nem gerar questões:
   - Responda de forma clara e conversacional, sem incluir bloco de código markdown nem JSON.
4. Mantenha o tom profissional, didático e objetivo.`;

/**
 * Extracts conversational explanation and proposed markdown code block from raw AI response.
 */
export function extractMarkdownFromResponse(rawText: string): { chatText: string; proposedMarkdown?: string } {
  if (!rawText) {
    return { chatText: '' };
  }

  // Matches ```markdown ... ``` or ```md ... ``` code blocks
  const codeBlockRegex = /```(?:markdown|md)?\s*\n([\s\S]*?)\n```/i;
  const match = codeBlockRegex.exec(rawText);

  if (match && match[1]) {
    const proposedMarkdown = match[1].trim();
    // Everything outside the code block is chat commentary
    const chatText = rawText.replace(match[0], '').trim();
    return {
      chatText: chatText || 'Atualizei o documento com as modificações solicitadas.',
      proposedMarkdown,
    };
  }

  return {
    chatText: rawText.trim(),
  };
}

/**
 * Extracts generated quiz questions from raw AI response JSON blocks.
 */
export function extractGeneratedQuestionsFromResponse(rawText: string): QuestionItem[] {
  if (!rawText) return [];

  const jsonBlockRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/i;
  const match = jsonBlockRegex.exec(rawText);
  let jsonString = match ? match[1].trim() : '';

  if (!jsonString) {
    // Check if rawText contains JSON array
    const rawArrayMatch = /\[[\s\S]*\]/.exec(rawText);
    if (rawArrayMatch) {
      jsonString = rawArrayMatch[0].trim();
    }
  }

  if (!jsonString) return [];

  try {
    const parsed = JSON.parse(jsonString);
    const list = Array.isArray(parsed) ? parsed : [parsed];

    return list
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item.question === 'string'))
      .map((item, idx) => {
        const isOpen = item.type === 'open';
        const options = Array.isArray(item.options) ? item.options.map((o) => String(o)) : [];
        const correctIndex = typeof item.correctIndex === 'number' ? Math.max(0, Math.min(options.length - 1, item.correctIndex)) : 0;
        const expectedAnswer = typeof item.expectedAnswer === 'string' ? item.expectedAnswer : '';
        const explanation = typeof item.explanation === 'string' ? item.explanation : '';
        const tags = Array.isArray(item.tags) ? item.tags.map((t) => String(t)) : [];

        const questionItem: QuestionItem = {
          id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          type: isOpen ? 'open' : 'multiple_choice',
          question: String(item.question).trim(),
          options,
          correctIndex,
          selectedIndex: null,
          expectedAnswer,
          userTypedAnswer: '',
          aiFeedback: null,
          explanation,
          showExplanation: false,
          answered: false,
          tags,
        };
        return questionItem;
      });
  } catch (err) {
    console.warn('[documentAiService] Erro ao analisar questões JSON da resposta:', err);
    return [];
  }
}

/**
 * Sends a contextual document prompt to Gemini with full markdown document context and optional quiz batteries.
 */
export async function sendDocumentAiPrompt(options: DocumentAiPromptOptions): Promise<DocumentAiResult> {
  const {
    documentText,
    documentTitle,
    userInstruction,
    history = [],
    referencedBatteries = [],
    customModelId,
  } = options;

  if (!userInstruction.trim()) {
    throw new Error('A instrução para a IA não pode estar vazia.');
  }

  const settings = getSettings();
  const model = customModelId || settings.geminiModelChat || settings.geminiModel;

  // Format multi-turn history into Gemini payload format
  const geminiHistory = history.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  // Build referenced batteries context if provided
  let batteriesContext = '';
  if (referencedBatteries.length > 0) {
    const formattedList = referencedBatteries
      .map((b) => {
        const questionsSummary = b.questions
          .map(
            (q, i) =>
              `  - Q${i + 1} [${q.type === 'open' ? 'Discursiva' : 'Múltipla Escolha'}]: "${q.question}" ${
                q.type === 'multiple_choice'
                  ? `(Opções: ${q.options.join(' | ')}; Gabarito: opção ${q.correctIndex + 1})`
                  : `(Gabarito esperado: "${q.expectedAnswer}")`
              }`
          )
          .join('\n');

        return `BATERIA REFERENCIADA (@${b.title}):
Título: "${b.title}"
Página de Origem: "${b.pageTitle}"
Quantidade de Questões Existentes: ${b.questions.length}
Questões já existentes nesta bateria:
${questionsSummary || '  (Nenhuma questão cadastrada ainda)'}`;
      })
      .join('\n\n');

    batteriesContext = `\n---\nBATERIAS DE QUESTÕES REFERENCIADAS:\n${formattedList}\n---`;
  }

  // Context injection on prompt
  const fullPrompt = `Documento Atual: "${documentTitle}"
---
INÍCIO DO DOCUMENTO:
${documentText}
---
FIM DO DOCUMENTO.${batteriesContext}

INSTRUÇÃO DO USUÁRIO:
${userInstruction}`;

  try {
    const responseObj = await promptGemini(
      fullPrompt,
      undefined,
      geminiHistory,
      model,
      DOCUMENT_AI_SYSTEM_INSTRUCTION
    );

    const rawResponse = responseObj.text;
    const { chatText, proposedMarkdown } = extractMarkdownFromResponse(rawResponse);
    const generatedQuestions = extractGeneratedQuestionsFromResponse(rawResponse);

    // If questions were generated, remove the JSON block from chat text for clean display
    let cleanedChatText = chatText;
    if (generatedQuestions.length > 0) {
      cleanedChatText = cleanedChatText.replace(/```(?:json)?\s*\n[\s\S]*?\n```/i, '').trim();
      if (!cleanedChatText) {
        cleanedChatText = `Gerei ${generatedQuestions.length} novas questões baseadas no documento para a bateria referenciada.`;
      }
    }

    return {
      chatText: cleanedChatText,
      proposedMarkdown,
      hasChanges: Boolean(proposedMarkdown && proposedMarkdown !== documentText.trim()),
      generatedQuestions: generatedQuestions.length > 0 ? generatedQuestions : undefined,
      targetBattery: referencedBatteries.length > 0 ? referencedBatteries[0] : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao comunicar com a IA.';
    console.error('[documentAiService] Gemini prompt error:', err);

    if (msg.includes('Nenhuma chave da API Gemini ativa') || msg.includes('chaves da API estão esgotadas')) {
      throw new Error('Chave da API Gemini não configurada ou cota esgotada. Verifique suas configurações de Inteligência Artificial.');
    }

    if (msg.includes('429') || msg.includes('Resource has been exhausted')) {
      throw new Error('Limite de requisições excedido no momento. Aguarde alguns instantes e tente novamente.');
    }

    throw new Error(msg);
  }
}
