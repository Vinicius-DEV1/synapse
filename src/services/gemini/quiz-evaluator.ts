import { promptGemini } from './client';
import { getSettings } from '../../utils/settings';
import { cleanJsonBlock, parseEvaluationVerdict } from './quiz-parser';
import { buildOpenQuestionEvaluationPrompt } from './quiz-prompts';

// Evaluates student open-ended / discursive question response
export async function promptGeminiForOpenQuestionEvaluation(
  question: string,
  expectedAnswer: string,
  userTypedAnswer: string
): Promise<{
  verdict: 'Correto' | 'Parcial' | 'Incorreto';
  feedback: string;
  model?: string;
}> {
  const customPrompt = buildOpenQuestionEvaluationPrompt(
    question,
    expectedAnswer,
    userTypedAnswer
  );
  const response = await promptGemini(customPrompt);
  const responseText = response.text;

  try {
    const cleanJson = cleanJsonBlock(responseText);
    const parsed = JSON.parse(cleanJson);

    const verdict = parseEvaluationVerdict(parsed.verdict);
    const settings = getSettings();
    const model = (settings.geminiModel || 'gemini').replace(/^models\//, '');

    return {
      verdict,
      feedback:
        parsed.feedback || parsed.feedbackText || parsed.justification || '',
      model,
    };
  } catch (err) {
    console.error(
      'Failed to parse Gemini JSON for open question evaluation:',
      responseText,
      err
    );
    throw new Error('A IA não retornou um JSON válido na avaliação.', { cause: err });
  }
}
