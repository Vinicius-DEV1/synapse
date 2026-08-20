import { promptGemini } from './client';

export const sanitizeExpectedAnswer = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/^(O|A|O\(a\)|Os|As)?\s*(aluno|aluna|estudante)(s|\(a\))?\s+(deve|precisa)\s+(explicar|responder|descrever|mencionar|citar|demonstrar|afirmar|dizer)\s+(que|como)\s+/i, '')
    .replace(/^(Espera-se\s+que\s+(o|a|o\(a\)|os|as)?\s*(aluno|aluna|estudante)(s|\(a\))?\s+(responda|explique|descreva|demonstre|mencione|cite|afirme)\s+(que|como)\s+)/i, '')
    .replace(/^(O\s+gabarito\s+esperado\s+é\s+(que\s+)?)/i, '')
    .replace(/^(Deve\s+ser\s+explicado\s+(que|como)\s+)/i, '')
    .replace(/^(The\s+student\s+should\s+(explain|answer|describe|mention|demonstrate|state|say|cite)\s+(that|how)\s+)/i, '')
    .replace(/^(It\s+is\s+expected\s+that\s+(the\s+)?student\s+(responds|explains|describes|demonstrates|mentions|states)\s+(that|how)\s+)/i, '')
    .replace(/^(The\s+expected\s+(answer|response|key)\s+is\s+(that\s+)?)/i, '')
    .replace(/^(It\s+should\s+be\s+explained\s+(that|how)\s+)/i, '')
    .replace(/^(Gabarito|Resposta|Answer|Expected\s+Answer):\s*/i, '')
    .replace(/^[a-z]/, (c) => c.toUpperCase());
};

// Creates a study question automatically via JSON
export async function promptGeminiForQuestion(prompt: string, imageBase64?: string): Promise<{
  enunciado: string;
  opcoes: string[];
  correta: number; // 0-based index
}> {
  const customPrompt = `${prompt}

TASK & INSTRUCTIONS:
1. Create a high-quality, didactic study question based on the topic/input above.
2. Provide 4 well-formulated options with exactly one correct option.
3. LANGUAGE RULE (CRITICAL): Generate the question, options, and text in the same language as the prompt/input. If the input is in Portuguese, write in Portuguese; if in English, write in English. Match the language naturally.
4. Respond STRICTLY in raw JSON format matching the following schema:
{
  "enunciado": "Question text",
  "opcoes": ["Option A", "Option B", "Option C", "Option D"],
  "correta": 0
}
Where 'correta' is the 0-based index of the correct option. DO NOT include any text outside the JSON. Do not wrap in markdown code blocks (\`\`\`json).`;

  const response = await promptGemini(customPrompt, imageBase64);
  const responseText = response.text;
  
  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return {
      enunciado: parsed.enunciado || parsed.question || '',
      opcoes: parsed.opcoes || parsed.options || [],
      correta: typeof parsed.correta === 'number' ? parsed.correta : (parsed.correctIndex ?? 0),
    };
  } catch (err) {
    console.error('Failed to parse Gemini JSON for question:', responseText, err);
    throw new Error('A IA não retornou um JSON válido.');
  }
}

