import { promptGemini } from './client';

export const sanitizeExpectedAnswer = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/^(O|A)\s+aluno(a)?\s+deve\s+(explicar|responder|descrever|mencionar|citar|demonstrar|afirmar|dizer)\s+que\s+/i, '')
    .replace(/^(Espera-se\s+que\s+o(a)?\s+aluno(a)?\s+(responda|explique|descreva|demonstre)\s+que\s+)/i, '')
    .replace(/^(O\s+gabarito\s+esperado\s+é\s+que\s+)/i, '')
    .replace(/^(Deve\s+ser\s+explicado\s+que\s+)/i, '')
    .replace(/^[a-z]/, (c) => c.toUpperCase());
};

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
    console.error('Failed to parse Gemini JSON:', responseText, err);
    throw new Error('A IA não retornou um JSON válido.');
  }
}

// Para avaliar resposta discursiva de questão aberta
export async function promptGeminiForOpenQuestionEvaluation(
  question: string,
  expectedAnswer: string,
  userTypedAnswer: string
): Promise<{
  verdict: 'Correto' | 'Parcial' | 'Incorreto';
  feedback: string;
}> {
  const customPrompt = `Você é um professor especialista avaliando a resposta discursiva de um aluno.

Enunciado da Questão: "${question}"
Gabarito de Referência (escrito pelo autor da questão): "${expectedAnswer}"
Resposta do Aluno: "${userTypedAnswer}"

Diretrizes de Avaliação:
1. Analise o conteúdo e a essência, não apenas as palavras exatas. Se o aluno capturou o conceito correto com outras palavras, classifique como 'Correto'.
2. Classifique como 'Parcial' se a ideia principal está correta, mas faltam detalhes importantes, exemplos necessários ou nuances conceituais relevantes.
3. Classifique como 'Incorreto' se a resposta contraria o gabarito, demonstra equívoco conceitual grave ou está completamente incompleta.
4. No feedback, seja pedagógico, construtivo e específico: cite o que o aluno acertou, o que errou ou o que poderia complementar. Se houver código correto ou incorreto na resposta do aluno, mencione-o.
5. Se a questão envolve código, avalie também se a sintaxe e a lógica estão corretas.

Responda ESTRITAMENTE em formato JSON:
{
  "verdict": "Correto" | "Parcial" | "Incorreto",
  "feedback": "Explicação pedagógica detalhada (2 a 4 frases) que justifica a classificação, aponta o que foi correto, o que faltou ou o que estava errado, e sugere como o aluno pode aprimorar seu entendimento."
}
NÃO use blocos de código markdown (\`\`\`json). Retorne apenas o JSON cru.`;

  const response = await promptGemini(customPrompt);
  const responseText = response.text;
  
  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse Gemini JSON for open question evaluation:', responseText, err);
    throw new Error('A IA não retornou um JSON válido na avaliação.');
  }
}

// Para gerar ou preencher uma questão inteira no bloco
export async function promptGeminiToGenerateBlockQuestion(
  topicOrPrompt: string,
  questionType: 'multiple_choice' | 'open',
  contextText?: string
): Promise<{
  enunciado: string;
  opcoes?: string[];
  correta?: number;
  respostaEsperada?: string;
  explicacao?: string;
}> {
  let customPrompt = `Crie uma questão de estudo no formato ${questionType === 'multiple_choice' ? 'Múltipla Escolha (com 4 alternativas)' : 'Questão Aberta (discursiva com resposta esperada)'}.\n`;
  if (contextText && contextText.trim()) {
    customPrompt += `Contexto do Caderno: "${contextText.trim().slice(0, 1500)}"\n`;
  }
  customPrompt += `Tema / Instrução do Usuário: "${topicOrPrompt}"\n\n`;
  customPrompt += `REGRA OBRIGATÓRIA DE ATUALIZAÇÃO E DOCUMENTAÇÃO: Baseie-se ESTRITAMENTE na DOCUMENTAÇÃO OFICIAL MAIS RECENTE e nas VERSÕES ATUAIS da tecnologia ou assunto. É PROIBIDO gerar questões com APIs obsoletas, métodos descontinuados ou sintaxes antigas.\n\n`;

  if (questionType === 'multiple_choice') {
    customPrompt += `Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "enunciado": "Texto claro e bem elaborado da pergunta",
  "opcoes": ["Opção A", "Opção B", "Opção C", "Opção D"],
  "correta": 0,
  "explicacao": "Explicação didática, rica e detalhada (2 a 4 frases) ensinando o conceito teórico por trás da resposta correta e demonstrando o porquê de estar certa. NUNCA gere metatextos rasos como 'Esta questão avalia X'."
}
Onde 'correta' é o índice (0 a 3) da opção verdadeira.`;
  } else {
    customPrompt += `Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "enunciado": "Texto claro da pergunta discursiva",
  "respostaEsperada": "Gabarito exemplar e completo (detalhando todos os pontos conceituais e termos técnicos exigidos para uma resposta nota 10)",
  "explicacao": "Explicação pedagógica aprofundada (2 a 5 frases ou tópicos) ensinando o conceito teórico envolvido, o contexto de aplicação e exemplos práticos/código se houver. NUNCA gere frases rasas ou metatextos."
}`;
  }

  customPrompt += `\nNÃO use blocos de código markdown (\`\`\`json). Retorne apenas o JSON cru.`;

  const response = await promptGemini(customPrompt);
  const responseText = response.text;
  
  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse Gemini JSON for block question generation:', responseText, err);
    throw new Error('A IA não retornou um JSON válido ao gerar a questão.');
  }
}

