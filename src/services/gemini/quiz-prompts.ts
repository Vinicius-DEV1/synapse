export function buildSingleQuestionPrompt(prompt: string): string {
  return `${prompt}

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
}

export function buildOpenQuestionEvaluationPrompt(
  question: string,
  expectedAnswer: string,
  userTypedAnswer: string
): string {
  return `You are an expert pedagogical professor evaluating a student's open-ended discursive response to a study question.

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
}

export function buildBlockQuestionPrompt(
  topicOrPrompt: string,
  questionType: 'multiple_choice' | 'open',
  contextText?: string
): string {
  let customPrompt = `Create a high-quality study question in ${
    questionType === 'multiple_choice'
      ? 'Multiple Choice format (with 4 options)'
      : 'Open-ended format (with an exemplary model answer)'
  }.\n`;
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
  return customPrompt;
}

export function buildBatchQuestionsPrompt(
  topicOrPrompt: string,
  count: number = 3,
  contextText?: string
): string {
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
  return customPrompt;
}

export function buildQuizAssistantPrompt(
  chatHistory: Array<{ role: 'user' | 'assistant'; text: string }>,
  currentQuestions: any[],
  userMessage: string,
  contextText?: string,
  blockTitle?: string,
  blockDescription?: string,
  referencedBatteries?: Array<{
    title: string;
    pageTitle?: string;
    questionCount?: number;
    questions: any[];
  }>
): string {
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
      customPrompt += `Question ${i + 1} [Index ${i + 1}] (${
        q.type === 'open' ? 'Open-ended' : 'Multiple Choice'
      }): "${q.question}"\n`;
      if (q.type === 'multiple_choice' && q.options) {
        customPrompt += `  Options: ${q.options.join(' | ')} (Correct: ${
          q.options[q.correctIndex] || ''
        })\n`;
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

  if (referencedBatteries && referencedBatteries.length > 0) {
    customPrompt += `REFERENCED EXERCISE BATTERIES (CROSS-CHECK & MANDATORY NON-REPETITION CONTEXT):\n`;
    customPrompt += `The user has explicitly referenced the following external exercise batteries from their notebook to provide related subject context:\n`;
    referencedBatteries.forEach((rb, bIdx) => {
      customPrompt += `\n--- Referenced Battery ${bIdx + 1}: "${rb.title}" (from page: "${
        rb.pageTitle || 'Notebook'
      }") ---\n`;
      if (rb.questions && rb.questions.length > 0) {
        rb.questions.forEach((q: any, qIdx: number) => {
          customPrompt += `  - Ref Q${qIdx + 1} (${
            q.type === 'open' ? 'Open-ended' : 'Multiple Choice'
          }): "${q.question}"\n`;
          if (q.type === 'multiple_choice' && q.options) {
            customPrompt += `    Options: ${q.options.join(' | ')} (Correct: ${
              q.options[q.correctIndex] || ''
            })\n`;
          } else if (q.expectedAnswer) {
            customPrompt += `    Model Answer: "${q.expectedAnswer}"\n`;
          }
        });
      } else {
        customPrompt += `  (No questions registered in this referenced battery)\n`;
      }
    });
    customPrompt += `\n`;
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
   - Carefully review ALL currently registered questions AND all questions in the REFERENCED EXERCISE BATTERIES above before generating or proposing new questions.
   - It is STRICTLY FORBIDDEN to duplicate, rephrase, or overlap with questions, concepts, code snippets, or scenarios that already exist in either the current battery or any referenced battery.
   - The user's goal with @ references is to create NEW exercises on the same subject/domain WITHOUT seeing repeated questions.
   - Every new question MUST explore NEW subtopics, complementary angles, deeper edge cases, advanced mechanics, or alternate principles to expand the user's coverage and learning depth.

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
  return customPrompt;
}

/**
 * Builds prompt to extract and adapt study questions from raw Markdown or PDF document content.
 */
export function buildDocumentToQuizPrompt(
  documentContent: string,
  fileType: 'markdown' | 'pdf',
  gabaritoContext?: string
): string {
  const gabaritoSection =
    gabaritoContext && gabaritoContext.trim()
      ? `\n\nANSWER KEY / GABARITO FOUND AT END OF DOCUMENT:\n"""\n${gabaritoContext.trim().slice(0, 25000)}\n"""\n`
      : '';

  return `You are an expert pedagogical AI Assistant. Your task is to extract, clean, structure, and convert all exercise questions and study prompts from the following ${fileType.toUpperCase()} document into a strictly formatted JSON question battery.

DOCUMENT CONTENT:
"""
${documentContent.slice(0, 50000)}
"""${gabaritoSection}

EXTRACTION & ADAPTATION RULES:
1. Identify all questions in the document (multiple-choice or open/discursive).
2. For multiple-choice questions:
   - Extract the question statement clearly without prefixes like "1.", "Questão 1:".
   - Extract all options (typically 4 or 5 options). Strip leading "A)", "B.", etc., from option texts.
   - Determine the 0-based index ('correctIndex') of the correct option. If the answer key/gabarito is provided in the document, use it. If not explicitly stated, deduce the most accurate answer.
3. For open/discursive questions:
   - Set "type" to "open".
   - Provide a comprehensive, high-quality model answer in "expectedAnswer" (gabarito).
4. For all questions:
   - Provide a didactic "explanation" justifying the correct answer or teaching the concept.
   - Provide 1 to 3 relevant subject/topic strings in "tags".
5. LANGUAGE RULE: Preserve the original language of the document (Portuguese, English, Spanish, etc.).
6. Respond STRICTLY in raw JSON format with an ARRAY of objects following this schema:
[
  {
    "type": "multiple_choice",
    "question": "Question statement",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "tags": ["Topic1", "Topic2"],
    "explanation": "Didactic explanation of why this answer is correct."
  },
  {
    "type": "open",
    "question": "Discursive question statement",
    "expectedAnswer": "Comprehensive model answer with essential concepts.",
    "tags": ["Topic1"],
    "explanation": "Pedagogical explanation of key points."
  }
]
Do NOT include markdown formatting (\`\`\`json). Return raw JSON array only.`;
}

/**
 * Builds prompt to refine, filter, dedup, or adjust an imported list of questions based on user instructions.
 */
export function buildRefineImportedQuestionsPrompt(
  currentQuestions: unknown[],
  instruction: string
): string {
  return `You are an expert pedagogical AI Assistant. The user wants to refine, adjust, or remove questions from their current imported study battery.

CURRENT QUESTIONS (JSON):
"""
${JSON.stringify(currentQuestions, null, 2)}
"""

USER INSTRUCTION:
"""
${instruction}
"""

TASK:
1. Apply the user's requested modifications (e.g. remove duplicated questions, delete specific questions, convert formats, improve clarity, or adjust options/gabarito).
2. Ensure the resulting questions array maintains high academic quality and strict formatting.
3. Respond STRICTLY in raw JSON format with the updated ARRAY of questions conforming to:
[
  {
    "type": "multiple_choice" | "open",
    "question": "Question statement",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "expectedAnswer": "Model answer for open questions",
    "tags": ["Topic1", "Topic2"],
    "explanation": "Didactic explanation"
  }
]
Do NOT use markdown code wrappers (\`\`\`json). Return raw JSON array only.`;
}

/**
 * Generates the standardized Caderno Quiz JSON schema and prompt template for use in external AI chatbots.
 */
export function getCadernoQuizJsonSchemaPrompt(currentQuestions?: unknown[]): string {
  let prompt = `Atue como um Professor e Especialista em Criação de Questões Educacionais.

Gere uma bateria de questões de estudo no formato JSON estrito aceito pelo aplicativo Caderno, seguindo exatamente o esquema abaixo:

\`\`\`json
[
  {
    "type": "multiple_choice",
    "question": "Enunciado claro e objetivo da questão",
    "options": [
      "Alternativa A",
      "Alternativa B",
      "Alternativa C",
      "Alternativa D"
    ],
    "correct_option": 0,
    "tags": ["Tópico Principal", "Subtópico"],
    "explanation": "Explicação pedagógica detalhada justificando a alternativa correta."
  },
  {
    "type": "open",
    "question": "Enunciado da questão discursiva/aberta",
    "expected_answer": "Gabarito e critérios essenciais esperados na resposta do estudante.",
    "tags": ["Tópico Principal"],
    "explanation": "Comentários pedagógicos sobre os pontos-chave da resposta."
  }
]
\`\`\`

REGRAS OBRIGATÓRIAS:
1. O campo "correct_option" para múltipla escolha deve ser o índice numérico baseado em 0 (0 para a primeira opção, 1 para a segunda, etc.) ou a letra correspondente ("A", "B", "C", "D").
2. Sempre forneça 4 alternativas para questões de múltipla escolha.
3. Retorne APENAS o JSON válido (sem textos introdutórios antes ou depois).`;

  if (currentQuestions && currentQuestions.length > 0) {
    prompt += `\n\nCONTEXTO / QUESTÕES ATUAIS DO WIDGET:\nUse as questões abaixo como referência temática para complementar, expandir ou gerar novas variações:\n\`\`\`json\n${JSON.stringify(
      currentQuestions,
      null,
      2
    )}\n\`\`\``;
  }

  return prompt;
}