// Evaluates student open-ended / discursive question response
export async function promptGeminiForOpenQuestionEvaluation(
  question: string,
  expectedAnswer: string,
  userTypedAnswer: string
): Promise<{
  verdict: 'Correto' | 'Parcial' | 'Incorreto';
  feedback: string;
}> {
  const customPrompt = `You are an expert pedagogical professor evaluating a student's open-ended discursive response to a study question.

Question Prompt: "${question}"
Reference Model Answer: "${expectedAnswer}"
Student's Submitted Response: "${userTypedAnswer}"

EVALUATION GUIDELINES:
1. Focus on core conceptual understanding and substantive meaning, not merely exact keyword matching. If the student articulates the correct concept clearly in their own words, classify as 'Correto'.
2. Classify as 'Parcial' if the primary idea is accurate but lacks essential technical details, critical context, key steps, or conceptual nuances.
3. Classify as 'Incorreto' if the response contradicts the reference answer, demonstrates fundamental conceptual misconceptions, or is completely off-topic/empty.
4. Provide constructive, encouraging, and specific pedagogical feedback (2 to 4 sentences): state clearly what was accurate, what was missing or flawed, and how the student can solidify their understanding. If code is involved, evaluate both syntax and algorithmic logic.
5. LANGUAGE RULE (CRITICAL): Write the entire feedback in the natural language used in the question prompt and student's response. If the student/question is in Portuguese, formulate the feedback in Portuguese. If in English, write in English. Rely on your native multilingual intelligence.

Respond STRICTLY in raw JSON format with the following schema:
{
  "verdict": "Correto" | "Parcial" | "Incorreto",
  "feedback": "Detailed, constructive pedagogical feedback explaining the verdict and guiding the student."
}
Do NOT wrap with markdown code blocks (\`\`\`json). Return raw JSON only.`;

  const response = await promptGemini(customPrompt);
  const responseText = response.text;
  
  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    // Normalize verdict safely (check incorrect first to prevent substring collision with correct)
    let verdict: 'Correto' | 'Parcial' | 'Incorreto' = 'Incorreto';
    const rawVerdict = String(parsed.verdict || '').toLowerCase().trim();
    if (
      rawVerdict.includes('incorret') ||
      rawVerdict.includes('incorrect') ||
      rawVerdict.includes('wrong') ||
      rawVerdict.includes('errad')
    ) {
      verdict = 'Incorreto';
    } else if (rawVerdict.includes('parcial') || rawVerdict.includes('partial')) {
      verdict = 'Parcial';
    } else if (
      rawVerdict.includes('corret') ||
      rawVerdict.includes('correct') ||
      rawVerdict.includes('right')
    ) {
      verdict = 'Correto';
    }

    return {
      verdict,
      feedback: parsed.feedback || parsed.feedbackText || parsed.justification || '',
    };
  } catch (err) {
    console.error('Failed to parse Gemini JSON for open question evaluation:', responseText, err);
    throw new Error('A IA não retornou um JSON válido na avaliação.');
  }
}

// Generates or autofills a single study question for the block
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
  let customPrompt = `Create a high-quality study question in ${questionType === 'multiple_choice' ? 'Multiple Choice format (with 4 options)' : 'Open-ended format (with an exemplary model answer)'}.\n`;
  if (contextText && contextText.trim()) {
    customPrompt += `Notebook Context: "${contextText.trim().slice(0, 1500)}"\n`;
  }
  customPrompt += `Topic / User Instruction: "${topicOrPrompt}"\n\n`;
  customPrompt += `MANDATORY MODERN STANDARDS & ACCURACY: Base all content STRICTLY on the MOST RECENT OFFICIAL DOCUMENTATION and current versions. Obsolete methods, deprecated APIs, or legacy syntaxes are strictly prohibited.\n\n`;
  customPrompt += `LANGUAGE RULE (CRITICAL): Write the question, options, answers, and explanations in the natural language matching the user prompt or context (e.g., if the user writes or context is in Portuguese, output in Portuguese; if in English, output in English).\n\n`;

  if (questionType === 'multiple_choice') {
    customPrompt += `Respond STRICTLY in raw JSON format with the following schema:
{
  "enunciado": "Clear, precise, and well-crafted question text",
  "opcoes": ["Option A", "Option B", "Option C", "Option D"],
  "correta": 0,
  "explicacao": "In-depth, didactic explanation (2 to 4 sentences) teaching the theoretical concept and justifying why the correct option is right. Never output shallow meta-text like 'This question tests X'."
}
Where 'correta' is the 0-based index (0 to 3) of the correct option.`;
  } else {
    customPrompt += `Respond STRICTLY in raw JSON format with the following schema:
{
  "enunciado": "Clear open-ended question prompt",
  "respostaEsperada": "Exemplary, comprehensive model answer (written directly as the answer, detailing all technical concepts and key terms required for full marks)",
  "explicacao": "In-depth pedagogical explanation (2 to 5 sentences or structured points) explaining theoretical foundations, practical applications, and code examples where applicable. Never output shallow meta-text."
}`;
  }

  customPrompt += `\nDo NOT use markdown code block wrappers (\`\`\`json). Return raw JSON only.`;

  const response = await promptGemini(customPrompt);
  const responseText = response.text;
  
  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return {
      enunciado: parsed.enunciado || parsed.question || '',
      opcoes: parsed.opcoes || parsed.options,
      correta: typeof parsed.correta === 'number' ? parsed.correta : parsed.correctIndex,
      respostaEsperada: sanitizeExpectedAnswer(parsed.respostaEsperada || parsed.expectedAnswer || ''),
      explicacao: parsed.explicacao || parsed.explanation || '',
    };
  } catch (err) {
    console.error('Failed to parse Gemini JSON for block question generation:', responseText, err);
    throw new Error('A IA não retornou um JSON válido ao gerar a questão.');
  }
}

