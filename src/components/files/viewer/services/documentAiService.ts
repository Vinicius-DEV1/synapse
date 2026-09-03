import { promptGemini } from '../../../../services/gemini';
import { getSettings } from '../../../../utils/settings';

export interface DocumentAiMessage {
  role: 'user' | 'model';
  text: string;
  proposedMarkdown?: string;
}

export interface DocumentAiPromptOptions {
  documentText: string;
  documentTitle: string;
  userInstruction: string;
  history?: DocumentAiMessage[];
  customModelId?: string;
}

export interface DocumentAiResult {
  chatText: string;
  proposedMarkdown?: string;
  hasChanges: boolean;
}

const DOCUMENT_AI_SYSTEM_INSTRUCTION = `Você é o assistente inteligente de documentos do aplicativo Caderno, especializado em analisar, revisar, aprofundar tópicos, remover seções e reestruturar documentos Markdown (.md).
Você recebe o documento completo atual do usuário e as instruções dele.

DIRETRIZES DE RESPOSTA:
1. Se o usuário pedir para MODIFICAR, EDITAR, APROFUNDAR, EXPANDIR ou REMOVER algo do documento:
   - Forneça uma explicação concisa e amigável em português sobre o que foi alterado.
   - Em seguida, forneça o documento Markdown COMPLETO atualizado dentro de um bloco de código markdown exatamente no formato:
     \`\`\`markdown
     # Título do Documento
     ... (conteúdo completo atualizado)
     \`\`\`
2. Se o usuário fizer apenas uma PERGUNTA ou solicitar uma ANÁLISE sem pedir para alterar o documento:
   - Responda de forma clara e conversacional, sem incluir o bloco de código de documento completo.
3. Mantenha o tom profissional, didático e objetivo.`;

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
 * Sends a contextual document prompt to Gemini with full markdown document context.
 */
export async function sendDocumentAiPrompt(options: DocumentAiPromptOptions): Promise<DocumentAiResult> {
  const { documentText, documentTitle, userInstruction, history = [], customModelId } = options;

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

  // Context injection on prompt
  const fullPrompt = `Documento Atual: "${documentTitle}"
---
INÍCIO DO DOCUMENTO:
${documentText}
---
FIM DO DOCUMENTO.

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

    const { chatText, proposedMarkdown } = extractMarkdownFromResponse(responseObj.text);

    return {
      chatText,
      proposedMarkdown,
      hasChanges: Boolean(proposedMarkdown && proposedMarkdown !== documentText.trim()),
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