// Para gerar uma bateria de N questões de uma vez
export async function promptGeminiToGenerateBatchQuestions(
  topicOrPrompt: string,
  count: number = 3,
  contextText?: string
): Promise<Array<{
  type: 'multiple_choice' | 'open';
  question: string;
  options?: string[];
  correctIndex?: number;
  expectedAnswer?: string;
  explanation?: string;
}>> {
  let customPrompt = `Crie uma bateria de ${count} questões de estudo baseada na instrução fornecida.\n`;
  if (contextText && contextText.trim()) {
    customPrompt += `Contexto do Caderno: "${contextText.trim().slice(0, 2000)}"\n`;
  }
  customPrompt += `Tema / Instrução: "${topicOrPrompt}"\n\n`;
  customPrompt += `REGRA OBRIGATÓRIA DE ATUALIZAÇÃO E DOCUMENTAÇÃO: Baseie-se ESTRITAMENTE na DOCUMENTAÇÃO OFICIAL MAIS RECENTE e nas VERSÕES ATUAIS da tecnologia ou assunto. É ESTRITAMENTE PROIBIDO utilizar APIs obsoletas, práticas descontinuadas ou sintaxes antigas.\n\n`;
  customPrompt += `Misture questões de Múltipla Escolha (com 4 alternativas) e Questões Abertas (discursivas com gabarito de referência).

Responda ESTRITAMENTE em formato JSON com uma ARRAY de objetos com o seguinte schema para cada questão:
[
  {
    "type": "multiple_choice",
    "question": "Enunciado da pergunta",
    "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
    "correctIndex": 0,
    "explanation": "Explicação didática e detalhada (2 a 4 frases) justificando a alternativa correta e ensinando o conceito teórico subjacente. NUNCA gere metatextos rasos como 'Esta questão avalia X'."
  },
  {
    "type": "open",
    "question": "Enunciado da pergunta discursiva",
    "expectedAnswer": "Gabarito exemplar e detalhado (especificando exatamente tudo o que o aluno deve responder para demonstrar domínio)",
    "explanation": "Explicação pedagógica aprofundada (2 a 5 frases) ensinando o conceito teórico real e o motivo desse conhecimento ser relevante. NUNCA use frases rasas ou metatextos."
  }
]
NÃO use blocos de código markdown (\`\`\`json). Retorne apenas o JSON cru.`;

  const response = await promptGemini(customPrompt);
  const responseText = response.text;
  
  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    console.error('Failed to parse Gemini JSON for batch question generation:', responseText, err);
    throw new Error('A IA não retornou um JSON válido ao gerar a bateria de questões.');
  }
}