// Generates a batch of N study questions at once
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
  let customPrompt = `Generate a battery of ${count} high-quality study questions based on the provided topic and instructions.\n`;
  if (contextText && contextText.trim()) {
    customPrompt += `Notebook Context: "${contextText.trim().slice(0, 2000)}"\n`;
  }
  customPrompt += `Topic / Instruction: "${topicOrPrompt}"\n\n`;
  customPrompt += `MANDATORY MODERN STANDARDS & ACCURACY: Base all questions STRICTLY on the MOST RECENT OFFICIAL DOCUMENTATION and current versions. Obsolete practices, deprecated libraries, or outdated syntaxes are strictly forbidden.\n\n`;
  customPrompt += `LANGUAGE RULE (CRITICAL): Generate all content (questions, options, answers, explanations) in the natural language matching the user instruction or notebook context (e.g., if in Portuguese, write in Portuguese; if in English, write in English).\n\n`;
  customPrompt += `Mix Multiple Choice questions (with 4 options) and Open-ended questions (with detailed reference model answers).

Respond STRICTLY in raw JSON format with an ARRAY of objects following this schema for each question:
[
  {
    "type": "multiple_choice",
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Didactic, detailed explanation (2 to 4 sentences) teaching the underlying concept and justifying the correct choice. Never generate shallow meta-text."
  },
  {
    "type": "open",
    "question": "Open-ended question prompt",
    "expectedAnswer": "Comprehensive reference model answer detailing all key technical points required for mastery",
    "explanation": "In-depth pedagogical explanation (2 to 5 sentences) teaching the concept and its practical importance. Never use shallow meta-text."
  }
]
Do NOT use markdown code block wrappers (\`\`\`json). Return raw JSON only.`;

  const response = await promptGemini(customPrompt);
  const responseText = response.text;
  
  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    const rawArray = Array.isArray(parsed) ? parsed : [parsed];
    return rawArray.map((q: any) => ({
      type: (q.type || '').toLowerCase().includes('open') ? 'open' : 'multiple_choice',
      question: q.question || q.enunciado || '',
      options: q.options || q.opcoes,
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : (q.correta ?? 0),
      expectedAnswer: sanitizeExpectedAnswer(q.expectedAnswer || q.respostaEsperada || ''),
      explanation: q.explanation || q.explicacao || '',
    }));
  } catch (err) {
    console.error('Failed to parse Gemini JSON for batch question generation:', responseText, err);
    throw new Error('A IA não retornou um JSON válido ao gerar a bateria de questões.');
  }
}

