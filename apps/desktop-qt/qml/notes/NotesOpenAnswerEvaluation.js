.pragma library

function buildPrompt(question, expectedAnswer, userTypedAnswer) {
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
Do NOT wrap with markdown code blocks (\`\`\`json). Return raw JSON only.`
}

function parseEvaluation(result, modelName) {
    if (!result || typeof result !== "object") return null
    var rawVerdict = String(result.verdict || "").toLowerCase().trim()
    var verdict = "Incorreto"
    if (rawVerdict.indexOf("incorret") >= 0 || rawVerdict.indexOf("incorrect") >= 0
            || rawVerdict.indexOf("wrong") >= 0 || rawVerdict.indexOf("errad") >= 0) {
        verdict = "Incorreto"
    } else if (rawVerdict.indexOf("parcial") >= 0 || rawVerdict.indexOf("partial") >= 0) {
        verdict = "Parcial"
    } else if (rawVerdict.indexOf("corret") >= 0 || rawVerdict.indexOf("correct") >= 0
               || rawVerdict.indexOf("right") >= 0) {
        verdict = "Correto"
    }
    var feedback = String(result.feedback || result.feedbackText || result.justification || "").trim()
    if (feedback.length === 0) return null
    return {
        verdict: verdict,
        feedback: feedback,
        model: String(modelName || "").replace(/^models\//, "")
    }
}