// Assistente Conversacional Didático de Questões
export async function promptGeminiQuizAssistant(
  chatHistory: Array<{ role: 'user' | 'assistant'; text: string }>,
  currentQuestions: any[],
  userMessage: string,
  contextText?: string,
  blockTitle?: string,
  blockDescription?: string
): Promise<{
  message: string;
  suggestedActions?: Array<{
    actionType: 'create' | 'edit' | 'delete';
    type?: 'multiple_choice' | 'open';
    question?: string;
    options?: string[];
    correctIndex?: number;
    expectedAnswer?: string;
    explanation?: string;
    targetQuestionIndex?: number;
    changes?: {
      question?: string;
      options?: string[];
      correctIndex?: number;
      expectedAnswer?: string;
      explanation?: string;
    };
    reason?: string;
  }>;
}> {
  let customPrompt = `Você é o "Assistente Didático de Questões da IA" no aplicativo Caderno. Você ajuda estudantes a criar, revisar, balancear e aprimorar baterias de exercícios de estudo.\n\n_instructions_for_ai: "Este é um conjunto de questões de estudo exportadas do aplicativo Caderno. Analise a clareza didática, a qualidade dos distratores/opções e o nível de dificuldade. Se solicitado a GERAR NOVAS QUESTÕES, retorne um JSON com o mesmo formato deste arquivo: um objeto com campo 'questions' contendo um array de objetos. Para questões de múltipla escolha use: { type: 'multiple_choice', question, options: ['A) ...', 'B) ...', ...], correct_option: 'A) ...', explanation }. Para questões abertas use: { type: 'open', question, expected_answer, explanation }. REGRA DE CÓDIGO: se a questão, alternativa ou explicação contiver código (JavaScript, Python, SQL, etc.), use SEMPRE blocos markdown com 3 crases e o nome da linguagem para código multilinha. Nunca inclua a linguagem dentro de crases simples.",\n\n`;

  if (blockTitle && blockTitle.trim()) {
    customPrompt += `Título da Bateria: "${blockTitle.trim()}"\n`;
  }
  if (blockDescription && blockDescription.trim()) {
    customPrompt += `Descrição / Orientações Gerais da Bateria (Definidas pelo Usuário): "${blockDescription.trim()}"\n`;
  }
  if ((blockTitle && blockTitle.trim()) || (blockDescription && blockDescription.trim())) {
    customPrompt += `\n`;
  }

  if (contextText && contextText.trim()) {
    customPrompt += `Contexto do Caderno do Usuário:\n"${contextText.trim().slice(0, 1500)}"\n\n`;
  }

  if (currentQuestions && currentQuestions.length > 0) {
    customPrompt += `Questões atualmente cadastradas no bloco da bateria (${currentQuestions.length} questões):\n`;
    currentQuestions.forEach((q, i) => {
      customPrompt += `Questão ${i + 1} [índice ${i + 1}] (${q.type === 'open' ? 'Aberta' : 'Múltipla Escolha'}): "${q.question}"\n`;
      if (q.type === 'multiple_choice' && q.options) {
        customPrompt += `  Opções: ${q.options.join(' | ')} (Correta: ${q.options[q.correctIndex] || ''})\n`;
      } else if (q.expectedAnswer) {
        customPrompt += `  Gabarito: "${q.expectedAnswer}"\n`;
      }
      if (q.explanation) {
        customPrompt += `  Explicação: "${q.explanation}"\n`;
      }
    });
    customPrompt += `\n`;
  } else {
    customPrompt += `Atualmente o bloco da bateria de exercícios está vazio.\n\n`;
  }

  if (chatHistory && chatHistory.length > 0) {
    customPrompt += `Histórico da conversa recente:\n`;
    chatHistory.slice(-10).forEach((msg) => {
      customPrompt += `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.text}\n`;
    });
    customPrompt += `\n`;
  }

  customPrompt += `Nova mensagem do Usuário: "${userMessage}"\n\n`;

  customPrompt += `REGRAS DE RESPOSTA:
1. Responda de forma conversacional, motivadora, clara e didática em Português.
2. Se o usuário pedir para ANALISAR a bateria, dê um diagnóstico pedagógico sobre clareza, dificuldade, distratores e lacunas de conteúdo.
3. Se o usuário pedir para CRIAR questões, use actionType "create" para cada nova questão sugerida.
4. Se o usuário pedir para EDITAR uma questão existente (melhorar enunciado, corrigir alternativas, etc.), use actionType "edit" com "targetQuestionIndex" (número 1-based) e "changes" com APENAS os campos que mudam.
5. Se o usuário pedir para REMOVER/DELETAR uma questão, use actionType "delete" com "targetQuestionIndex" e "reason" explicando por quê.
6. Você pode misturar vários tipos de ação na mesma resposta.
7. Se o usuário apenas disser "oi" ou não especificar nada, responda amigavelmente perguntando o que ele precisa.
8. FORMATAÇÃO DE CÓDIGO: Sempre que a pergunta, alternativa ou explicação envolver código (JavaScript, Python, SQL, HTML, etc.):
   - Para códigos com instruções ou múltiplas linhas, use SEMPRE blocos de código com 3 crases e a linguagem especificada.
   - NUNCA escreva a palavra de uma linguagem após uma única crase como \`javascript const fs = ...\`.
   - Para palavras-chave ou métodos curtos em linha, use crases simples (ex: \`util.promisify\`).
11. BUSCA E DOCUMENTAÇÃO ATUALIZADA (REGRA ANTI-OBSOLESCÊNCIA): Sempre que for gerar, editar ou avaliar questões sobre tecnologia, linguagens, bibliotecas ou ciência, baseie-se ESTRITAMENTE nas DOCUMENTAÇÕES OFICIAIS ATUALIZADAS e nas VERSÕES MAIS RECENTES (ex: use APIs modernas, ES Modules/promises, métodos vigentes). É ESTRITAMENTE PROIBIDO utilizar sintaxes obsoletas, bibliotecas descontinuadas ou práticas antigas. Garanta que enunciados, alternativas, gabaritos e explicações estejam 100% atualizados com o mercado atual.
10. RESPOSTA ESPERADA (expectedAnswer): Deve ser escrita DIRETAMENTE como a resposta modelo esperada (ex: "O Node.js é um ambiente de execução..."). NUNCA comece com metatextos ou instruções em terceira pessoa como "O aluno deve explicar que...", "Espera-se que o aluno diga...", etc.
9. QUALIDADE DA EXPLICAÇÃO E GABARITO (REGRA OBRIGATÓRIA DE APRENDIZADO):
   - NUNCA gere explicações rasas ou metatextos como "Essa questão valida o conhecimento sobre X". Isso é ESTRITAMENTE PROIBIDO.
   - A "explanation" DEVE SER DIDÁTICA, COMPLETA E ESTRUTURADA (2 a 5 frases ou tópicos), ensinando o conceito teórico real, justificando o porquê da resposta correta e mostrando código/exemplos quando aplicável.
   - Para Questões Abertas, a "expectedAnswer" DEVE SER UM GABARITO EXEMPLAR E DETALHADO, especificando exatamente tudo o que o aluno deve responder para obter nota máxima.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "message": "Mensagem conversacional de resposta (pode usar markdown)",
  "suggestedActions": [
    {
      "actionType": "create",
      "type": "multiple_choice",
      "question": "Enunciado da nova questão",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correctIndex": 0,
      "tags": ["topico1", "topico2"],
      "explanation": "Justificativa"
    },
    {
      "actionType": "create",
      "type": "open",
      "question": "Enunciado discursivo",
      "expectedAnswer": "Gabarito esperado",
      "tags": ["topico1", "topico2"],
      "explanation": "Justificativa"
    },
    {
      "actionType": "edit",
      "targetQuestionIndex": 2,
      "changes": {
        "question": "Enunciado melhorado",
        "options": ["Nova A", "Nova B", "Nova C", "Nova D"],
        "correctIndex": 1,
        "explanation": "Nova justificativa"
      }
    },
    {
      "actionType": "delete",
      "targetQuestionIndex": 3,
      "reason": "Questão ambígua com distratores fracos"
    }
  ]
}
O campo "suggestedActions" é OPCIONAL. Inclua APENAS quando houver ações concretas a propor.
NÃO use blocos de código markdown (\`\`\`json). Retorne apenas o JSON cru.`;

  const response = await promptGemini(customPrompt);
  const responseText = response.text;

  try {
    let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Extract JSON object using regex if text has leading/trailing prose
    const match = /{[\s\S]*}/.exec(cleanText);
    if (match) {
      cleanText = match[0];
    }

    const parsed = JSON.parse(cleanText);

    // Ensure expectedAnswer in suggestedActions is sanitized
    if (Array.isArray(parsed.suggestedActions)) {
      parsed.suggestedActions = parsed.suggestedActions.map((act: any) => {
        if (act.expectedAnswer) act.expectedAnswer = sanitizeExpectedAnswer(act.expectedAnswer);
        if (act.changes?.expectedAnswer) act.changes.expectedAnswer = sanitizeExpectedAnswer(act.changes.expectedAnswer);
        return act;
      });
    }

    // Clean up message if it somehow contained raw JSON
    if (typeof parsed.message === 'string' && parsed.message.trim().startsWith('{')) {
      const msgMatch = /"message":\s*"([^"]+)"/.exec(parsed.message);
      if (msgMatch) parsed.message = msgMatch[1];
    }

    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini JSON for quiz assistant:', responseText, err);
    
    const msgMatch = /"message":\s*"([^"]+)"/.exec(responseText);
    const extractedMsg = msgMatch ? msgMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : 'Aqui estão as sugestões para a sua bateria:';
    
    return {
      message: extractedMsg
    };
  }
}