// Interactive AI Pedagogical Quiz Assistant
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
  let customPrompt = `You are the "AI Study Questions Assistant" in the Caderno app. You help students create, analyze, balance, refine, and upgrade interactive study quiz batteries.\n\n`;

  if (blockTitle && blockTitle.trim()) {
    customPrompt += `Quiz Battery Title: "${blockTitle.trim()}"\n`;
  }
  if (blockDescription && blockDescription.trim()) {
    customPrompt += `Quiz Battery Description / Guidelines: "${blockDescription.trim()}"\n`;
  }
  if ((blockTitle && blockTitle.trim()) || (blockDescription && blockDescription.trim())) {
    customPrompt += `\n`;
  }

  if (contextText && contextText.trim()) {
    customPrompt += `User's Notebook Context:\n"${contextText.trim().slice(0, 1500)}"\n\n`;
  }

  if (currentQuestions && currentQuestions.length > 0) {
    customPrompt += `Currently registered questions in this battery (${currentQuestions.length} questions):\n`;
    currentQuestions.forEach((q, i) => {
      customPrompt += `Question ${i + 1} [Index ${i + 1}] (${q.type === 'open' ? 'Open-ended' : 'Multiple Choice'}): "${q.question}"\n`;
      if (q.type === 'multiple_choice' && q.options) {
        customPrompt += `  Options: ${q.options.join(' | ')} (Correct: ${q.options[q.correctIndex] || ''})\n`;
      } else if (q.expectedAnswer) {
        customPrompt += `  Model Answer: "${q.expectedAnswer}"\n`;
      }
      if (q.explanation) {
        customPrompt += `  Explanation: "${q.explanation}"\n`;
      }
    });
    customPrompt += `\n`;
  } else {
    customPrompt += `Currently, this exercise battery is empty.\n\n`;
  }

  if (chatHistory && chatHistory.length > 0) {
    customPrompt += `Recent Conversation History:\n`;
    chatHistory.slice(-10).forEach((msg) => {
      customPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}\n`;
    });
    customPrompt += `\n`;
  }

  customPrompt += `New User Message: "${userMessage}"\n\n`;

  customPrompt += `CORE INSTRUCTIONS & OPERATIONAL RULES:
1. LANGUAGE RULE (CRITICAL):
   - Detect the user's language and respond naturally in the SAME language (e.g., if the user writes in Portuguese or the question content is in Portuguese, respond in Portuguese; if the user writes in English, respond in English).
   - Use your native multilingual intelligence. Do not output English conversation or explanations if the user is interacting in Portuguese.
2. PEDAGOGICAL & CONVERSATIONAL TONE:
   - Respond in an encouraging, engaging, clear, and didactic manner.
   - If the user sends a greeting or general remark, reply warmly and ask how you can assist with their questions.
3. ACTION TYPES:
   - If the user asks to ANALYZE the battery, give a pedagogical diagnosis regarding clarity, difficulty, quality of distractors, and knowledge coverage.
   - If the user asks to CREATE new questions, use actionType "create" for each proposed question.
   - If the user asks to EDIT an existing question (improve question text, fix options, strengthen explanation), use actionType "edit" with "targetQuestionIndex" (1-based index) and "changes" containing ONLY the changed fields.
   - If the user asks to DELETE/REMOVE a question, use actionType "delete" with "targetQuestionIndex" and "reason" explaining why.
   - You can combine multiple actions in a single response when appropriate.
4. CODE FORMATTING GUIDELINES:
   - Whenever a question, option, or explanation contains code (JavaScript, Python, SQL, HTML, etc.):
     - Always use standard triple-backtick markdown blocks with the language specifier for multiline snippets.
     - Never place the language name immediately after a single backtick (avoid \`javascript const x = ...\`).
     - For inline identifiers or short keywords, use single backticks (e.g. \`useState\`).
5. MODERN STANDARDS & ANTI-OBSOLESCENCE RULE:
   - Base all technical content strictly on the MOST RECENT OFFICIAL DOCUMENTATION and current versions.
   - Using deprecated APIs, legacy practices, or discontinued syntaxes is strictly prohibited.
6. EXPECTED ANSWER & EXPLANATION QUALITY:
   - expectedAnswer: Must be formulated DIRECTLY as the model answer (e.g., "Node.js is a runtime..."). NEVER start with meta-phrasing like "The student should explain that...", "O aluno deve responder...", etc.
   - explanation: MUST BE COMPREHENSIVE AND DIDACTIC (2 to 5 sentences or points), explaining why the answer is correct, teaching the concept, and providing code/examples where helpful. NEVER use shallow meta-text like "This question assesses knowledge about X".
7. STRICT NON-REPETITION & KNOWLEDGE DIVERSIFICATION:
   - Carefully review ALL currently registered questions listed above before generating or proposing new questions.
   - It is STRICTLY FORBIDDEN to duplicate, rephrase, or overlap with questions, concepts, code snippets, or scenarios that already exist in the battery.
   - Every new question MUST explore NEW subtopics, different angles, edge cases, advanced mechanics, or complementary principles to expand the user's coverage and learning depth.

Respond STRICTLY in raw JSON format matching this schema:
{
  "message": "Conversational response message to the student (markdown supported)",
  "suggestedActions": [
    {
      "actionType": "create",
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "tags": ["topic1", "topic2"],
      "explanation": "Didactic explanation"
    },
    {
      "actionType": "create",
      "type": "open",
      "question": "Discursive question text",
      "expectedAnswer": "Reference model answer",
      "tags": ["topic1", "topic2"],
      "explanation": "Didactic explanation"
    },
    {
      "actionType": "edit",
      "targetQuestionIndex": 2,
      "changes": {
        "question": "Improved question text",
        "options": ["New A", "New B", "New C", "New D"],
        "correctIndex": 1,
        "explanation": "New explanation"
      }
    },
    {
      "actionType": "delete",
      "targetQuestionIndex": 3,
      "reason": "Ambiguous wording with weak distractors"
    }
  ]
}
The "suggestedActions" field is OPTIONAL. Include it ONLY when concrete actions are proposed.
Do NOT use markdown code block wrappers (\`\`\`json). Return raw JSON only.`;

  const response = await promptGemini(customPrompt);
  const responseText = response.text;

  try {
    let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
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
